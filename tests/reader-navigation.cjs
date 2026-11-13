// Critical navigation must work on entry, before any tap reveals secondary tools.
const {chromium}=require('playwright');
const {browserExecutable,ready,readerControls}=require('./reader-helpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=path.join(__dirname,'../output/reader-navigation-qa');fs.mkdirSync(output,{recursive:true});
async function essential(page){
 for(const id of ['backToLibrary','toggleSettings','companionToggle']){
  const result=await page.locator('#'+id).evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {visible:checkVisibility(el),hit:el===hit||el.contains(hit),width:r.width,height:r.height,right:r.right};function checkVisibility(el){return el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&!el.closest('[inert]')}});
  assert(result.visible&&result.hit,`${id} must be visible and clickable: ${JSON.stringify(result)}`);
  assert(result.width>=44&&result.height>=44,'44px touch targets');
 }
 const g=await page.evaluate(()=>({header:document.querySelector('header').getBoundingClientRect().toJSON(),read:document.querySelector('#readerWrap').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth}));
 assert(g.read.top>=g.header.bottom-1,'navigation must not cover the book');assert(!g.overflow,'no horizontal overflow');
}
async function settings(page){await page.locator('#toggleSettings').click();await page.locator('#settings').waitFor({state:'visible'});await page.locator('#fontSize').fill('22');await page.locator('#fontSize').dispatchEvent('input');assert.equal(await page.locator('#fontSize').inputValue(),'22');await page.locator('#closeSettings').click();await page.locator('#settings').waitFor({state:'hidden'});await essential(page)}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{
 for(const [width,height]of [[1440,900],[390,844],[320,568],[844,390],[768,1024]])for(const format of ['txt','pdf','epub']){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.READER_TEST_URL || 'http://127.0.0.1:38749') + '/');await page.locator('#appRail').waitFor();
  const file=format==='txt'?{name:'虚构的很长书名用来验证窄屏导航不会挤掉退出和设置.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 雨天\n'+'她留在虚构的书店看雨，听见雨点落在玻璃上的声音。\n'.repeat(250))}:path.join(__dirname,'fixture.'+format);
  await page.locator('#file').setInputFiles(file);await page.locator('#confirmImport').click();await page.waitForFunction(()=>document.getElementById('confirmImport').textContent==='好');assert((await page.locator('#importStatus').innerText()).startsWith('已导入 1 本书'));await page.locator('#confirmImport').click();await page.locator('.library-book').first().click();await ready(page);
  await essential(page);assert(!await page.locator('body').evaluate(e=>e.classList.contains('reader-controls')),'entry must not require showing controls');await page.locator('#companionToggle').click();await page.locator('#companion').waitFor({state:'visible'});await page.locator('#companionClose').click();await page.locator('#companion').waitFor({state:'hidden'});await essential(page);await settings(page);
  const read=await page.locator('#readerWrap').boundingBox();await page.mouse.move(read.x+read.width/2,read.y+read.height/2);await page.mouse.wheel(0,250);await page.keyboard.press('Escape');await essential(page);
  // Leaving an active selection must never be a prerequisite for exiting/settings.
  if(format==='txt')await page.locator('#txt').evaluate(el=>{const node=el.firstChild,r=document.createRange();r.selectNodeContents(node);const s=getSelection();s.removeAllRanges();s.addRange(r)});
  if(format==='pdf')await page.locator('#pdfTextLayer span').first().evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(r)});
  if(format==='epub')await page.evaluate(()=>{const doc=document.querySelector('foliate-view').renderer.getContents()[0].doc;const r=doc.createRange();r.selectNodeContents(doc.body.firstElementChild);doc.getSelection().removeAllRanges();doc.getSelection().addRange(r)});
  await essential(page);await settings(page);await page.keyboard.press('Escape');await readerControls(page);await essential(page);
  await page.locator('#dockToc').click();await page.locator('.sidebar.open').waitFor();await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.body.classList.contains('shelf-open'));await essential(page);
  await page.setViewportSize({width:height,height:width});await page.waitForTimeout(120);await essential(page);await page.setViewportSize({width,height});await page.waitForTimeout(120);await essential(page);
  if(format==='txt'){await page.waitForTimeout(450);await page.screenshot({path:path.join(output,`reader-${width}x${height}.png`)});await page.locator('#toggleSettings').click();await page.waitForTimeout(450);await page.screenshot({path:path.join(output,`settings-${width}x${height}.png`)});await page.locator('#closeSettings').click()}
  await page.locator('#backToLibrary').click();await page.locator('#welcome').waitFor({state:'visible'});assert.equal(await page.locator('.library-book').count(),1);
  await page.reload();await page.locator('.library-book').first().click();await ready(page);await essential(page);await page.locator('#backToLibrary').click();await page.locator('#welcome').waitFor({state:'visible'});assert.equal(errors.length,0,errors.join(';'));await context.close();console.log(`PASS persistent back/settings ${format} ${width}x${height}`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
