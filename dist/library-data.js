// User-triggered local export/import. Existing records are never overwritten on restore.
export function downloadFile(name,mime,data){
 const blob=data instanceof Blob?data:new Blob([data],{type:mime});
 if(location.hostname==='appassets.androidplatform.net'){
  if(!window.OnePageFiles?.save)throw Error('此安卓版本需要更新后才能导出文件');
  if(blob.size>80*1024*1024)throw Error('安卓单个导出文件上限80MB');
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error);r.onload=()=>{window.OnePageFiles.save(name,mime,String(r.result).split(',')[1]);resolve()};r.readAsDataURL(blob)});
 }
 const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
const database=(name,store)=>new Promise((resolve,reject)=>{const q=indexedDB.open(name);q.onupgradeneeded=()=>{q.result.createObjectStore(store,{keyPath:'id'});if(store==='marks')q.transaction.objectStore(store).createIndex('bookId','bookId')};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
const records=(db,store)=>new Promise((resolve,reject)=>{const t=db.transaction(store),q=t.objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
const commit=(db,store,values,remove=false)=>new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');for(const v of values)remove?t.objectStore(store).delete(v.id):t.objectStore(store).add(v);t.oncomplete=resolve;t.onerror=t.onabort=()=>reject(t.error)});
const prefsKeys=['reading-prefs','reading-initiative-enabled','companion-custom-prompt','companion-pace','companion-persona','reader-enhancements','reading-interface-prefs','companion-display-name'];
const toBase64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)});
export async function createBackup(db){
 const books=await records(db,'books');let bytes=0;for(const b of books)bytes+=b.data.size;
 if(bytes>55*1024*1024)throw Error('当前备份支持55MB以内的书籍总量；请分设备保留源书，暂不创建超大备份');
 const annotationDb=await database('between-pages-annotations','marks');
 try{return {format:'onepage-backup',version:1,created:new Date().toISOString(),books:await Promise.all(books.map(async b=>({...b,data:{base64:await toBase64(b.data),mime:b.data.type}}))),conversations:await records(db,'conversations'),marks:await records(annotationDb,'marks'),extras:JSON.parse(localStorage.getItem('reader-library-data')||'{}'),preferences:Object.fromEntries(prefsKeys.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null))};}finally{annotationDb.close()}
}
export function validateBackup(data){
 if(!data||data.format!=='onepage-backup'||data.version!==1||!Array.isArray(data.books)||!Array.isArray(data.marks)||!Array.isArray(data.conversations)||data.books.length>5000)throw Error('不是支持的一页之间备份文件');
 const ids=new Set();let bytes=0;for(const b of data.books){if(!b||typeof b.id!=='string'||ids.has(b.id)||typeof b.name!=='string'||!['txt','pdf','ebook'].includes(b.type)||!b.data||typeof b.data.base64!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.data.base64)||!Number.isFinite(b.progress)||b.progress<0||b.progress>1)throw Error('备份书籍记录不完整');ids.add(b.id);bytes+=b.data.base64.length;if(bytes>80*1024*1024)throw Error('备份过大');}
 for(const m of data.marks)if(!m||typeof m.id!=='string'||!ids.has(m.bookId)||typeof m.quote!=='string'||!Number.isInteger(m.start)||!Number.isInteger(m.end)||m.start<0||m.end<m.start||!['txt','pdf','ebook'].includes(m.type))throw Error('备份笔记记录有误');
 for(const c of data.conversations)if(!c||!ids.has(c.id)||!Array.isArray(c.entries)||c.entries.some(e=>!e||typeof e.reply!=='string'||typeof e.question!=='string'))throw Error('备份对话记录有误');
 if(data.preferences){for(const key of prefsKeys)if(data.preferences[key]!==undefined&&typeof data.preferences[key]!=='string')throw Error('备份设置记录有误');
  if(data.preferences['reading-prefs']){let p;try{p=JSON.parse(data.preferences['reading-prefs'])}catch{throw Error('阅读设置不是有效JSON')}if(!p||!['white','cream','dark','sage','sepia'].includes(p.theme)||!Number.isFinite(Number(p.size))||Number(p.size)<14||Number(p.size)>32||!Number.isFinite(Number(p.line))||Number(p.line)<1.4||Number(p.line)>2.6)throw Error('阅读设置超出支持范围');}
 }
 return data;
}
export async function restoreBackup(db,input,restorePreferences=false){
 const data=validateBackup(input),mapping=new Map(data.books.map(b=>[b.id,crypto.randomUUID()]));
 const books=data.books.map(b=>{const raw=atob(b.data.base64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return {...b,id:mapping.get(b.id),data:new Blob([bytes],{type:b.data.mime||'application/octet-stream'})}});
 const conversations=data.conversations.map(c=>({...c,id:mapping.get(c.id)}));const marks=data.marks.map(m=>({...m,id:crypto.randomUUID(),bookId:mapping.get(m.bookId)}));
 const annotationDb=await database('between-pages-annotations','marks');let notesAdded=false,booksAdded=false;
 const priorExtras=localStorage.getItem('reader-library-data'),priorPrefs=Object.fromEntries(prefsKeys.map(k=>[k,localStorage.getItem(k)]));
 try{
  await commit(annotationDb,'marks',marks);notesAdded=true;
  await new Promise((resolve,reject)=>{const t=db.transaction(['books','conversations'],'readwrite');books.forEach(b=>t.objectStore('books').add(b));conversations.forEach(c=>t.objectStore('conversations').add(c));t.oncomplete=resolve;t.onerror=t.onabort=()=>reject(t.error)});booksAdded=true;
  const extras=JSON.parse(priorExtras||'{}');for(const [oldId,newId]of mapping){const v=data.extras?.[oldId];if(v&&typeof v==='object')extras[newId]={...v,bookmarks:Array.isArray(v.bookmarks)?v.bookmarks.map(x=>({...x,id:crypto.randomUUID()})):[]}}localStorage.setItem('reader-library-data',JSON.stringify(extras));
  if(restorePreferences)for(const key of prefsKeys){const value=data.preferences?.[key];if(typeof value==='string')localStorage.setItem(key,value)}
 }catch(e){
  if(notesAdded)await commit(annotationDb,'marks',marks,true);
  if(booksAdded){await new Promise((resolve,reject)=>{const t=db.transaction(['books','conversations'],'readwrite');books.forEach(b=>t.objectStore('books').delete(b.id));conversations.forEach(c=>t.objectStore('conversations').delete(c.id));t.oncomplete=resolve;t.onerror=t.onabort=()=>reject(t.error)})}
  if(priorExtras===null)localStorage.removeItem('reader-library-data');else localStorage.setItem('reader-library-data',priorExtras);
  for(const key of prefsKeys)if(priorPrefs[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,priorPrefs[key]);
  throw e;
 }finally{annotationDb.close()}
 return books.length;
}
export function noteExport(marks,format,name){
 if(format==='csv'){const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"';return '\ufeff'+[['书名','引用','笔记','颜色','时间'],...marks.map(m=>[name,m.quote,m.note,m.color,new Date(m.created).toISOString()])].map(row=>row.map(csv).join(',')).join('\r\n')}
 return '# '+name+'\n\n'+marks.map(m=>(format==='md'?'> ':'')+m.quote.replaceAll('\n','\n'+(format==='md'?'> ':''))+'\n\n'+(m.note||'')+'\n').join('\n---\n\n');
}
export async function shareNoteCard(mark,name){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1080,1350);ctx.fillStyle='#657d9f';ctx.font='24px sans-serif';ctx.fillText('一页之间  /  阅读摘记',86,100);ctx.fillStyle='#303e52';ctx.font='38px serif';let y=205;
 for(const [text,font,color]of [[mark.quote,'38px serif','#303e52'],[mark.note||'','28px sans-serif','#7a8799']]){ctx.font=font;ctx.fillStyle=color;let line='';for(const c of text){if(c==='\n'||ctx.measureText(line+c).width>900){ctx.fillText(line,86,y);y+=62;line=c==='\n'?'':c;if(y>1130)break}else line+=c}if(y<=1130){ctx.fillText(line,86,y);y+=100}}
 ctx.fillStyle='#e2e8f0';ctx.fillRect(86,1220,908,1);ctx.fillStyle='#8a96a6';ctx.font='22px sans-serif';let title=name;while(ctx.measureText(title).width>900)title=title.slice(0,-2);ctx.fillText(title,86,1270);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));await downloadFile('阅读摘记.png','image/png',blob);
}
