// Exercise the exact Back-handler script shipped in MainActivity, in an isolated web context.
// This verifies navigation decisions, not Android/WebView integration on a device.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/13/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const java=fs.readFileSync(require('node:path').join(__dirname,'../android-app/src/chat/tangqichen/onepage/MainActivity.java'),'utf8');
const match=java.match(/web\.evaluateJavascript\(("(?:[^"\\]|\\.)*"), handled ->/);
assert(match,'Native Back script must be found');const back=JSON.parse(match[1]);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:require('./reader-helpers.cjs').browserExecutable()});try{
 const page=await browser.newPage({viewport:{width:390,height:850}});await page.goto('http://127.0.0.1:38749/');
 await require('./reader-helpers.cjs').importIntoReader(page,{name:'安卓返回键测试.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 返回路径\n'+('这是完全虚构的测试文本。\n'.repeat(100)))});
 await page.waitForFunction(()=>document.body.classList.contains('is-reading')&&document.querySelector('#txt').textContent.length>100);
 await page.locator('#dockToc').click();assert(await page.evaluate(back));assert(!await page.locator('.sidebar').evaluate(el=>el.classList.contains('open')));assert(await page.locator('#reading').isVisible());
 await require('./reader-helpers.cjs').readerControls(page);await page.locator('#toggleSettings').click();assert(await page.evaluate(back));await page.locator('#settings').waitFor({state:'hidden'});assert(await page.locator('#reading').isVisible());
 await page.evaluate(()=>{window.__fullscreenExit=false;window.OnePageReading={fullscreen:active=>{window.__fullscreenExit=!active}};document.documentElement.classList.add('native-fullscreen')});assert(await page.evaluate(back));assert(await page.evaluate(()=>window.__fullscreenExit));assert(await page.locator('#reading').isVisible());
 assert(await page.evaluate(back));await page.locator('#welcome').waitFor({state:'visible'});assert.equal(await page.evaluate(back),false,'Back on library allows native Activity to exit');
 console.log('PASS exact Android Back script: drawer, settings, native fullscreen, collapsed outline does not trap Back, library then native exit; no device claim');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
