// Current Anx shell: actual Motion transitions plus reduced-motion behavior.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {browserExecutable,importIntoReader,readerControls}=require('./reader-helpers.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{
 for(const width of [320,390,844,1440]){
  const p=await browser.newPage({viewport:{width,height:width===844?390:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.READER_TEST_URL||'http://127.0.0.1:38749/');await p.locator('#appRail').waitFor();
  await p.evaluate(()=>{window.__motions=0;const animate=Motion.animate;Motion.animate=(...args)=>{window.__motions++;return animate(...args)}});
  await importIntoReader(p,{name:'动效-虚构.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 雨中\n'+'虚构的雨落在书店窗外。\n'.repeat(180))});
  await p.locator('#toggleSettings').click();assert.equal(await p.locator('#settings').getAttribute('data-motion-source'),'toggleSettings');
  await p.waitForFunction(()=>!document.getElementById('settings').dataset.motionState);assert(await p.locator('#settings').isVisible());
  await p.locator('#closeSettings').click();await p.locator('#settings').waitFor({state:'hidden'});await readerControls(p);
  await p.locator('#readerToolsToggle').click();await p.locator('#readerTools').waitFor({state:'visible'});assert.equal(await p.locator('#readerTools').getAttribute('data-motion-source'),'readerToolsToggle');
  await p.waitForFunction(()=>!document.getElementById('readerTools').dataset.motionState);await p.locator('#readerTools .reader-dialog-head button').click();
  assert(!await p.locator('#readerTools').evaluate(e=>e.open));await p.locator('.dialog-return-ghost').waitFor({state:'detached'});
  await p.locator('#backToLibrary').click();const returning=p.locator('.book-opening-overlay[data-direction=return]');await returning.waitFor({state:'visible'});assert.equal(await returning.locator('.book-flight-cover').count(),0);await returning.waitFor({state:'detached'});
  assert(await p.evaluate(()=>window.__motions>4));await p.emulateMedia({reducedMotion:'reduce'});
  await p.locator('.library-book').first().click();await p.waitForFunction(()=>document.getElementById('reading').getAttribute('aria-busy')==='false');assert.equal(await p.locator('.book-opening-overlay').count(),0);
  await p.locator('#toggleSettings').click();assert.equal(await p.locator('#settings').evaluate(e=>e.getAnimations().length),0);await p.locator('#closeSettings').click();await p.locator('#backToLibrary').click();assert.equal(errors.length,0,errors.join(';'));await p.close();
 }
 console.log('PASS current-shell Motion panels/dialogs/cover return, four sizes, reduced motion; fictional books');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
