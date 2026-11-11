const {ready,scrollNear}=require('./reader-helpers.cjs');
const {chromium}=require('C:/Users/13/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
 const page=await browser.newPage({viewport:{width:1400,height:900}}),requests=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let fail=false,hold=null;
 await page.route('**/api/companion',async route=>{
   const body=route.request().postDataJSON();requests.push(body);
   if(body.task==='summary'&&hold){await hold;}
   if(body.task==='summary'&&fail)return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'测试概括失败'})});
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:body.task==='summary'?'概括：'+body.text.slice(0,80):'测试伴读回复'})});
 });
 await page.goto('http://127.0.0.1:38749/');
 const text=Array.from({length:14},(_,i)=>`第${i+1}章 测试${i+1}\n`+(`本章事件${i+1}。小舟经过第${i+1}座桥。\n`.repeat(300))).join('')+'未读秘密结尾';
 async function importBook(name,content){await page.locator('#file').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(content)});await ready(page);}
 async function mark(n){await scrollNear(page,n)}
 async function chat(){await page.locator('#chatSend').click();await page.waitForFunction(()=>!document.querySelector('#chatSend').disabled,null,{timeout:30000});}
 await importBook('虚构长书.txt',text);const bookLength=text.length,anchor=bookLength-1000;await mark(anchor);await page.locator('#companionToggle').click();await chat();
 let summaries=requests.filter(r=>r.task==='summary'),chats=requests.filter(r=>!r.task);
 assert(summaries.length>0);assert.equal(chats.length,1);assert(!JSON.stringify(requests).includes('未读秘密结尾'));assert(chats[0].text.includes('以下为连续原文'));assert(!chats[0].text.includes('中间较早内容因长度限制省略'));
 // Every byte of the older prefix was given to the summarizer once, in order;
 // the rest is exactly the continuous source suffix, ending at the read marker.
 const prefix=summaries.map(r=>r.text).join('');assert.equal(prefix,text.slice(0,prefix.length));const originalTail=chats[0].text.split(/【以下为连续原文[^】]*】\n/)[1];assert(text.slice(prefix.length).startsWith(originalTail));assert(originalTail.length>=24000);
 const count=summaries.length;await chat();assert.equal(requests.filter(r=>r.task==='summary').length,count);
 await page.locator('#previewScope').click();await page.waitForFunction(()=>!document.querySelector('#chatSend').disabled);assert.equal(await page.locator('#scopeText').textContent().then(s=>s.split('\n\n——')[0]),chats[0].text);await page.locator('#scopeClose').click();
 await page.reload();await page.locator('.bookitem').click();await ready(page);await page.locator('#companionToggle').click();await chat();assert.equal(requests.filter(r=>r.task==='summary').length,count);
 await mark(100);await chat();let back=requests.at(-1);assert(text.startsWith(back.text));assert(back.text.length<1000);assert.equal(back.history.length,0);
 // Roll back inside a previously summarized interval: its later portion cannot
 // be reused, and the allowed suffix is still exact original text.
 const earlier=45000;await mark(earlier);const before=requests.length;await chat();assert(!JSON.stringify(requests.slice(before)).includes('未读秘密结尾'));const tail=requests.at(-1).text.split(/【以下为连续原文[^】]*】\n/)[1];assert(tail&&text.includes(tail));
 await mark(bookLength);await chat();assert(requests.at(-1).text.endsWith(text.slice(-24000)));assert(requests.at(-1).text.includes('未读秘密结尾'));
 await importBook('另一本虚构长书.txt',text);await mark(anchor);await page.locator('#companionToggle').click();const oldCount=requests.filter(r=>r.task==='summary').length;await chat();assert(requests.filter(r=>r.task==='summary').length>oldCount);
 await importBook('失败测试.txt',text);await mark(anchor);await page.locator('#companionToggle').click();fail=true;const oldChats=requests.filter(r=>!r.task).length;await chat();assert.equal(requests.filter(r=>!r.task).length,oldChats);assert((await page.locator('#chatLog').innerText()).includes('测试概括失败'));fail=false;
 // During a slow summary, going backwards must cancel the outgoing chat.
 let release;hold=new Promise(r=>release=r);const oldRequests=requests.length;await page.locator('#chatSend').click();await page.waitForFunction(()=>document.querySelector('#chatSend').disabled);await page.waitForTimeout(150);await mark(50);release();hold=null;await page.waitForFunction(()=>!document.querySelector('#chatSend').disabled);assert.equal(requests.slice(oldRequests).filter(r=>!r.task).length,0);
 // Pure composition also covers huge inputs, grouped overview and failure.
 const result=await page.evaluate(async()=>{
   const {composeContext,planContext}=await import('/reading-context.js');const cache=new Map();const source='一段内容。\n'.repeat(40000);const calls=[];
   const result=await composeContext({text:source,bookId:'unit',get:k=>cache.get(k),put:v=>cache.set(v.id,v),summarize:async(s,kind)=>{calls.push({s,kind});return '概'.repeat(1500)}});
   const plan=planContext(source);return {result,sourceLength:source.length,covered:plan.segments.reduce((n,s)=>n+s.end-s.start,0),overview:calls.some(c=>c.kind==='overview')};
 });assert.equal(result.covered,result.result.rawStart);assert(result.overview);assert(result.result.text.length<81000);
 const cacheInfo=await page.evaluate(async()=>{const open=name=>new Promise((resolve,reject)=>{const q=indexedDB.open(name);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});const db=await open('between-pages'),books=await new Promise(resolve=>{const q=db.transaction('books').objectStore('books').getAll();q.onsuccess=()=>resolve(q.result)});db.close();return books.find(b=>b.name==='虚构长书.txt').id});
 await page.locator('.bookitem').filter({has:page.getByText('虚构长书.txt',{exact:true})}).click();page.once('dialog',d=>d.accept());await page.locator('#remove').click();await page.waitForFunction(()=>document.querySelector('#reading').classList.contains('hidden'));const cacheLeft=await page.evaluate(()=>new Promise(resolve=>{const q=indexedDB.open('between-pages-summaries');q.onsuccess=()=>{const db=q.result,r=db.transaction('summaries').objectStore('summaries').getAll();r.onsuccess=()=>{db.close();resolve(r.result)}}}));assert(!cacheLeft.some(c=>c.bookId===cacheInfo));assert(cacheLeft.length>0);
 assert.equal(errors.length,0,errors.join(';'));console.log('PASS 长文连续覆盖、已读边界、回退、缓存与刷新、切书隔离、失败阻止、生成中回退、超长分组');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
