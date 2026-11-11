const {ready,scrollNear}=require('./reader-helpers.cjs');
// Real local Codex calls. Isolated browser; fictional text only.
const {chromium}=require('C:/Users/13/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),responses=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(r.url().endsWith('/api/companion'))responses.push({status:r.status(),task:r.request().postDataJSON().task||'chat'})});
 await page.goto('http://127.0.0.1:38749/');
 const first='第一章 借伞\n阿棠把唯一的蓝伞借给了陌生人，自己留在旧书店等雨停。\n'+('窗外还在下雨，阿棠继续看书。\n'.repeat(600));
 const second='第二章 等雨\n'+('阿棠在书页边记下天气，店里很安静，雨滴落在窗台。\n'.repeat(650));
 const third='第三章 新的脚步声\n门外响起脚步声，阿棠抬起头，还不知道是谁。\n'+('阿棠看着店门，雨声盖住了街上的声音。\n'.repeat(1050));
 const read=first+second+third;
 assert(read.length>40000);
 await page.locator('#file').setInputFiles({name:'真实调用_虚构雨天.txt',mimeType:'text/plain',buffer:Buffer.from(read+'\n'+('尚未阅读的记录。\n'.repeat(200))+'未读秘密：店门外是月亮邮差。')});
 await ready(page);
 await scrollNear(page,read.length);
 await page.locator('#companionToggle').click();await page.locator('#chatInput').fill('阿棠开头把什么借出去了？请只聊我读过的内容，陪我说两句。');await page.locator('#chatSend').click();
 await page.waitForFunction(()=>!document.querySelector('#chatSend').disabled,null,{timeout:360000});
 const log=await page.locator('#chatLog').innerText();assert(responses.some(r=>r.task==='summary'&&r.status===200),JSON.stringify(responses));assert(responses.some(r=>r.task==='chat'&&r.status===200),log);assert(log.includes('伞'));assert(!log.includes('月亮邮差'));assert.equal(errors.length,0,errors.join(';'));
 await page.locator('#previewScope').click();await page.waitForFunction(()=>!document.querySelector('#chatSend').disabled);const scope=await page.locator('#scopeText').innerText();assert(scope.includes('较早已读内容的概括'));assert(scope.includes('以下为连续原文'));assert(!scope.includes('月亮邮差'));
 console.log(JSON.stringify({result:'PASS 真实 Codex 概括→伴读→预览',responses,reply:log.split('阿棠开头把什么借出去了？请只聊我读过的内容，陪我说两句。').at(-1).trim()},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
