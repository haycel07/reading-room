export const REGION_VERSION=2;
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
 for(const ratio of ratios){const target=region.start+Math.floor(length*ratio);let candidates=paragraphs.filter(n=>n>=region.start+length*.18&&n<region.end-12);let offset=candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))[0];if(offset===undefined||Math.abs(offset-target)>length*.15)offset=sentences.filter(n=>n>=region.start+length*.18&&n<region.end-12).sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))[0]??target;
  if(/[\uD800-\uDBFF]/.test(text[offset-1]))offset--;
  if(!points.some(p=>Math.abs(p.offset-offset)<100))points.push({offset,quote:text.slice(Math.max(region.start,offset-90),offset).trim()});
 }
 return points.sort((a,b)=>a.offset-b.offset);
}

export class PreparedBook{
 static async create({bookId,text,boundaries=[],promptKey,pace='frequent',get,put,request}){
  const source=await contentKey(JSON.stringify([REGION_VERSION,bookId,text]));
  const style=await contentKey(JSON.stringify([promptKey,pace]));
  return new PreparedBook({bookId,text,regions:splitRegions(text,boundaries),source,style,pace,get,put,request});
 }
 constructor(options){Object.assign(this,options);this.records=new Map();this.loaded=new Map();this.failures=new Set()}
 regionAt(position){if(!this.regions.length)return null;return this.regions.find(r=>position<r.end)||this.regions.at(-1)}
 async record(index){
  if(this.records.has(index))return this.records.get(index);
  if(this.loaded.has(index))return this.loaded.get(index);
  const promise=(async()=>{
   const r=this.regions[index],base=[this.bookId,this.source,r.start,r.end].join(':'),id='comments:'+base+':'+this.style,memoryId='memory:'+base;
   const [comments,wholeMemory,localMemory]=await Promise.all([this.get(id),this.get(memoryId),this.get(memoryId+':local')]);
   const points=commentPoints(this.text,r,this.pace);
   const rec={...r,id,memoryId,comments:points.map(p=>({...p,text:null,shown:false})),summary:null,memory:null,memoryStart:0};
   if(comments?.source===this.source&&comments.start===r.start&&comments.end===r.end)for(const p of rec.comments){const saved=comments.comments?.find(s=>s.offset===p.offset);if(saved){p.shown=!!saved.shown;if(typeof saved.text==='string'&&saved.text.trim()&&saved.text.length<=220)p.text=saved.text}}
   for(const memory of [wholeMemory,localMemory]){const memoryStart=memory?.memoryStart??0;
    if(memory?.source===this.source&&memory.start===r.start&&memory.end===r.end&&Number.isInteger(memoryStart)&&memoryStart>=0&&memoryStart<=r.start&&typeof memory.summary==='string'&&memory.summary.trim()&&memory.summary.length<=800&&typeof memory.memory==='string'&&memory.memory.trim()&&memory.memory.length<=3000){rec.summary=memory.summary;rec.memory=memory.memory;rec.memoryStart=memoryStart;if(memoryStart===0)break}
   }
   this.records.set(index,rec);return rec;
  })();this.loaded.set(index,promise);promise.catch(()=>this.loaded.delete(index));return promise;
 }
 async save(rec,type){await this.put({id:type==='memory'?rec.memoryId+(rec.memoryStart>0?':local':''):rec.id,bookId:this.bookId,source:this.source,start:rec.start,end:rec.end,...(type==='memory'?{summary:rec.summary,memory:rec.memory,memoryStart:rec.memoryStart}:{comments:rec.comments})})}
 async previousContext(index,check){
  if(!index)return {text:'',start:0};
  const previous=await this.record(index-1);check();
  if(previous.memory)return {text:'【'+(previous.memoryStart===0?'前文累计概括':'近期已读区间概括｜未覆盖更早内容，勿据此补全')+'】\n'+previous.memory+'\n\n',memory:previous.memory,start:previous.memoryStart};
  // A resumed book must not wait for dozens of earlier model requests. Use a
  // bounded contiguous lookbehind until the preceding overview is available.
  let start=Math.max(0,this.regions[index].start-2000);if(/[\uDC00-\uDFFF]/.test(this.text[start]))start++;
  return {text:'【近期已读原文｜前文完整概括尚未备齐，本次不依赖更早内容】\n'+this.text.slice(start,this.regions[index].start)+'\n\n',start};
 }
 async ready(index){const rec=await this.record(index);if(!rec.memory||!rec.comments.every(p=>p.shown||p.text!==null))return false;if(!index)return true;const previous=await this.record(index-1);return !previous.memory||rec.memoryStart<=previous.memoryStart}
 async previousMemory(index,signal,check,status){
  if(!index)return '';
  let ready=index-1;
  while(ready>=0){const rec=await this.record(ready);check();if(rec.memory&&rec.memoryStart===0)break;ready--}
  let memory=ready>=0?(await this.record(ready)).memory:'';
  for(let i=ready+1;i<index;i++){const rec=await this.record(i);memory=await this.summarize(rec,memory,signal,check,status)}
  return memory;
 }
 async summarize(rec,previous,signal,check,status){
  const context=typeof previous==='string'?{text:previous?'【前文累计概括】\n'+previous+'\n\n':'',memory:previous,start:0}:previous;
  if(rec.memory&&rec.memoryStart<=context.start)return rec.memory;
  const key=rec.memoryId;if(this.failures.has(key))throw Error('本区概述准备失败，可点重新准备');
  status('summary',rec);check();
  if(!this.text.slice(rec.start,rec.end).trim()){rec.summary='本区没有可提取的正文。';rec.memory=context.memory||context.text.trim()||'尚无可提取的正文。';rec.memoryStart=context.start;await this.save(rec,'memory');return rec.memory}
  try{const result=await this.request({task:'region-summary',text:context.text+'【本区原文】\n'+this.text.slice(rec.start,rec.end),regionIndex:rec.index,allowedEnd:rec.end},signal);check();
   if(typeof result.summary!=='string'||!result.summary.trim()||result.summary.length>800||typeof result.memory!=='string'||!result.memory.trim()||result.memory.length>3000)throw Error('概述返回格式有误');
   rec.summary=result.summary.trim();rec.memory=result.memory.trim();rec.memoryStart=context.start;await this.save(rec,'memory');return rec.memory;
  }catch(e){if(e.name!=='AbortError')this.failures.add(key);throw e}
 }
 async prepare(index,signal,check,status){
  const rec=await this.record(index),previous=await this.previousContext(index,check);check();
  for(const point of rec.comments){if(point.shown||point.text!==null)continue;const key=rec.id+':'+point.offset;if(this.failures.has(key))throw Error('本区评论准备失败，可点重新准备');status('comment',rec);check();
   try{const result=await this.request({task:'prepared-comment',text:previous.text+'【本区截至评论点的原文】\n'+this.text.slice(rec.start,point.offset),question:'读者将读到这句话，请为这个位置预写一两句自然短评：\n'+point.quote,regionIndex:index,allowedEnd:point.offset},signal);check();
    if(typeof result.text!=='string'||!result.text.trim()||result.text.length>220)throw Error('评论返回格式有误');point.text=result.text.trim();await this.save(rec,'comments');status('ready',rec);
   }catch(e){if(e.name!=='AbortError')this.failures.add(key);throw e}
  }
  await this.summarize(rec,previous,signal,check,status);status('ready',rec);
 }
 async take(position,fromIndex){
  const r=this.regionAt(position);if(!r)return null;
  const first=Math.max(0,r.index-1,fromIndex??r.index);
  for(let i=r.index;i>=first;i--){const rec=await this.record(i),eligible=rec.comments.filter(p=>!p.shown&&!p.claimed&&p.text!==null&&p.offset<=position);if(!eligible.length)continue;
   const note={...eligible.at(-1),regionIndex:i,start:rec.start,end:rec.end,validThrough:r.end,consumeFrom:first};
   for(let j=first;j<=i;j++)for(const p of (await this.record(j)).comments)if(p.offset<=note.offset&&!p.shown)p.claimed=true;
   return note;
  }
  return null;
 }
 async acknowledge(note,shown){for(let i=note.consumeFrom??note.regionIndex;i<=note.regionIndex;i++){const rec=await this.record(i);for(const p of rec.comments){if(shown&&p.offset<=note.offset)p.shown=true;delete p.claimed}if(shown)await this.save(rec,'comments')}}
 async contextAt(position){
  const end=Math.max(0,Math.min(position,this.text.length));let completed=null;
  for(let i=this.regions.length-1;i>=0;i--){const r=this.regions[i];if(r.end>end)continue;const rec=await this.record(i);if(rec.memory&&rec.memoryStart===0){completed=rec;break}}
  const rawStart=completed?.end||0;
  return {text:(completed?'【已读区域累计概括｜概括可能损失细节，不是原文引文】\n'+completed.memory+'\n\n':'')+this.text.slice(rawStart,end),originalLength:end,summarized:!!completed,rawStart,summaryCount:completed?completed.index+1:0,prepared:true};
 }
}

export class PreparedReader{
 constructor(hooks){this.hooks=hooks;this.revision=0;this.timer=null;this.target=null}
 cancel(){clearTimeout(this.timer);this.timer=null;this.revision++;this.controller?.abort();this.controller=null;this.target=null;this.recent=null;this.preparing=null;this.hooks.withdraw()}
 setPace(){this.cancel();this.schedule()}
 schedule(){if(this.timer!==null)return;this.timer=setTimeout(()=>{this.timer=null;this.tick()},80)}
 async tick(){
  const snap=this.hooks.snapshot();if(!snap){this.cancel();return}
  const revision=this.revision;
  try{
   const {book,position}=await this.hooks.resolve(snap);if(revision!==this.revision||!this.hooks.valid(snap))return;
   const region=book.regionAt(position);if(!region)return;
   this.target={book,index:region.index,snap};
   const last=this.recent,forward=last?.book===book&&position>=last.position;
   const previous=forward?(region.index===last.index?last.previous:region.index===last.index+1?last.index:null):null;
   this.recent={book,index:region.index,position,previous};
   const note=await book.take(position,previous??region.index);
   if(note){let shown=false;try{if(revision===this.revision&&this.hooks.valid(snap)){const latest=this.hooks.snapshot();if(latest){const now=await this.hooks.resolve(latest);if(now.book===book&&now.position>=note.offset&&now.position<=(note.validThrough??note.end))shown=await this.hooks.deliver(snap,note)}}}finally{await book.acknowledge(note,shown)}}
   if(this.controller){if(this.preparing)this.hooks.status(this.preparing.stage,this.preparing.rec,book);return}
   this.hooks.status('position',await book.record(region.index),book);
   const planned=await Promise.all([region.index,Math.min(region.index+1,book.regions.length-1)].map(i=>book.ready(i)));
   if(this.controller||revision!==this.revision||!this.hooks.valid(snap))return;
   if(planned.every(Boolean))return;
   const controller=new AbortController();this.controller=controller;
   const check=()=>{if(revision!==this.revision||controller.signal.aborted||!this.hooks.valid(snap))throw new DOMException('Preparation paused','AbortError')};
   try{
    // Start where the reader actually is; a cold resume must not reconstruct
    // the whole earlier book before preparing its first comment.
    for(let i=region.index;i<=Math.min(region.index+1,book.regions.length-1);i++){
     check();const target=this.target;if(target?.book!==book)break;
     if(i<target.index||i>target.index+1)break;
     await book.prepare(i,controller.signal,check,(stage,rec)=>{this.preparing={stage,rec};this.hooks.status(stage,rec,book);this.schedule()});
    }
   }finally{if(this.controller===controller){this.controller=null;this.preparing=null;if(this.target?.book===book&&this.target.index!==region.index)this.schedule()}}
  }catch(e){if(e.name!=='AbortError'&&revision===this.revision)this.hooks.error(e)}
 }
}
