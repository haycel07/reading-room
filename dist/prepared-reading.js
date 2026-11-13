import {PREPARED_BUDGET} from './companion-protocol.js';
import {POLICY} from './reading-context.js';
import {candidatesIn,annotateCandidates,validCandidate} from './companion-candidates.js';
export const REGION_VERSION=2;
export const COMMENT_VERSION=3;
export async function contentKey(value){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const heading=/^(?:第[零〇一二三四五六七八九十百千万两0-9]+[章节回卷部篇集].{0,45}|chapter\s+\d+\b.{0,45})$/i;

// Stable paragraph/chapter boundaries, never a cut through a surrogate pair.
export function splitRegions(text,boundaries=[],size=5000){
 const cuts=new Set([0,text.length]);for(const b of boundaries)if(b.start>0&&b.start<text.length)cuts.add(b.start);
 let at=0;for(const line of text.split('\n')){if(heading.test(line.trim()))cuts.add(at);at+=line.length+1}
 const chapters=[...cuts].sort((a,b)=>a-b),out=[];
 for(let c=0;c<chapters.length-1;c++)for(let start=chapters[c],limit=chapters[c+1];start<limit;){
  let end=Math.min(start+size,limit);
  if(end<limit){const newline=text.lastIndexOf('\n',end-1);if(newline>start+size*.55)end=newline+1;else if(/[\uD800-\uDBFF]/.test(text[end-1]))end--}
  out.push({index:out.length,start,end});
  start=end;
 }
 if(out.length)out[0].start=0;
 return out;
}
export function commentPoints(text,region,pace='frequent'){
 const length=region.end-region.start;if(length<80||!text.slice(region.start,region.end).trim())return [];
 const ratios=pace==='quiet'||length<800?[.68]:pace==='lively'?[.32,.72]:[.42,.80];
 const paragraphs=[];let at=region.start;
 for(const line of text.slice(region.start,region.end).split('\n')){const end=at+line.length;if(line.trim().length>=12)paragraphs.push(end);at=end+1}
 const sentences=[...text.slice(region.start,region.end).matchAll(/[。！？!?；;](?:[”’"']?)/g)].map(m=>region.start+m.index+m[0].length);
 const points=[];
 for(const [i,ratio] of ratios.entries()){const distance=i===0&&pace!=='quiet'?Math.min(length*ratio,pace==='lively'?600:900):length*ratio;const target=region.start+Math.floor(distance),floor=region.start+Math.min(length*.18,distance*.6);let candidates=paragraphs.filter(n=>n>=floor&&n<region.end-12);let offset=candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))[0];if(offset===undefined||Math.abs(offset-target)>length*.15)offset=sentences.filter(n=>n>=floor&&n<region.end-12).sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))[0]??target;
  if(/[\uD800-\uDBFF]/.test(text[offset-1]))offset--;
  if(!points.some(p=>Math.abs(p.offset-offset)<100))points.push({offset});
 }
 let start=region.start;return points.sort((a,b)=>a.offset-b.offset).map(p=>{const point={...p,windowStart:start,candidates:candidatesIn(text,start,p.offset)};start=p.offset;return point});
}

export class PreparedBook{
 static async create({bookId,text,boundaries=[],promptKey,pace='frequent',get,put,request,list,consume,legacyEntries=[],history=()=>({})}){
  const source=await contentKey(JSON.stringify([REGION_VERSION,bookId,text]));
  const style=await contentKey(JSON.stringify([promptKey,pace,COMMENT_VERSION]));
  return new PreparedBook({bookId,text,regions:splitRegions(text,boundaries),source,style,pace,get,put,request,list,consume,legacyEntries,history});
 }
 constructor(options){Object.assign(this,options);this.records=new Map();this.loaded=new Map();this.failures=new Set()}
 regionAt(position){if(!this.regions.length)return null;return this.regions.find(r=>position<r.end)||this.regions.at(-1)}
 async consumption(){
  if(this.receiptsPromise)return this.receiptsPromise;
  this.receiptsPromise=(async()=>{
   this.receiptId='consumption:'+this.bookId+':'+this.source;
   const saved=await this.get(this.receiptId);this.receipts=(saved?.source===this.source&&Array.isArray(saved.items)?saved.items:[]).filter(x=>Number.isInteger(x.start)&&Number.isInteger(x.end)&&x.start>=0&&x.end>=x.start&&x.end<=this.text.length);
   const old=this.list?await this.list():[];
   for(const row of old)if(row.bookId===this.bookId&&row.source===this.source&&row.comments)for(const p of row.comments)if(p.shown&&p.selectionVersion!==2&&Number.isInteger(p.offset)&&p.offset>=row.start&&p.offset<=row.end)await this.writeConsumption({start:p.offset,end:p.offset,status:'legacy-consumed'});
   for(const e of this.legacyEntries)if(e.initiated&&e.anchor&&e.prepared?.selectionVersion!==2&&e.prepared?.source===this.source&&Number.isInteger(e.prepared.offset)&&e.prepared.offset>=0&&e.prepared.offset<=this.text.length)await this.writeConsumption({start:e.prepared.offset,end:e.prepared.offset,status:'legacy-consumed'});
  })();return this.receiptsPromise;
 }
 async writeConsumption(item){
  item={...item,id:item.start+':'+item.end};
  if(this.receipts.some(x=>x.id===item.id&&(x.status===item.status||x.status==='shown')))return;
  if(this.consume){const row=await this.consume({id:this.receiptId,bookId:this.bookId,source:this.source,item});this.receipts=row.items;return}
  const row=await this.get(this.receiptId),items=new Map([...(row?.items||[]),...this.receipts,item].map(x=>[x.id,x]));
  this.receipts=[...items.values()];await this.put({id:this.receiptId,bookId:this.bookId,source:this.source,items:this.receipts});
 }
 consumed(point){return this.receipts.some(x=>x.start===x.end?x.start>point.windowStart&&x.start<=point.offset:x.start<point.offset&&x.end>point.windowStart)}
 async refreshConsumption(){await this.consumption();const row=await this.get(this.receiptId);if(row?.source===this.source&&Array.isArray(row.items))this.receipts=row.items}
 async record(index){
  if(this.records.has(index))return this.records.get(index);
  if(this.loaded.has(index))return this.loaded.get(index);
  const promise=(async()=>{
   const r=this.regions[index],base=[this.bookId,this.source,r.start,r.end].join(':'),id='comments:'+base+':'+this.style,memoryId='memory:'+base;
   const [comments,wholeMemory,localMemory]=await Promise.all([this.get(id),this.get(memoryId),this.get(memoryId+':local'),this.consumption()]);
   const points=commentPoints(this.text,r,this.pace);
   const rec={...r,id,memoryId,comments:points.map(p=>({...p,text:null,shown:false})),summary:null,memory:null,memoryStart:0};
   if(comments?.source===this.source&&comments.start===r.start&&comments.end===r.end)for(const p of rec.comments){const saved=comments.comments?.find(s=>s.offset===p.offset);if(saved){
    if(saved.selectionVersion===2){
     if(saved.state==='skipped'){p.state='skipped';p.text='';p.selectionVersion=2}
     else if(saved.state==='ready'&&typeof saved.text==='string'&&saved.text.trim()&&saved.text.length<=PREPARED_BUDGET.comment){const c=p.candidates.find(c=>c.id===saved.candidateId);if(c&&c.start===saved.quoteStart&&c.end===saved.quoteEnd&&c.quote===saved.quote){Object.assign(p,{state:'ready',text:saved.text,selectionVersion:2,candidateId:c.id,quote:c.quote,quoteStart:c.start,quoteEnd:c.end})}else{p.state='unlocatable';p.reason='缓存引句与原文不一致'}}
    }else if(typeof saved.text==='string'&&saved.text.trim()&&saved.text.length<=220){p.text=saved.text;p.state='ready';p.legacy=true}
    if(saved.shown){await this.writeConsumption({start:p.offset,end:p.offset,status:'legacy-consumed'})}
    const limit=saved.carryVersion===1?480:PREPARED_BUDGET.carryLimit;
    if([1,PREPARED_BUDGET.version].includes(saved.carryVersion)&&saved.carryStart===r.start&&saved.carryEnd===p.offset&&typeof saved.carry==='string'&&saved.carry.trim()&&saved.carry.length<=limit){p.carry=saved.carry;p.carryVersion=saved.carryVersion;p.carryStart=r.start;p.carryEnd=p.offset}
   }}
   for(const p of rec.comments)p.shown=this.consumed(p);
   for(const memory of [wholeMemory,localMemory]){const memoryStart=memory?.memoryStart??0;
    if(memory?.source===this.source&&memory.start===r.start&&memory.end===r.end&&Number.isInteger(memoryStart)&&memoryStart>=0&&memoryStart<=r.start&&typeof memory.summary==='string'&&memory.summary.trim()&&memory.summary.length<=(memory.outputVersion===2?PREPARED_BUDGET.summary:800)&&typeof memory.memory==='string'&&memory.memory.trim()&&memory.memory.length<=(memory.outputVersion===2?PREPARED_BUDGET.memory:3000)){rec.summary=memory.summary;rec.memory=memory.memory;rec.memoryStart=memoryStart;rec.outputVersion=memory.outputVersion;if(memoryStart===0)break}
   }
   this.records.set(index,rec);return rec;
  })();this.loaded.set(index,promise);promise.catch(()=>this.loaded.delete(index));return promise;
 }
 async save(rec,type){await this.put({id:type==='memory'?rec.memoryId+(rec.memoryStart>0?':local':''):rec.id,bookId:this.bookId,source:this.source,start:rec.start,end:rec.end,...(type==='memory'?{summary:rec.summary,memory:rec.memory,memoryStart:rec.memoryStart,outputVersion:rec.outputVersion}:{comments:rec.comments.map(({candidates,...p})=>p)})})}
 async previousContext(index,check){
  if(!index)return {text:'',start:0};
  const previous=await this.record(index-1);check();
  if(previous.memory)return {text:'【'+(previous.memoryStart===0?'前文累计概括':'近期已读区间概括｜未覆盖更早内容，勿据此补全')+'】\n'+previous.memory+'\n\n',memory:previous.memory,start:previous.memoryStart};
  // A resumed book must not wait for dozens of earlier model requests. Use a
  // bounded contiguous lookbehind until the preceding overview is available.
  let start=Math.max(0,this.regions[index].start-2000);if(/[\uDC00-\uDFFF]/.test(this.text[start]))start++;
  return {text:'【近期已读原文｜前文完整概括尚未备齐，本次不依赖更早内容】\n'+this.text.slice(start,this.regions[index].start)+'\n\n',start};
 }
 async ready(index){const rec=await this.record(index);if((!rec.memory&&!this.failures.has(rec.memoryId))||!rec.comments.every(p=>p.shown||p.state||this.failures.has(rec.id+':'+p.offset)))return false;if(!index||this.failures.has(rec.memoryId))return true;const previous=await this.record(index-1);return !previous.memory||rec.memoryStart<=previous.memoryStart}
 async previousMemory(index,signal,check,status){
  if(!index)return '';
  let ready=index-1;
  while(ready>=0){const rec=await this.record(ready);check();if(rec.memory&&rec.memoryStart===0)break;ready--}
  let memory=ready>=0?(await this.record(ready)).memory:'';
  for(let i=ready+1;i<index;i++){const rec=await this.record(i);memory=await this.summarize(rec,memory,signal,check,status)}
  return memory;
 }
 regionInput(rec,end,candidates){
  const previous=rec.comments.filter(p=>p.offset<=end&&p.carry&&[1,PREPARED_BUDGET.version].includes(p.carryVersion)&&p.carryStart===rec.start&&p.carryEnd===p.offset).at(-1);
  const start=previous?.offset??rec.start;
  return (previous?'【本区已处理前缀概括｜'+rec.start+'—'+start+'】\n'+previous.carry+'\n\n':'')+'【本次新增原文｜'+start+'—'+end+'】\n'+(candidates?annotateCandidates(this.text,start,end,candidates):this.text.slice(start,end));
 }
 async summarize(rec,previous,signal,check,status){
  const context=typeof previous==='string'?{text:previous?'【前文累计概括】\n'+previous+'\n\n':'',memory:previous,start:0}:previous;
  if(rec.memory&&rec.memoryStart<=context.start)return rec.memory;
  const key=rec.memoryId;if(this.failures.has(key))throw Error('本区概述准备失败，可点重新准备');
  status('summary',rec);check();
  if(!this.text.slice(rec.start,rec.end).trim()){rec.summary='本区没有可提取的正文。';rec.memory=context.memory||context.text.trim()||'尚无可提取的正文。';rec.memoryStart=context.start;await this.save(rec,'memory');return rec.memory}
  try{const result=await this.request({task:'region-summary',compact:true,text:context.text+this.regionInput(rec,rec.end),regionIndex:rec.index,allowedEnd:rec.end},signal);check();
   if(typeof result.summary!=='string'||!result.summary.trim()||result.summary.length>PREPARED_BUDGET.summary||typeof result.memory!=='string'||!result.memory.trim()||result.memory.length>PREPARED_BUDGET.memory)throw Error('概述返回格式有误或超过上限');
   rec.summary=result.summary.trim();rec.memory=result.memory.trim();rec.memoryStart=context.start;rec.outputVersion=2;await this.save(rec,'memory');return rec.memory;
  }catch(e){if(e.name!=='AbortError')this.failures.add(key);throw e}
 }
 async prepare(index,signal,check,status,continueWork=()=>true){
  const rec=await this.record(index),previous=await this.previousContext(index,check);check();
  const errors=[];
  for(const point of rec.comments){if(!continueWork())return;await this.refreshConsumption();check();if(this.consumed(point))point.shown=true;if(point.shown||point.state)continue;const key=rec.id+':'+point.offset;if(this.failures.has(key)){errors.push(Error('本区评论准备失败，可点重新准备'));continue}status('comment',rec);check();
   try{
    if(!point.candidates.length){point.state='skipped';point.text='';point.selectionVersion=2;point.reason='本次范围没有完整可定位的候选';await this.writeConsumption({start:point.windowStart,end:point.offset,status:'skipped',reason:point.reason});await this.save(rec,'comments');continue}
    const conversationContext={...await this.history(point.offset),prepared:rec.comments.filter(p=>p.offset<point.offset&&p.state==='ready'&&!p.shown).slice(-2).map(p=>({quote:p.quote||'',text:p.text}))};check();
    const result=await this.request({task:'prepared-comment',compact:true,selectionVersion:2,text:previous.text+this.regionInput(rec,point.offset,point.candidates),question:'在本次编号候选中选择最多一处具体观察，也可跳过。无论是否开口都更新本区前缀概括。',conversationContext,candidates:point.candidates.map(({id,start,end})=>({id,start,end})),regionIndex:index,allowedEnd:point.offset},signal);check();
    if(typeof result.speak!=='boolean'||typeof result.text!=='string'||result.text.length>PREPARED_BUDGET.comment)throw Error('选句评论格式有误或超过上限');
    if(result.speak){const c=point.candidates.find(c=>c.id===result.candidateId);if(!validCandidate(this.text,c,point.windowStart,point.offset)||!result.text.trim())throw Error('评论引用编号无效');Object.assign(point,{text:result.text.trim(),state:'ready',candidateId:c.id,quote:c.quote,quoteStart:c.start,quoteEnd:c.end})}
    else{if(result.candidateId!==null||result.text!=='')throw Error('跳过格式有误');point.text='';point.state='skipped';await this.writeConsumption({start:point.windowStart,end:point.offset,status:'skipped'})}
    point.selectionVersion=2;
    if(typeof result.carry==='string'&&result.carry.trim()&&result.carry.length<=PREPARED_BUDGET.carryLimit){point.carry=result.carry.trim();point.carryVersion=PREPARED_BUDGET.version;point.carryStart=rec.start;point.carryEnd=point.offset}await this.save(rec,'comments');status('ready',rec);
   }catch(e){if(e.name==='AbortError')throw e;this.failures.add(key);errors.push(e)}
  }
  if(!continueWork())return;
  try{await this.summarize(rec,previous,signal,check,status)}catch(e){if(e.name==='AbortError')throw e;errors.push(e)}status('ready',rec);if(errors.length)throw errors[0];
 }
 async take(position,fromIndex){
  await this.refreshConsumption();
  const r=this.regionAt(position);if(!r)return null;
  const first=Math.max(0,r.index-1,fromIndex??r.index);
  for(let i=r.index;i>=first;i--){const rec=await this.record(i),eligible=rec.comments.filter(p=>!p.shown&&!this.consumed(p)&&!p.claimed&&p.state==='ready'&&p.text&&p.offset<=position);if(!eligible.length)continue;
   const note={...eligible.at(-1),regionIndex:i,start:rec.start,end:rec.end,validThrough:r.end,consumeFrom:first};
   for(let j=first;j<=i;j++)for(const p of (await this.record(j)).comments)if(p.offset<=note.offset&&!p.shown)p.claimed=true;
   return note;
  }
  return null;
 }
 async acknowledge(note,shown){for(let i=note.consumeFrom??note.regionIndex;i<=note.regionIndex;i++){const rec=await this.record(i);for(const p of rec.comments){if(shown&&p.offset<=note.offset){await this.writeConsumption({start:p.windowStart,end:p.offset,status:p.offset===note.offset?'shown':'bypassed',quoteStart:p.quoteStart,quoteEnd:p.quoteEnd,displayOffset:note.displayOffset});p.shown=true}delete p.claimed}}}
 async contextAt(position){
  let end=Math.max(0,Math.min(position,this.text.length));if(/[\uDC00-\uDFFF]/.test(this.text[end]))end--;let completed=null;
  let cutoff=end>POLICY.threshold?end-POLICY.recent:0;if(/[\uDC00-\uDFFF]/.test(this.text[cutoff]))cutoff--;
  for(let i=this.regions.length-1;i>=0;i--){const r=this.regions[i];if(r.end>cutoff)continue;const rec=await this.record(i);if(rec.memory&&rec.memoryStart===0){completed=rec;break}}
  const rawStart=completed?.end||0;
  return {text:(completed?'【已读区域累计概括｜概括可能损失细节，不是原文引文】\n'+completed.memory+'\n\n':'')+this.text.slice(rawStart,end),originalLength:end,summarized:!!completed,rawStart,summaryCount:completed?completed.index+1:0,prepared:true};
 }
}

export class PreparedReader{
 constructor(hooks){this.hooks=hooks;this.revision=0;this.timer=null;this.target=null}
 cancel(){clearTimeout(this.timer);this.timer=null;this.revision++;this.controller?.abort();this.controller=null;this.target=null;this.recent=null;this.preparing=null;this.suppressUntil=0;this.hooks.withdraw();this.hooks.paused?.()}
 setPace(){this.cancel();this.schedule()}
 schedule(delay=80){if(this.timer!==null)return;this.timer=setTimeout(()=>{this.timer=null;this.tick()},delay)}
 async tick(){
  const snap=this.hooks.snapshot();if(!snap){this.cancel();return}
  const revision=this.revision;
  try{
   const {book,position}=await this.hooks.resolve(snap);if(revision!==this.revision||!this.hooks.valid(snap))return;
   const region=book.regionAt(position);if(!region)return;
   const until=Math.min(book.regions.length-1,region.index+(position-region.start>=(region.end-region.start)*PREPARED_BUDGET.lookahead?1:0));
   this.target={book,index:region.index,until,snap};
   if(this.controller&&this.preparing){const abandoned=region.index>this.preparing.rec.index+1||(this.recent?.book===book&&region.index<this.recent.index&&this.preparing.rec.index>region.index),oldSummary=this.preparing.stage==='summary'&&region.index>this.preparing.rec.index;if(abandoned||oldSummary){this.controller.abort();this.controller=null;this.preparing=null;if(abandoned){this.recent=null;this.hooks.withdraw()}}}
   const last=this.recent,forward=last?.book===book&&position>=last.position;
   const now=Date.now();if(last?.book===book&&now-last.time<220&&Math.abs(position-last.position)>1200)this.suppressUntil=now+280;
   const previous=forward?(region.index===last.index?last.previous:region.index===last.index+1?last.index:null):null;
   this.recent={book,index:region.index,position,previous,time:now};
   const settling=(this.suppressUntil||0)>now;if(settling){this.hooks.withdraw();this.schedule(Math.max(80,this.suppressUntil-now))}
   const note=settling?null:await book.take(position,previous??region.index);
   if(note){let shown=false;try{if(revision===this.revision&&this.hooks.valid(snap)){const latest=this.hooks.snapshot();if(latest){const now=await this.hooks.resolve(latest);if(now.book===book&&now.position>=note.offset&&now.position<=(note.validThrough??note.end))shown=await this.hooks.deliver(snap,note)}}}finally{await book.acknowledge(note,shown)}}
   if(this.controller){if(this.preparing)this.hooks.status(this.preparing.stage,this.preparing.rec,book);return}
   this.hooks.status('position',await book.record(region.index),book);
   const planned=await Promise.all(Array.from({length:until-region.index+1},(_,n)=>book.ready(region.index+n)));
   if(this.controller||revision!==this.revision||!this.hooks.valid(snap))return;
   if(planned.every(Boolean))return;
   const controller=new AbortController();this.controller=controller;
   const check=()=>{if(revision!==this.revision||controller.signal.aborted||!this.hooks.valid(snap))throw new DOMException('Preparation paused','AbortError')};
   try{
    // Start where the reader actually is; a cold resume must not reconstruct
    // the whole earlier book before preparing its first comment.
    for(let i=region.index;i<=until;i++){
     check();const target=this.target;if(target?.book!==book)break;
     if(i<target.index||i>target.until)break;
     await book.prepare(i,controller.signal,check,(stage,rec)=>{this.preparing={stage,rec};this.hooks.status(stage,rec,book);this.schedule()},()=>this.target?.book===book&&this.target.index<=i);
    }
   }finally{if(this.controller===controller){this.controller=null;this.preparing=null;if(this.target?.book===book&&(this.target.index!==region.index||this.target.until>until))this.schedule()}}
  }catch(e){if(e.name!=='AbortError'&&revision===this.revision)this.hooks.error(e)}
 }
}
