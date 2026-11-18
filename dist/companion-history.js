// Filter by the current reading boundary before taking any length limit.
export function manualHistory(entries,anchor,visible){return entries.filter(e=>!e.initiated&&visible(e,anchor)).slice(-6)}
export function preparationHistory(entries,anchor,visible,allowedEnd,position,source){
 const safe=entries.filter(e=>visible(e,anchor)&&(!e.prepared||e.prepared.source===source)&&position(e.anchor)<=allowedEnd);
 return {reader:safe.filter(e=>!e.initiated).slice(-2).map(e=>({question:(e.reference?.source===source&&e.reference.end<=allowedEnd?'【当时回复的原句】'+e.reference.quote+'\n':'')+e.question,reply:e.reply})),shown:safe.filter(e=>e.initiated).slice(-2).map(e=>({quote:e.prepared?.quote||'',text:e.reply}))};
}
// Bounded, literal recall of already-read evidence, never a search of future text.
export function recallReadText(text,rawStart,question,reference){
 if(!rawStart)return [];
 const hits=[],terms=[...String(question).matchAll(/[“「"‘']([^”」"’'\n]{2,40})[”」"’']/g)].map(m=>m[1]);
 terms.push(...String(question).match(/\d+(?:\.\d+)?\s*(?:°C|℃|mL|ml|mg|kg|%|分钟|小时|厘米|元)/g)||[]);
 if(reference?.quote&&text.slice(reference.start,reference.end)===reference.quote&&reference.start<rawStart)hits.push(reference.start);
 for(const term of terms.slice(0,3)){let at=0,found=[];while((at=text.indexOf(term,at))>=0&&at<rawStart){found.push(at);at+=term.length}hits.push(...found.slice(-2))}
 const out=[];
 for(const at of hits){
  let start=Math.max(0,at-180,text.lastIndexOf('\n',at)+1),newline=text.indexOf('\n',at),end=Math.min(text.length,at+400,newline<0?text.length:newline);
  if(/[\uDC00-\uDFFF]/.test(text[start]))start--;if(/[\uDC00-\uDFFF]/.test(text[end]))end--;
  if(out.some(e=>e.start<=at&&e.end>at))continue;
  out.push({start,end,quote:text.slice(start,end)});if(out.length===2)break;
 }
 return out;
}

// Append against the current row in one transaction. A stale tab never replaces it.
export function readConversationRecord(db,id) {
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('conversations'),q=tx.objectStore('conversations').get(id);
  tx.oncomplete=()=>resolve(q.result||{id,entries:[],revision:0});
  tx.onerror=tx.onabort=()=>reject(tx.error||new Error('对话记录读取失败'));
 });
}
function write(db,id,mutate) {
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('conversations','readwrite'),store=tx.objectStore('conversations'),q=store.get(id);let result,error;
  q.onsuccess=()=>{try{const row=q.result||{id,entries:[],revision:0};result=mutate(row);if(result.accepted)store.put(result.record)}catch(e){error=e;tx.abort()}};
  tx.oncomplete=()=>resolve(result);
  tx.onerror=tx.onabort=()=>reject(error||tx.error||new Error('对话记录保存失败'));
 });
}
export function appendConversation(db,id,entry,expectedRevision=0) {
 return write(db,id,row=>{
  const revision=row.revision||0;
  if(revision!==expectedRevision)return {accepted:false,record:row};
  const entries=entry.id&&row.entries.some(e=>e.id===entry.id)?row.entries:[...row.entries,entry];
  return {accepted:true,record:{...row,entries,revision}};
 });
}
// Clearing advances the revision so a late reply from another tab cannot revive it.
export function replaceConversation(db,id,entries) {
 return write(db,id,row=>({accepted:true,record:{...row,entries,revision:(row.revision||0)+1}}));
}
