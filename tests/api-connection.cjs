const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/13/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'../dist');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
for(const transport of ['web','local','native']){
 const origin=transport==='local'?'http://127.0.0.1:38749':'https://reader-fixture.test';
 const context=await browser.newContext({viewport:{width:320,height:740}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(transport=>{
  window.__case={status:200,reply:'连接成功',delay:0};window.__testRequests=[];window.__cancels=0;
  if(transport==='native')window.OnePageAI={request(id,raw){const q=JSON.parse(raw);window.__testRequests.push(q.body);const c={...window.__case};setTimeout(()=>window.__onepageAI[id]?.(c.status===200?{choices:[{message:{content:c.reply}}]}:{error:'not displayed',status:c.status}),c.delay)},cancel(){window.__cancels++}};
 },transport);
 await page.route(origin+'/**',async route=>{
  const u=new URL(route.request().url());if(u.pathname==='/api/provider')return api(route);
  const p=path.join(root,decodeURIComponent(u.pathname==='/'?'index.html':u.pathname));
  await route.fulfill({status:fs.existsSync(p)?200:404,contentType:/\.(m?js)$/.test(p)?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream',body:fs.existsSync(p)?fs.readFileSync(p):''});
 });
 async function api(route){const q=route.request().postDataJSON(),body=q.body||q;await page.evaluate(b=>window.__testRequests.push(b),body);const c=await page.evaluate(()=>window.__case);if(c.delay)await new Promise(r=>setTimeout(r,c.delay));try{await route.fulfill({status:transport==='local'?200:c.status,contentType:'application/json',body:JSON.stringify(c.status===200?{choices:[{message:{content:c.reply}}]}:{error:'never expose provider diagnostics',status:c.status})})}catch{}}
 if(transport==='web')await page.route('https://api.deepseek.com/**',api);
 await page.goto(origin);await page.locator('#toggleSettings').click();await page.getByRole('tab',{name:'AI 服务',exact:true}).click();
 if(transport==='local')await page.locator('#aiMode').selectOption('api');
 await page.locator('#testAI').click();assert.match(await page.locator('#aiTestStatus').innerText(),/密钥/);
 await page.locator('#aiKey').fill('fictional-test-key');await page.locator('#testAI').click();await page.waitForFunction(()=>document.querySelector('#aiTestStatus').dataset.state==='success');
 assert.equal(await page.locator('#aiTestStatus').evaluate(el=>getComputedStyle(el).color),'rgb(26, 127, 55)');
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('onepage-ai-config')||localStorage.getItem('onepage-ai-config')),null,'testing must not save credentials');
 const request=await page.evaluate(()=>window.__testRequests[0]);assert.equal(request.model,'deepseek-flash');assert.equal(request.messages.length,1);assert.equal(request.thinking.type,'disabled');assert.equal(request.max_tokens,128);
 for(const status of [401,402,403,404,429,503]){
  await page.evaluate(status=>window.__case={status,reply:'',delay:0},status);await page.locator('#testAI').click();await page.waitForFunction(()=>document.querySelector('#aiTestStatus').dataset.state==='error');assert.match(await page.locator('#aiTestStatus').innerText(),new RegExp(String(status)));assert(!(await page.locator('#aiTestStatus').innerText()).includes('fictional-test-key'));
 }
 await page.evaluate(()=>window.__case={status:200,reply:'',delay:0});await page.locator('#testAI').click();await page.waitForFunction(()=>document.querySelector('#aiTestStatus').textContent.includes('有效文字'));
 await page.evaluate(()=>window.__case={status:200,reply:'late',delay:250});await page.locator('#testAI').click();await page.locator('#aiModel').fill('edited-model');await page.waitForTimeout(300);assert.equal(await page.locator('#aiTestStatus').innerText(),'','stale response cannot validate edited model');
 await page.locator('#testAI').click();await page.locator('#testAI').click();assert.match(await page.locator('#aiTestStatus').innerText(),/取消/);await page.waitForTimeout(300);assert.match(await page.locator('#aiTestStatus').innerText(),/取消/);
 await page.evaluate(()=>{const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms===30000?30:ms,...args)});await page.locator('#testAI').click();await page.waitForFunction(()=>document.querySelector('#aiTestStatus').textContent.includes('测试超时'));await page.waitForTimeout(300);assert.match(await page.locator('#aiTestStatus').innerText(),/超时/);
 await page.locator('#aiKey').fill('fictional-next-key');assert.equal(await page.locator('#aiTestStatus').innerText(),'');
 assert.equal(errors.length,0,errors.join(';'));await context.close();console.log('PASS '+transport+': draft test, no storage/book payload, 401/402/403/404/429/503, empty output, edit invalidation, cancel, timeout');
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
