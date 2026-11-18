// Actual IndexedDB transactions and two tabs; provider responses are fictional.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {browserExecutable,importIntoReader}=require('./reader-helpers.cjs');
const base=process.env.READER_TEST_URL||'http://127.0.0.1:38751';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{
 const c=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),calls=[];let hold=false,release;
 await c.route('**/api/companion',async r=>{calls.push(r.request().postDataJSON());if(hold)await new Promise(resolve=>release=resolve);try{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:'只讨论眼前书店门口的蓝伞。'})})}catch{}});
 const a=await c.newPage();await a.goto(base);await importIntoReader(a,{name:'双窗口-虚构.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 蓝伞\n'+'书店门口的蓝伞还滴着雨。\n'.repeat(70))});
 const b=await c.newPage();await b.goto(base);await b.locator('.library-book').click();
 for(const [p,q]of [[a,'第一个窗口的问题'],[b,'第二个窗口的问题']]){await p.bringToFront();await p.locator('#companionToggle').click();await p.locator('#chatInput').fill(q);await p.locator('#chatSend').click();await p.waitForFunction(()=>!document.querySelector('#chatSend').disabled)}
 assert(calls.at(-1).history.some(e=>e.question==='第一个窗口的问题'),'the next manual request sees the other tab’s committed eligible history');
 await a.bringToFront();await a.reload();await a.locator('.library-book').click();await a.locator('#companionToggle').click();let log=await a.locator('#chatLog').innerText();assert(log.includes('第一个窗口的问题')&&log.includes('第二个窗口的问题'),'neither committed reply may be overwritten');
 await b.bringToFront();hold=true;await b.locator('#chatInput').fill('清空之前还在等待的问题');await b.locator('#chatSend').click();for(let i=0;!release&&i<1500;i++)await new Promise(r=>setTimeout(r,10));assert(release);
 await a.bringToFront();a.once('dialog',d=>d.accept());await a.locator('#clearChat').click();await b.waitForFunction(()=>!document.querySelector('#chatSend').disabled);release();await b.waitForTimeout(100);assert(!(await b.locator('#chatLog').innerText()).includes('清空之前'),'another tab’s clear cancels transient requests');assert.equal(await b.locator('#chatInput').inputValue(),'','a cleared pending question cannot be restored as a draft');
 await a.reload();await a.locator('.library-book').click();await a.locator('#companionToggle').click();assert(!(await a.locator('#chatLog').innerText()).includes('只讨论眼前'),'late response cannot revive cleared history');
 const result=await a.evaluate(async()=>{const m=await import('./companion-history.js'),db=await new Promise((resolve,reject)=>{const q=indexedDB.open('between-pages',3);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)}),id='transaction-only-fiction';try{
  await Promise.all([m.appendConversation(db,id,{id:'a',question:'甲',reply:'甲'},0),m.appendConversation(db,id,{id:'b',question:'乙',reply:'乙'},0)]);
  await m.appendConversation(db,id,{id:'a',question:'甲',reply:'甲'},0);const before=await m.readConversationRecord(db,id),cleared=await m.replaceConversation(db,id,[]),stale=await m.appendConversation(db,id,{id:'late',question:'旧',reply:'旧'},0),fresh=await m.appendConversation(db,id,{id:'new',question:'新',reply:'新'},cleared.record.revision);return {before:before.entries.length,stale:stale.accepted,after:fresh.record.entries.map(e=>e.id)};
 }finally{db.close()}});assert.deepEqual(result,{before:2,stale:false,after:['new']});
 await c.close();console.log('PASS same-origin tabs retain both replies and eligible history; clearing cancels a remote pending reply; atomic append, duplicate ID and stale revision protection');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
