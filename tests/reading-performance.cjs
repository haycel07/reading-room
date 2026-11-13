const {chromium}=require('playwright');
const {browserExecutable,importIntoReader,scrollNear}=require('./reader-helpers.cjs');
const {commentFixture}=require('./prepared-fixture.cjs');
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const output=path.join(__dirname,'../output/reading-performance');fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],calls=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.READER_TEST_URL||'http://127.0.0.1:38751')+'/');
 const metrics=await p.evaluate(async()=>{
  const {visibleTextOffset}=await import('/reading-position.js');
  const wrap=document.createElement('div');wrap.style.cssText='position:fixed;top:0;left:0;width:700px;height:500px;overflow:auto;z-index:999;background:white';
  const root=document.createElement('div');root.style.cssText='white-space:pre-wrap;font:20px/36px serif';wrap.append(root);document.body.append(wrap);
  const reference=()=>{let out=0,stop=false,node;const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),bottom=wrap.getBoundingClientRect().bottom;while(!stop&&(node=walk.nextNode())){const r=document.createRange();r.selectNodeContents(node);const rects=r.getClientRects();if(!rects.length||rects[rects.length-1].bottom<=bottom+1){out+=node.length;continue}for(let i=0;i<node.length;i++){r.setStart(node,i);r.setEnd(node,i+1);const rect=r.getBoundingClientRect();if(rect.height&&rect.bottom>bottom+1){stop=true;break}out++}}return out};
  const cases=[{text:'窗边的雨。🌧️她借出了伞。\n\t  等一会儿。  \n'.repeat(130)},{html:'<h2>窗边的书店</h2>'+('<p>她说：<b>再读一页。</b>雨落在窗边。<i>没有人着急离开。🌧️</i></p>').repeat(45)}];
  for(const fixture of cases){root.classList.toggle('structured',!!fixture.html);if(fixture.html)root.innerHTML=fixture.html;else root.textContent=fixture.text;for(const width of [700,290]){wrap.style.width=width+'px';for(const ratio of [0,.5,.9,.2,1]){wrap.scrollTop=(wrap.scrollHeight-wrap.clientHeight)*ratio;const actual=visibleTextOffset(root,wrap.getBoundingClientRect().bottom),expected=reference();if(actual!==expected)throw Error('boundary drift '+JSON.stringify({width,ratio,actual,expected,structured:!!fixture.html}))}}}
  root.classList.remove('structured');root.textContent='她推开书店的门，雨滴落在木地板上。\n'.repeat(3000);wrap.style.width='700px';
  const original=Range.prototype.getBoundingClientRect;let reads=0;Range.prototype.getBoundingClientRect=function(){reads++;return original.call(this)};
  const results=[];try{for(const ratio of [0,.45,.9]){wrap.scrollTop=(wrap.scrollHeight-500)*ratio;reads=0;const t=performance.now(),end=visibleTextOffset(root,wrap.getBoundingClientRect().bottom);results.push({ratio,ms:performance.now()-t,rangeReads:reads,end})}}finally{Range.prototype.getBoundingClientRect=original;wrap.remove()}
  return results;
 });
 for(const m of metrics)assert(m.rangeReads<40,'long text boundary has logarithmic geometry reads');fs.writeFileSync(path.join(output,'optimized.json'),JSON.stringify(metrics,null,2));console.log('BOUNDARY_METRICS',JSON.stringify(metrics));
 let release,started;const gate=new Promise(r=>release=r),waiting=new Promise(r=>started=r);let held=false;
 await p.route('**/api/companion',async route=>{const body=route.request().postDataJSON();calls.push(body);if(!held&&body.task==='prepared-comment'){held=true;started();await gate}try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:JSON.stringify(body.task==='prepared-comment'?commentFixture(body,{text:'她给陌生人留了伞，给自己留了一页书。'}):{summary:'她在书店等雨。',memory:'她借出伞，留在书店。'})})})}catch{}});
 const text='第一章 雨天\n'+'她把伞借给陌生人，自己留在书店读书，听雨点落在窗边。\n'.repeat(2200);
 await importIntoReader(p,{name:'性能回归-虚构长书.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await p.locator('#toggleSettings').click();await p.getByRole('tab',{name:'伴读',exact:true}).click();await p.locator('#preferencesCompanionEnabled').waitFor({state:'visible'});await p.locator('#preferencesCompanionEnabled').check();await p.locator('#closeSettings').click();await waiting;assert.equal(await p.locator('#companionToggle').getAttribute('data-companion-state'),'preparing','closing settings resumes preparation without a scroll');
 await p.waitForTimeout(300);const first=calls.find(c=>c.task==='prepared-comment');assert(first.allowedEnd<=1000,'first default batch arrives within about 900 characters, not half of 5000');
 await scrollNear(p,first.allowedEnd+12);assert(await p.locator('#initiativeCard').isHidden());release();await p.locator('#initiativeCard').waitFor({state:'visible'}); // No further scroll to wake delivery.
 await scrollNear(p,0);assert(await p.locator('#initiativeCard').isHidden());
 await p.locator('#toggleSettings').click();await p.locator('#settings').waitFor({state:'visible'});await p.waitForTimeout(160);await p.locator('#closeSettings').click();
 await p.waitForTimeout(900);
 await p.evaluate(()=>{window.__libraryChanges=0;new MutationObserver(c=>window.__libraryChanges+=c.length).observe(document.getElementById('libraryGrid'),{childList:true,subtree:true});window.__conversationGets=0;const get=IDBObjectStore.prototype.get;IDBObjectStore.prototype.get=function(...args){if(this.name==='conversations'&&this.transaction.db.name==='between-pages')window.__conversationGets++;return get.apply(this,args)}});
 for(const ratio of [.35,.6,.9,.4,.7]){await p.locator('#readerWrap').evaluate((w,v)=>{w.scrollTop=(w.scrollHeight-w.clientHeight)*v;w.dispatchEvent(new Event('scroll'))},ratio);await p.waitForTimeout(120)}
 await p.waitForTimeout(1000);assert.equal(await p.evaluate(()=>window.__libraryChanges),0,'reading progress cannot rebuild a hidden library');assert.equal(await p.evaluate(()=>window.__conversationGets),0,'position checks cannot reread conversation history from IndexedDB');
 await p.locator('#proactiveEnabled').uncheck();assert.equal(errors.length,0,errors.join(';'));console.log('PASS exact boundaries forward/back/resize/emoji/structured text, logarithmic geometry, delayed popup without extra scroll, early first batch, no hidden shelf rebuild/history rereads');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
