const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const out=path.join(__dirname,'../output/mobile-platform');fs.mkdirSync(out,{recursive:true});
const origin='https://reader-fixture.test';
async function fixture(browser,{width=390,height=844,native=false,legacy=false}={}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(origin+'/**',async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:'http://127.0.0.1:38749'+u.pathname+u.search});await route.fulfill({response})});
 await page.addInitScript(({native,legacy})=>{
   window.__apiCalls=[];window.__clipboardReads=0;
   if(legacy)localStorage.setItem('onepage-ai-config',JSON.stringify({mode:'local',endpoint:'https://old.example/v1',model:'user-model',sk:'fictional-old-token'}));
   if(native){window.OnePageReading={keepAwake(){},fullscreen(){},readClipboard(id){window.__clipboardReads++;window.__onepageClipboard[id]({text:'fictional-pasted-token'})}};window.OnePageAI={request(id,raw){const req=JSON.parse(raw);window.__apiCalls.push({endpoint:req.endpoint,model:req.body.model});window.__onepageAI[id]({choices:[{message:{content:'虚构测试回复'}}]})},cancel(){}};}
 },{native,legacy});
 await page.goto(origin);await page.locator('#appRail [data-page=preferences]').click();await page.getByRole('button',{name:'阅读与排版',exact:true}).click();await page.getByRole('tab',{name:'AI 服务',exact:true}).click();return{page,context,errors};
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:require('./reader-helpers.cjs').browserExecutable()});try{
 for(const native of [false,true]){
  const {page:p,context,errors}=await fixture(browser,{native});
  assert.equal(await p.locator('#aiMode option[value=local]').count(),0);assert(!/Codex|电脑|启动伴读/.test(await p.locator('#settings').innerText()));assert.equal(await p.locator('#aiKey').getAttribute('type'),'text');assert(await p.locator('#aiKey').evaluate(el=>getComputedStyle(el).webkitTextSecurity==='disc'));
  assert.equal(await p.locator('#aiProvider option').count(),7);assert.equal(await p.locator('#aiProvider').inputValue(),'deepseek');assert.equal(await p.locator('#aiModel').inputValue(),'deepseek-flash');
  await p.locator('#closeSettings').click();await p.locator('#settings').waitFor({state:'hidden'});
  await require('./reader-helpers.cjs').importIntoReader(p,{name:'配置入口测试.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 初遇\n'+'完全虚构的测试文字。\n'.repeat(50))});await p.waitForFunction(()=>document.getElementById('reading').getAttribute('aria-busy')==='false');await require('./reader-helpers.cjs').readerControls(p);await p.locator('#companionToggle').click();await p.locator('#localNotice').waitFor({state:'visible'});
  assert(!/Codex|电脑|本机/.test(await p.locator('#localNotice').innerText()));assert.equal(await p.locator('#localNotice a[href*="127.0.0.1"]').count(),0);await p.locator('#localNotice .open-ai-settings').click();await p.locator('#preferences-ai').waitFor({state:'visible'});
  await p.locator('#aiKey').fill('fictional-deepseek-token');await p.locator('#aiProvider').selectOption('openai');assert.equal(await p.locator('#aiKey').inputValue(),'');assert.equal(await p.locator('#aiModel').inputValue(),'gpt-5.4-mini');await p.locator('#aiModelPreset').selectOption('gpt-5.4-nano');assert.equal(await p.locator('#aiModel').inputValue(),'gpt-5.4-nano');
  await p.locator('#aiProvider').selectOption('deepseek');assert.equal(await p.locator('#aiKey').inputValue(),'fictional-deepseek-token','switching providers must retain separate drafts');
  await p.locator('#toggleAIKey').click();assert(await p.locator('#aiKey').evaluate(el=>getComputedStyle(el).webkitTextSecurity==='none'));
  if(native){await p.locator('#pasteAIKey').click();await p.waitForFunction(()=>document.getElementById('aiKey').value==='fictional-pasted-token');assert.equal(await p.evaluate(()=>window.__clipboardReads),1);assert(await p.locator('#aiKey').evaluate(el=>getComputedStyle(el).webkitTextSecurity==='disc'));}
  else{await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>'fictional-browser-paste'}}));await p.locator('#pasteAIKey').click();assert.equal(await p.locator('#aiKey').inputValue(),'fictional-browser-paste');}
  await p.locator('#saveAI').click();const saved=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('onepage-ai-config')));assert.equal(saved.mode,'api');assert.equal(saved.model,'deepseek-flash');assert.equal(await p.evaluate(()=>localStorage.getItem('onepage-ai-config')),null);
  await p.locator('#settings').screenshot({path:path.join(out,(native?'android':'web')+'-ai.png')});
  const reply=await p.evaluate(async()=>{const {companionFetch}=await import('/ai-client.js');if(!window.OnePageAI)return null;const r=await companionFetch({text:'虚构原文',question:'你好'});return r.json()});if(native){assert.equal(reply.reply,'虚构测试回复');assert.deepEqual(await p.evaluate(()=>window.__apiCalls),[{endpoint:'https://api.deepseek.com/chat/completions',model:'deepseek-flash'}]);}
  assert.equal(errors.length,0,errors.join(';'));await context.close();
 }
 const legacy=await fixture(browser,{native:true,legacy:true});assert.equal(await legacy.page.locator('#aiMode').inputValue(),'api');assert.equal(await legacy.page.locator('#aiEndpoint').inputValue(),'https://old.example/v1');assert.equal(await legacy.page.locator('#aiKey').inputValue(),'fictional-old-token');assert(!/Codex|电脑/.test(await legacy.page.locator('#settings').innerText()));await legacy.context.close();
 for(const [width,height] of [[320,640],[360,800],[412,915],[844,390],[768,1024],[1280,800]]){
  const {page:p,context,errors}=await fixture(browser,{width,height,native:true});
  assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'no viewport overflow '+width);
  for(const safe of [false,true]){if(safe)await p.evaluate(()=>{document.documentElement.style.setProperty('--safe-top','24px');document.documentElement.style.setProperty('--safe-bottom','20px')});
   const box=await p.locator('#settings').boundingBox();assert(box.y>=0&&box.y+box.height<=height-7,'settings fits safe viewport '+width);await p.locator('#aiKey').fill('fictional-token');await p.locator('#saveAI').scrollIntoViewIfNeeded();assert(await p.locator('#saveAI').isVisible());
  }
  // A reduced visual viewport models keyboard availability, not a device IME claim.
  await p.setViewportSize({width,height:Math.min(430,height)});await p.waitForTimeout(70);const keyboard=await p.locator('#settings').boundingBox();assert(keyboard.y+keyboard.height<=Math.min(430,height)-7);await p.locator('#aiModel').focus();await p.locator('#saveAI').scrollIntoViewIfNeeded();await p.locator('#closeSettings').click();await p.locator('#settings').waitFor({state:'hidden'});await p.setViewportSize({width,height});
  await require('./reader-helpers.cjs').importIntoReader(p,{name:'打开动效测试.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 清晨的书店\n'+'完全虚构的阅读文字。\n'.repeat(500))});await p.locator('.book-opening-overlay').waitFor({state:'visible'});assert(await p.locator('.book-opening-cover').evaluate(el=>el.getAnimations().length)>0);await p.locator('.book-opening-overlay').waitFor({state:'detached'});await p.waitForTimeout(60);
  const wrap=await p.locator('#readerWrap').boundingBox();assert(wrap.height>=120);assert(wrap.y+wrap.height<height+1,'reader fits available viewport '+width);await p.screenshot({path:path.join(out,'reading-'+width+'x'+height+'.png')});
  await require('./reader-helpers.cjs').readerControls(p);await p.locator('#backToLibrary').click();await p.locator('.book-opening-overlay').waitFor({state:'detached'});await p.locator('.library-book').click();await p.locator('.book-opening-overlay[data-direction=open]').waitFor({state:'visible'});await require('./reader-helpers.cjs').readerControls(p);await p.locator('#backToLibrary').click();assert.equal(await p.locator('.book-opening-overlay[data-direction=open]').count(),0,'returning home cancels opening transition');await p.locator('.book-opening-overlay').waitFor({state:'detached'});
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.library-book').click();assert.equal(await p.locator('.book-opening-overlay').count(),0);assert.equal(errors.length,0,errors.join(';'));await context.close();
 }
 console.log('PASS web + simulated Android: six provider/model presets + custom, separate drafts, normal masked key + clipboard paths, legacy local mode becomes API without data loss, API bridge avoids desktop, 320/360/412/844-landscape/768/1280, safe/keyboard viewport, real opening animation/cancel/reduced motion; all fictional, no real API or Android device claim');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
