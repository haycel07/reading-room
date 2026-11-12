// Opt-in. Original fictional material only; no API keys or user books.
const fs=require('node:fs'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
if(!process.argv.includes('--real')){console.log('Use --real for local Codex comparison.');process.exit(0)}
(async()=>{
 const {PreparedBook}=await import(pathToFileURL(__dirname+'/../dist/prepared-reading.js'));
 const cases=[
  {name:'原创小说：等雨与改口',text:'第一章 门边的椅子\n'+['阿岑进店时，老板抬眼说：“你先坐。”他把一把空椅子推到门边。','屋檐每隔一会儿落下一串水。阿岑没有拿书，只看着门外。','老板把杯子放在桌上，说：“您慢慢看。”阿岑抬头，又低头看自己的鞋。','老板没有解释改口的原因。阿岑也没问。','雨点落在门槛，杯里的水渐渐不冒热气。','雨点仍落在门槛，杯子还摆在原处。',...Array.from({length:18},(_,i)=>['阿岑翻过一页，窗外还是雨。他没有离开椅子。','老板从纸箱里取出旧书，拂去书脊上的灰，又放回书架。','两个人都没再说话，门口的风铃偶尔轻响。'][i%3]),'阿岑问店里是不是要打烊。老板说还早，只是门边进风。','这些话仍没有说明先前那次改口的原因。'].join('\n')},
  {name:'原创非虚构：有条件的保温试验',text:'第一章 杯子的保温比较\n'+['下面是一项虚构实验，所有数据只用于讨论实验设计。','研究者把100 mL水分别放入甲、乙两只杯子，初始水温均为60°C。','只有室温保持20°C、杯盖关闭且两杯放置位置相同时，这组比较才适用。','实验记录在30分钟后：甲杯水温为42°C，乙杯为39°C。','这只说明本次条件下甲杯降温较少，不能直接推出甲杯在所有环境中更保温。','若杯盖打开，或者水量变成200 mL，就需要重新测量。','两杯样本不足以区分杯体设计与个体差异，未必可以推广到同型号的全部杯子。',...Array.from({length:16},(_,i)=>['读表时先写下单位，再检查比较时长是否相同。','把条件留在结论旁边，可以避免把一次观察写成普遍规律。','重复记录没有增加新样本，也不会自动增加结论可信度。'][i%3]),'温度差是观察结果，热量损失还与水量、材料和环境有关；本例没有直接测量热量。','试验没有给出测量误差，因此不能把三摄氏度的差异当作已经证明的稳定优势。'].join('\n')}
 ];
 const report={date:'2026-11-12',scope:'original fictional chapter excerpts, same current local Codex model; legacy fixed-point protocol vs candidate protocol, not a historical server binary replay',cases:[],billedTokens:'local CLI does not expose billed token usage'};
 const save=()=>fs.writeFileSync(__dirname+'/content-selection-real-results.json',JSON.stringify(report,null,2)+'\n');
 const send=async p=>{const r=await fetch((process.env.READER_TEST_URL || 'http://127.0.0.1:38749') + '/api/companion',{method:'POST',headers:{Origin:'http://127.0.0.1:38749','Content-Type':'application/json'},body:JSON.stringify({background:true,question:'概括本区。',customPrompt:'你是栞，一个具体、自然的阅读朋友；不要催读者回应。',...p})}),data=await r.json();assert(r.ok,data.error);return{result:JSON.parse(data.reply),elapsedMs:data.elapsedMs,inputCharacters:p.text.length,model:data.model}};
 for(const fixture of cases){const row={name:fixture.name,source:fixture.text,old:[],new:[]};report.cases.push(row);save();const book=await PreparedBook.create({bookId:'real-selection-'+row.name,text:fixture.text,promptKey:'same-local-friend',get:async()=>undefined,put:async()=>{},request:async p=>{const call=await send(p);row.new.push({task:p.task,allowedEnd:p.allowedEnd,...call});save();return call.result}}),region=await book.record(0);
  for(const point of region.comments){const p={task:'prepared-comment',compact:true,text:'【本区截至评论点的原文】\n'+fixture.text.slice(region.start,point.offset),question:'读者将读到这句话，请为这个位置预写一两句自然短评：\n'+fixture.text.slice(Math.max(region.start,point.offset-90),point.offset),allowedEnd:point.offset};row.old.push({allowedEnd:point.offset,fixedExcerpt:fixture.text.slice(Math.max(region.start,point.offset-90),point.offset),...await send(p)});save()}
  await book.prepare(0,new AbortController().signal,()=>{},()=>{});row.selected=(await book.record(0)).comments.map(p=>({allowedEnd:p.offset,speak:p.state==='ready',quote:p.quote||null,start:p.quoteStart,end:p.quoteEnd,text:p.text}));assert(row.selected.every(p=>!p.speak||fixture.text.slice(p.start,p.end)===p.quote));save();console.log('PASS real local chapter: '+row.name);
 }
 report.result='PASS';save();console.log('Saved actual outputs to tests/content-selection-real-results.json');
})().catch(e=>{console.error(e);process.exitCode=1});
