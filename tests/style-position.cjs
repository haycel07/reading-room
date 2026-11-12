const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:require('./reader-helpers.cjs').browserExecutable()});try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.READER_TEST_URL || 'http://127.0.0.1:38749') + '/');
 const book=(name,text)=>({name,mimeType:'text/plain',buffer:Buffer.from(text)});
 const originalText='第一章 第一场雨\n'+'虚构原文，排版改变后不应丢失位置。\n'.repeat(2000);await require('./reader-helpers.cjs').importIntoReader(page,book('布局原书.txt',originalText));
 await page.waitForFunction(()=>document.querySelector('#txt').textContent.length>2000&&document.querySelector('#reading').getAttribute('aria-busy')==='false');
 await page.locator('#dockProgress').click();await page.locator('#readingProgressSlider').focus();await page.keyboard.press('End');await page.waitForTimeout(400);
 const original=await page.evaluate(()=>localStorage.getItem('reading-last-book'));
 await require('./reader-helpers.cjs').readerControls(page);await page.locator('#toggleSettings').click();await page.locator('#fontSize').fill('31');await page.locator('#fontSize').dispatchEvent('input');
 // Deliberately switch before the 180 ms style debounce and next-frame restoration finish.
 await page.evaluate(()=>{document.getElementById('closeSettings').click();document.getElementById('backToLibrary').click()});
 await require('./reader-helpers.cjs').importIntoReader(page,book('紧接着打开的新书.txt','第一章 新的开头\n'+'这本书应该从开头阅读。\n'.repeat(300)));
 await page.waitForFunction(()=>document.querySelector('#title').textContent==='紧接着打开的新书.txt'&&document.querySelector('#txt').textContent.includes('应该从开头'));
 await page.waitForTimeout(600);assert.equal(await page.locator('#readingProgressValue').innerText(),'0%');
 const saved=await page.evaluate(id=>new Promise((resolve,reject)=>{const request=indexedDB.open('between-pages',3);request.onsuccess=()=>{const db=request.result,q=db.transaction('books').objectStore('books').get(id);q.onsuccess=()=>{resolve({progress:q.result.progress,anchor:q.result.lastVisibleAnchor});db.close()};q.onerror=reject};request.onerror=reject}),original);
 assert(saved.anchor.offset>originalText.length*.9,'Pending style work must retain the previously visible read boundary');assert(saved.progress>.9,'Late layout work must not overwrite old book with hidden/new-book position');assert.equal(errors.length,0,errors.join(';'));
 console.log('PASS rapid font change → home → different book: original progress retained, new book starts at zero, no late restoration/error; fictional isolated books');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
