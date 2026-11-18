const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {browserExecutable,importIntoReader,scrollNear,ready}=require('./reader-helpers.cjs');
const {commentFixture}=require('./prepared-fixture.cjs');
const base=process.env.READER_TEST_URL||'http://127.0.0.1:38753';
const mobile={viewport:{width:390,height:844},reducedMotion:'reduce'};
const response=(route,reply)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply})});
const prepared=q=>JSON.stringify(q.task==='prepared-comment'?commentFixture(q,{text:'虚构短评在这个位置出现。',carry:'蓝伞留在店门口。'}):{summary:'蓝伞在店门口。',memory:'书店门边留着蓝伞。'});
function book(name,text){return {name,mimeType:'text/plain',buffer:Buffer.from(text)}}
async function whileCovered(browser){
 const ctx=await browser.newContext(mobile),p=await ctx.newPage();try{let first,release,completed=false;
 await p.route('**/api/companion',async r=>{const q=r.request().postDataJSON();if(q.task==='prepared-comment'&&!first){first=q;await new Promise(resolve=>release=resolve)}try{await response(r,prepared(q));if(q===first)completed=true}catch{}});
 await p.goto(base);await importIntoReader(p,book('全屏聊天迟到短评-完全虚构.txt','第一章 蓝伞\n'+'店主把蓝伞留在门口，没有催等雨的人离开。\n'.repeat(300)));await p.locator('#proactiveEnabled').check();for(let i=0;!release&&i<480;i++)await p.waitForTimeout(10);assert(release);
 await scrollNear(p,first.allowedEnd+15);await p.locator('#companionToggle').click();await p.waitForFunction(()=>document.body.classList.contains('companion-screen'));release();for(let i=0;!completed&&i<480;i++)await p.waitForTimeout(10);assert(completed);await p.waitForTimeout(500);
 assert(!(await p.locator('#chatLog').innerText()).includes('虚构短评'));assert(await p.locator('#initiativeCard').evaluate(e=>e.classList.contains('hidden')),'preparation may finish without displaying a note under the compact conversation');
 await p.locator('#companionClose').click();await p.locator('#initiativeCard').waitFor({state:'visible'});await p.locator('#initiativeDismiss').click();assert(await p.locator('#initiativeCard').isHidden());console.log('PASS delayed commentary stays queued behind full-screen chat and shows in reading on return');
 }finally{await ctx.close()}
}
async function pdfSourcePage(browser){
 const ctx=await browser.newContext(mobile),p=await ctx.newPage(),calls=[];try{await p.route('**/api/companion',r=>{const q=r.request().postDataJSON();calls.push(q);return response(r,prepared(q))});
 await p.goto(base);await importIntoReader(p,path.join(__dirname,'fixture-regions.pdf'));await p.locator('#proactiveEnabled').check();
 for(let i=0;i<16&&await p.locator('#initiativeCard').isHidden();i++){await p.locator('#readerWrap').evaluate((e,i)=>{e.scrollTop=(i+1)*70;e.dispatchEvent(new Event('scroll'))},i);await p.waitForTimeout(125)}
 try{await p.locator('#initiativeCard').waitFor({state:'visible',timeout:5000})}catch(error){console.error(await p.locator('#proactiveStatus').textContent(),await p.locator('#readerWrap').evaluate(e=>[e.scrollTop,e.scrollHeight,e.clientHeight]),calls.map(q=>[q.task,q.regionIndex,q.allowedEnd]));throw error}assert.equal(calls.find(q=>q.task==='prepared-comment')?.regionIndex,0,'a fully visible PDF page must be prepared before looking ahead');await p.locator('#initiativeReply').click();await p.waitForFunction(()=>document.body.classList.contains('companion-screen'));
 await p.locator('.comment-quote').first().click();await p.locator('#companion').waitFor({state:'hidden',timeout:6000});await ready(p);assert.equal(await p.locator('#page').inputValue(),'1');assert(!await p.locator('#reading').evaluate(e=>e.inert));assert(await p.locator('#backToLibrary').isVisible());console.log('PASS PDF comment source button closes chat and reveals the referenced page');
 }finally{await ctx.close()}
}
async function previewMatchesRequest(browser){
 const ctx=await browser.newContext(mobile),p=await ctx.newPage(),calls=[];try{await p.route('**/api/companion',r=>{const q=r.request().postDataJSON();calls.push(q);return response(r,q.task==='summary'?'本区概述：虚构来客在书店标记杯子安排，之后继续阅读。':'只对已经提供的虚构内容作答。')});
 const raw='第一章 冷杉\n书桌还留着“冷杉印章”，来客没有提出要求。\n'+Array.from({length:1900},(_,i)=>'第'+i+'行，店主在窗边整理借书的卡片，门口无人停留。\n').join('')+'直到故事末尾才出现的未读暗号：纯蓝新月。';await p.goto(base);await importIntoReader(p,book('预览与发送一致-完全虚构.txt',raw));await p.locator('#companionToggle').click();await p.locator('#chatInput').fill('较早的问题：现在有哪些物件？');await p.locator('#chatSend').click();await p.waitForFunction(()=>!document.querySelector('#chatSend').disabled);await p.locator('#companionClose').click();
 await scrollNear(p,35000);await p.locator('#companionToggle').click();const question='请只复核“冷杉印章”的已读原文。';await p.locator('#chatInput').fill(question);await p.locator('#previewScope').click();await p.waitForFunction(()=>document.getElementById('scopeText').textContent.length>10000);const preview=await p.locator('#scopeText').textContent();await p.locator('#scopeClose').click();await p.locator('#chatSend').click();await p.waitForFunction(()=>!document.querySelector('#chatSend').disabled);
 const q=calls.filter(r=>!r.task).at(-1);assert(q&&q.summarized&&q.question===question);const expected=q.text+(q.history.length?'\n\n—— 将附带的近期对话 ——\n'+q.history.map(e=>'你：'+e.question+'\n阅读助手：'+e.reply).join('\n\n'):'')+(q.evidence.length?'\n\n—— 已读原文回查 ——\n'+q.evidence.map(e=>'['+e.start+','+e.end+') '+e.quote).join('\n\n'):'');assert.equal(preview,expected,'the same frozen book position and question produce identical preview and sent context');assert(q.text.length<=24000);assert(q.history.some(e=>e.question.includes('较早的问题')));assert(q.evidence.some(e=>e.quote.includes('冷杉印章')));assert(!JSON.stringify(q).includes('纯蓝新月'));console.log('PASS long-chat preview exactly matches sent summary, recent source, history and read-only evidence');
 }finally{await ctx.close()}
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{await whileCovered(browser);await pdfSourcePage(browser);await previewMatchesRequest(browser)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
