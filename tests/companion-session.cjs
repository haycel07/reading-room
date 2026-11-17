// All chat entries share a reading session. Fictional books, no real AI requests.
const {chromium}=require('playwright');
const {browserExecutable,importIntoReader,scrollNear}=require('./reader-helpers.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const out=path.join(__dirname,'../output/overnight-20261118/session');fs.mkdirSync(out,{recursive:true});
async function position(page,type){
 return page.evaluate(type=>{
  const wrap=document.getElementById('readerWrap');
  if(type==='epub'){const view=document.querySelector('foliate-view'),r=view.lastLocation?.range;return {cfi:view.lastLocation?.cfi,text:r?.toString().slice(0,100),full:r?.toString()}}
  if(type==='pdf'){const c=document.getElementById('canvas'),a=c.getBoundingClientRect(),b=wrap.getBoundingClientRect();return {top:(b.top-a.top)*c.height/a.height,page:document.getElementById('page').value}}
  return {top:wrap.scrollTop};
 },type);
}
async function scope(page){await page.locator('#previewScope').click();await page.waitForFunction(()=>document.getElementById('scopeText').textContent.length>10);const text=await page.locator('#scopeText').textContent();await page.locator('#scopeClose').click();return text;}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{
 for(const [width,height] of [[390,844],[844,390],[768,1024],[1440,900]])for(const type of ['txt','pdf','epub']){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
  if(width===390&&type==='txt')await page.addInitScript(()=>{Element.prototype.checkVisibility=undefined});
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/companion',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:'只聊已经读过的这段。'})})});
  await page.goto((process.env.READER_TEST_URL||'http://127.0.0.1:38751')+'/');
  const text='第一章 窗边\n'+Array.from({length:700},(_,i)=>'第'+String(i).padStart(4,'0')+'行，雨落在虚构的书店窗边，她把蓝伞借给了路人。\n').join('')+'尚未读到的暗号：月光橘子。';
  await importIntoReader(page,type==='txt'?{name:'会话位置-'+width+'.txt',mimeType:'text/plain',buffer:Buffer.from(text)}:path.join(__dirname,'fixture-regions.'+type));
  if(type==='txt')await scrollNear(page,3500);
  else if(type==='pdf'){await page.locator('#readerWrap').evaluate(w=>{w.scrollTop=140;w.dispatchEvent(new Event('scroll'))})}
  else{await page.locator('foliate-view').evaluate(async v=>{await v.next();await v.next()})}
  await page.waitForTimeout(250);const before=await position(page,type);
  await page.locator('#companionToggle').click();await page.locator('#companion').waitFor({state:'visible'});
  const compact=width<=900||height>=width;
  assert.notEqual(await page.evaluate(()=>document.activeElement.id),'chatInput','opening chat must not summon the keyboard');
  if(compact){assert.equal(await page.locator('#companion').getAttribute('aria-modal'),'true');assert(await page.locator('#reading').evaluate(e=>e.inert));assert(await page.locator('header').evaluate(e=>e.inert));const b=await page.locator('#companion').boundingBox();assert(Math.abs(b.y)<2&&Math.abs(b.height-height)<2,'all compact entries use full chat');await page.locator('#chatSend').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'companionClose','focus remains inside full chat')}
  const initial=await scope(page);if(type==='txt')assert(!initial.includes('月光橘子'));
  await page.setViewportSize({width,height:height+130});await page.waitForTimeout(150);assert.equal(await scope(page),initial,'viewport/keyboard growth cannot expand chat context');
  await page.setViewportSize({width:height,height:width});await page.waitForTimeout(220);assert.equal(await scope(page),initial,'rotation does not change the conversation boundary');
  await page.setViewportSize({width,height});await page.waitForTimeout(180);await page.locator('#companionClose').click();await page.locator('#companion').waitFor({state:'hidden'});if(compact)assert(!await page.locator('#companion').evaluate(el=>el.classList.contains('motion-exit')),'return cannot flash a bottom sheet');await page.waitForTimeout(120);
  const after=await position(page,type);if(type==='epub')assert.equal(after.text,before.text,'EPUB returns to the same visible source');else assert(Math.abs(after.top-before.top)<2,type+' returns to the same reading position '+JSON.stringify({before,after}));
  assert(!await page.locator('#reading').evaluate(e=>e.inert));assert(!await page.locator('header').evaluate(e=>e.inert));
  await page.locator('#companionToggle').click();assert.equal(await scope(page),initial,'reopening retains the original read boundary');await page.locator('#companionClose').click();
  if(width===1440){
   await page.locator('#companionToggle').click();const sourceBefore=await position(page,type);await page.locator('#readerWrap').evaluate(w=>{w.tabIndex=-1;w.focus()});await page.keyboard.press('PageDown');await page.waitForTimeout(400);const sourceAfter=await position(page,type);assert.notDeepEqual(sourceAfter,sourceBefore,'intentional side-by-side reading changes source');const grown=await scope(page);if(type==='txt')assert.notEqual(grown,initial,'genuine reading updates the conversation boundary');await page.locator('#companionClose').click();await page.waitForTimeout(150);const returned=await position(page,type);if(type==='epub')assert(returned.full.includes(sourceAfter.text.slice(0,30)),'after side-column reflow, the latest original sentence stays on the visible EPUB page');else if(type==='txt')assert(Math.abs(returned.top-sourceAfter.top)<2,'return follows latest intentional text scroll');else assert.equal(returned.page,sourceAfter.page,'return follows latest intentional PDF page');
  }
  assert.equal(requests.length,0,'scope and scene navigation do not request a model');assert.equal(errors.length,0,errors.join(';'));
  await context.close();console.log('PASS shared chat session, scope freeze, rotation, return, focus '+type+' '+width+'x'+height);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
