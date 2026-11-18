const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {browserExecutable,importIntoReader,scrollNear}=require('./reader-helpers.cjs');
const {commentFixture}=require('./prepared-fixture.cjs');
const out=path.join(__dirname,'../output/companion-refinement-20261118/presentation');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{
 for(const width of [320,390,1440]){
  const c=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:width<500}),p=await c.newPage(),calls=[],failures=[],errors=[];let release;
  p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>{if(r.url().endsWith('/api/companion'))failures.push(r.failure()?.errorText)});
  await p.route('**/api/companion',async r=>{const q=r.request().postDataJSON();calls.push(q);if(q.task==='prepared-comment'&&calls.filter(x=>x.task==='prepared-comment').length===2)await new Promise(resolve=>release=resolve);await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:JSON.stringify(q.task==='prepared-comment'?commentFixture(q,{text:q.allowedEnd<2000?'她把伞留在门口，却没有催来客离开。这里挺温柔的。':'雨声像翻书声，安静里还有一点动静。'}):{summary:'店主把伞留在门口。',memory:'来客在书店等雨。'})})})});
  await p.goto(process.env.READER_TEST_URL||'http://127.0.0.1:38751');await importIntoReader(p,{name:'配色和收起-虚构.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 雨声\n'+'她把蓝伞留在门口，没有催来客离开；雨声像翻书声。\n'.repeat(220))});await p.locator('#proactiveEnabled').check();for(let i=0;!release&&i<1500;i++)await new Promise(r=>setTimeout(r,10));assert(release);
  const bounds=await p.locator('#readerWrap').boundingBox();await scrollNear(p,calls[0].allowedEnd+10);await p.locator('#initiativeCard').waitFor({state:'visible'});await p.waitForTimeout(250);
  const dismiss=await p.locator('#initiativeDismiss').boundingBox();assert(dismiss.width>=44&&dismiss.height>=44,'dismiss has a usable touch target');
  const palettes=await p.evaluate(async()=>{
   const {READING_THEMES,readingPalette,contrastRatio}=await import('./reading-appearance.js'),root=document.documentElement,out=[];
   for(const [id,pair]of Object.entries(READING_THEMES)){
    const palette=readingPalette(pair);for(const[k,v]of Object.entries({'--read':pair.paper,'--readink':pair.ink,'--reading-surface':palette.surface,'--reading-raised':palette.raised,'--reading-muted':palette.muted,'--reading-accent':palette.accent,'--reading-selected':palette.selected}))root.style.setProperty(k,v);
    const bubble=document.getElementById('initiativeCard'),reply=document.getElementById('initiativeReply'),text=document.getElementById('initiativeText'),close=document.getElementById('initiativeDismiss'),hex=s=>'#'+s.match(/\d+/g).slice(0,3).map(x=>Number(x).toString(16).padStart(2,'0')).join('');
    const replyBg=getComputedStyle(reply).backgroundColor;const bg=hex(replyBg==='rgba(0, 0, 0, 0)'?getComputedStyle(bubble).backgroundColor:replyBg),ink=hex(getComputedStyle(text).color),muted=hex(getComputedStyle(close).color);out.push({id,bg,ink,contrast:contrastRatio(bg,ink),closeContrast:contrastRatio(bg,muted)});
   }return out;
  });for(const x of palettes){assert(x.contrast>=4.5,JSON.stringify(x));assert(x.closeContrast>=4.5,JSON.stringify(x))}
  await p.waitForTimeout(100);await p.screenshot({path:path.join(out,'night-'+width+'.png')});await p.locator('#initiativeDismiss').tap();await p.locator('#initiativeCard').waitFor({state:'hidden'});await p.waitForTimeout(150);assert.equal(failures.length,0,'dismissing one comment must not abort pending preparation');release();await p.waitForFunction(()=>document.getElementById('proactiveStatus').textContent.includes('2 / 2 处已处理'));await scrollNear(p,calls.filter(x=>x.task==='prepared-comment')[1].allowedEnd+10);await p.locator('#initiativeCard').waitFor({state:'visible'});assert((await p.locator('#initiativeText').innerText()).includes('雨声'),'the second comment still appears while reading');assert.deepEqual(await p.locator('#readerWrap').boundingBox(),bounds,'comments never reserve reading space');assert.equal(calls.filter(x=>x.task==='prepared-comment'&&x.regionIndex===0).length,2,'dismissal does not regenerate old comments');assert.deepEqual(errors,[]);await c.close();console.log('PASS palette contrast, 44px dismiss, no cancelled preparation or repeated comments '+width);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
