const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/13/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{if(!process.argv.includes('--real'))throw Error('Pass --real and supply a key over stdin to authorize live calls.');const key=fs.readFileSync(0,'utf8').trim();if(!key)throw Error('Missing key on stdin');const browser=await chromium.launch({headless:true,executablePath:require('./reader-helpers.cjs').browserExecutable()});try{
for(const origin of ['https://reading-room-1109.tangqichen2007.chatgpt.site',(process.env.READER_TEST_URL||'http://127.0.0.1:38749')]){
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 await page.route(origin+'/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/api/provider')return route.continue();const p=path.join(__dirname,'../dist',url.pathname==='/'?'index.html':url.pathname);await route.fulfill({status:200,contentType:/\.(m?js)$/.test(p)?'text/javascript':p.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(p)})});
 await page.goto(origin);await page.locator('#toggleSettings').click();await page.getByRole('tab',{name:'AI 服务',exact:true}).click();if(origin.includes('127.0.0.1'))await page.locator('#aiMode').selectOption('api');await page.locator('#aiKey').fill(key);
 for(const model of origin.includes('127.0.0.1')?['deepseek-flash']:['deepseek-flash','deepseek-v4-pro']){
  await page.locator('#aiModelPreset').selectOption(model);await page.locator('#testAI').click();await page.waitForFunction(()=>['success','error'].includes(document.querySelector('#aiTestStatus').dataset.state),{},{timeout:40000});const status=await page.locator('#aiTestStatus').innerText();console.log(JSON.stringify({origin,model,state:await page.locator('#aiTestStatus').getAttribute('data-state'),status:status.replaceAll(key,'[redacted]')}));
  assert.equal(await page.locator('#aiTestStatus').getAttribute('data-state'),'success');assert.equal(await page.evaluate(()=>sessionStorage.getItem('onepage-ai-config')||localStorage.getItem('onepage-ai-config')),null);
 }
 await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error('Live connection test failed: '+e.name);process.exitCode=1});
