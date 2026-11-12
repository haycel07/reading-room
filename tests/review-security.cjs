const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {browserExecutable,importIntoReader}=require('./reader-helpers.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:844}}),external=[],errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.route('https://external.example.test/**',r=>{external.push(r.request().url());return r.fulfill({body:''})});
   await page.goto(process.env.READER_TEST_URL||'http://127.0.0.1:38749/');await page.locator('#appRail').waitFor();
   await page.evaluate(()=>{const img=new Image();img.src='https://external.example.test/leak';document.body.append(img);const frame=document.createElement('iframe');frame.src='https://external.example.test/frame';document.body.append(frame)});
   await page.waitForTimeout(150);assert.equal(external.length,0,'CSP blocks external image and frame requests');
   await importIntoReader(page,{name:'安全提示-虚构.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 雨\n'+'在书店看雨，只用来检查隐私提示。\n'.repeat(150))});
   await page.locator('#toggleSettings').click();await page.getByRole('tab',{name:'伴读',exact:true}).click();assert((await page.locator('#preferencesCompanionEnabled').locator('..').innerText()).includes('含未读部分'));
   await page.waitForTimeout(400);await page.screenshot({path:path.join(__dirname,`../output/review-fixes/privacy-${width}.png`)});await page.locator('#closeSettings').click();
   // Abort a hung foreground request by actually leaving the book; never use a real provider.
   await page.route('**/api/companion',route=>new Promise(resolve=>{page.once('close',resolve);route.request().response().catch(()=>{});}));
   await require('./reader-helpers.cjs').readerControls(page);await page.locator('#companionToggle').click();await page.locator('#chatInput').fill('这场雨怎样？');await page.locator('#chatSend').click();await page.waitForFunction(()=>document.getElementById('chatSend').disabled);
   await page.locator('#companionClose').click();await page.locator('#backToLibrary').click();await page.waitForFunction(()=>!document.getElementById('chatSend').disabled);assert(await page.locator('#welcome').isVisible());assert.equal(errors.length,0,errors.join(';'));await page.close();
  }
  // Exercise the shipped port client and reject messages originating from a child frame.
  const context=await browser.newContext();await context.route('https://appassets.androidplatform.net/assets/**',r=>r.fulfill({contentType:'text/html',body:'<html></html>'}));
  const p=await context.newPage();await p.goto('https://appassets.androidplatform.net/assets/index.html');await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../dist/native-bridge.js'),'utf8')});
  const result=await p.evaluate(async()=>{
   const received=[],channel=new MessageChannel();channel.port1.onmessage=e=>received.push(JSON.parse(e.data));
   const frame=document.createElement('iframe');await new Promise(resolve=>{frame.onload=resolve;document.body.append(frame)});
   window.dispatchEvent(new MessageEvent('message',{data:'onepage-native-port',source:frame.contentWindow,ports:[channel.port2]}));
   OnePageAI.request('fixture','{}');await new Promise(r=>setTimeout(r,20));const rejected=received.length===0;
   window.dispatchEvent(new MessageEvent('message',{data:'onepage-native-port',source:null,ports:[channel.port2]}));
   await new Promise(r=>setTimeout(r,20));return {rejected,received};
  });assert(result.rejected);assert.equal(result.received[0].bridge,'ai');assert.equal(result.received[0].action,'request');await context.close();
  const java=fs.readFileSync(path.join(__dirname,'../android-app/src/chat/tangqichen/onepage/MainActivity.java'),'utf8');assert(!java.includes('.addJavascriptInterface('));assert(java.includes('Uri.parse(ORIGIN)'));
  console.log('PASS CSP, visible unread-data notice, hung chat cancels on exit, top-level message channel and child-frame rejection; fictional fixtures');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
