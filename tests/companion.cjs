const { chromium } = require('C:/Users/13/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('assert');
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1200,height:760}}), requests=[], errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/companion',async r=>{const payload=r.request().postDataJSON();requests.push(payload);await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:'测试回复 '+requests.length})})});
 await page.goto('http://127.0.0.1:38749/');
 const text='第一章 开始\n开头标记\n'+Array.from({length:180},(_,i)=>`第${i}行 还没看完的故事继续。`).join('\n')+'\n终点标记';
 await page.locator('#file').setInputFiles({name:'book.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.locator('#companionToggle').click();
 await page.locator('#previewScope').click();assert((await page.locator('#scopeText').innerText()).includes('开头标记'));assert(!(await page.locator('#scopeText').innerText()).includes('终点标记'));await page.locator('#scopeClose').click();
 await page.locator('#toggleSettings').click();await page.getByRole('tab',{name:'伴读',exact:true}).click();await page.locator('#persona').selectOption('curious');await page.locator('#closeSettings').click();await page.locator('#companionToggle').click();await page.locator('#chatInput').fill('开头读后感');await page.locator('#chatSend').click();await page.waitForFunction(()=>!document.querySelector('#chatSend').disabled);assert.equal(requests[0].persona,'curious');assert(!requests[0].text.includes('终点标记'));
 await page.locator('#readerWrap').evaluate(e=>e.scrollTop=e.scrollHeight);await page.waitForTimeout(400);await page.locator('#chatInput').fill('结尾读后感');await page.locator('#chatSend').click();await page.waitForFunction(()=>!document.querySelector('#chatSend').disabled);assert(requests[1].text.includes('终点标记'));assert.equal(requests[1].history.length,1);
 await page.locator('#readerWrap').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(500);assert(!(await page.locator('#chatLog').innerText()).includes('结尾读后感'));assert((await page.locator('#chatPosition').innerText()).includes('隐藏 1 条'));await page.locator('#chatInput').fill('重新看开头');await page.locator('#chatSend').click();await page.waitForFunction(()=>!document.querySelector('#chatSend').disabled);assert.equal(requests[2].history.length,1);assert(!JSON.stringify(requests[2].history).includes('结尾读后感'));
 await page.reload();await page.locator('.bookitem').click();await page.locator('#companionToggle').click();await page.waitForTimeout(500);let restored=await page.locator('#chatLog').innerText();assert(restored.includes('开头读后感')&&restored.includes('重新看开头'));assert(!restored.includes('结尾读后感'));assert.equal(await page.locator('#persona').inputValue(),'curious');
 await page.locator('#file').setInputFiles('tests/fixture.pdf');await page.waitForFunction(()=>document.querySelector('#pages').textContent==='2',{timeout:30000});await page.waitForTimeout(2000);await page.locator('#companionToggle').click();await page.locator('#previewScope').click();await page.waitForTimeout(1000);let pdfText=await page.locator('#scopeText').innerText();console.log('PDF CONTEXT:',pdfText, 'STATUS:',await page.locator('#status').innerText());assert(pdfText.includes('START_VISIBLE'));assert(!pdfText.includes('UNREAD_BOTTOM'));assert(!pdfText.includes('FUTURE_PAGE'));assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS: TXT 截断、预览、风格、回退过滤、刷新恢复、PDF 已读边界');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

