const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {browserExecutable,importIntoReader}=require('./reader-helpers.cjs');
(async()=>{const {motionProfile}=await import('../dist/motion-profile.js');
 assert(motionProfile('gentle').shift<motionProfile('standard').shift);assert.equal(motionProfile('gentle',true).panel,0);
 const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{
  for(const width of [320,390,1440]){
   const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto((process.env.READER_TEST_URL||'http://127.0.0.1:38751')+'/');
   await page.evaluate(()=>{window.__animationCalls=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.__animationCalls.push({id:this.id,frames,options});return animate.call(this,frames,options)}});
   await importIntoReader(page,{name:'动效一致性-虚构.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 书店\n'+('这一页保持清楚，操作也要跟得上。\n').repeat(500))});
   assert.equal(await page.locator('#readerWrap').evaluate(e=>getComputedStyle(e).opacity),'1','opening a book does not dim its text');
   for(const mode of ['standard','gentle','off']){
    await page.locator('#toggleSettings').click();await page.getByRole('tab',{name:'阅读',exact:true}).click();await page.locator('#readerMotion').selectOption(mode);await page.locator('#closeSettings').click();await page.locator('#settings').waitFor({state:'hidden'});
    await page.locator('#toggleSettings').click();await page.locator('#settings').waitFor({state:'visible'});
    const result=await page.locator('#settings').evaluate((el,mode)=>{const a=el.getAnimations()[0],record=window.__animationCalls.filter(x=>x.id==='settings').at(-1);return {duration:a?.effect.getTiming().duration||0,css:getComputedStyle(document.documentElement).getPropertyValue('--motion-panel').trim(),frames:record?.frames,mode}},mode);
    assert.equal(result.css,motionProfile(mode).panel+'ms');
    if(mode==='off')assert.equal(result.duration,0);else {assert.equal(result.duration,motionProfile(mode).panel);assert(!JSON.stringify(result.frames).includes('scale('),'text panels never scale');}
    await page.locator('#closeSettings').click();await page.locator('#settings').waitFor({state:'hidden'});
   }
   await page.locator('#toggleSettings').click();await page.locator('#readerMotion').selectOption('standard');await page.locator('#closeSettings').click();
   await page.evaluate(()=>{for(let i=0;i<30;i++)document.getElementById('toggleSettings').click()});
   await page.waitForFunction(()=>!document.getElementById('settings').dataset.motionState);assert(await page.locator('#settings').isHidden());
   assert.equal(await page.locator('.motion-exit,.book-opening-overlay,.dialog-return-ghost').count(),0,'rapid changes leave no ghost or exit layer');
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#toggleSettings').click();assert.equal(await page.locator('#settings').evaluate(e=>e.getAnimations().length),0);await page.locator('#closeSettings').click();
   assert.equal(errors.length,0,errors.join(';'));await page.close();console.log('PASS one motion profile, stable readable text, rapid cancellation, reduced motion '+width);
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
