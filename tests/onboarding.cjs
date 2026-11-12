const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {browserExecutable,ready,readerControls}=require('./reader-helpers.cjs');
const {createPreviewServer}=require('../tools/preview-server.cjs');
const output=path.join(__dirname,'../output/onboarding');fs.mkdirSync(output,{recursive:true});
const book=(name,text)=>({name,mimeType:'text/plain',buffer:Buffer.from(text)});
const sampleName='窗边的书店 · 一页试读.txt';
async function guide(page){
  await page.locator('#appRail [data-page=preferences]').click();
  await page.locator('.settings-list button').filter({hasText:'使用指南'}).click();
  await page.locator('#readingGuide').waitFor({state:'visible'});
}
async function complete(page){
  await page.locator('#confirmImport').click();
  await page.waitForFunction(()=>document.getElementById('confirmImport').textContent==='好');
}
async function records(page){
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('between-pages',3);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,q=db.transaction('books').objectStore('books').getAll();
      q.onerror=()=>reject(q.error);
      q.onsuccess=async()=>{const result=await Promise.all(q.result.map(async b=>({id:b.id,name:b.name,sample:b.readerOnboardingSample,text:await b.data.text()})));db.close();resolve(result)};
    };
  }));
}
(async()=>{
  let server;
  if(!process.env.READER_TEST_URL){server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));}
  const base=process.env.READER_TEST_URL||'http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});
  try{
    for(const width of [320,390,1440]){
      const context=await browser.newContext({viewport:{width,height:width===320?740:900}}),page=await context.newPage(),calls=[],errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/api/companion',r=>{calls.push(r.request().postDataJSON());return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'fictional test only'})})});
      await page.goto(base);await page.locator('#firstImport').waitFor();
      assert.equal(await page.locator('dialog[open]').count(),0,'first use is inline, never forced');
      assert(await page.locator('#firstReadingTips').isVisible());
      await page.screenshot({path:path.join(output,'first-'+width+'.png')});
      await page.locator('#skipReadingGuide').click();assert(await page.locator('#firstReadingTips').isHidden());
      await page.reload();await page.locator('#firstImport').waitFor();assert(await page.locator('#firstReadingTips').isHidden());
      await page.locator('#openReadingGuide').click();const text=await page.locator('#readingGuide').innerText();
      assert(text.includes('左上角“书架”')&&text.includes('尚未读到')&&text.includes('不会自动互通'));
      await page.locator('#guideLater').click();assert.equal(calls.length,0);
      const firstText='第一章 书店\n'+'此为完全虚构的导入样本，原始内容需要完整保留。\n'.repeat(40);
      const first=book('第一本很长的测试书名用于检查换行和导入状态.txt',firstText),failed=book('失败演示.txt','第二本应失败，不应覆盖第一本。');
      const unsupported=book('未支持的文件.kfx','fictional unsupported format');
      const chooserPromise=page.waitForEvent('filechooser');await page.locator('#firstImport').click();await (await chooserPromise).setFiles([first,failed,unsupported]);
      assert.equal(await page.locator('#importList .import-item').count(),3);
      assert((await page.locator('#importList').innerText()).includes('TXT ·'));
      assert((await page.locator('#importList').innerText()).includes('暂不支持 KFX'));
      assert((await page.locator('#importSelection').innerText()).includes('2 / 3'));
      const inputs=page.locator('#importList input');await inputs.nth(1).uncheck();assert.equal(await page.locator('#confirmImport').innerText(),'导入 1 本书');
      await inputs.nth(0).uncheck();assert(await page.locator('#confirmImport').isDisabled());
      await page.locator('#cancelImport').click();assert.equal(await page.locator('.library-book').count(),0,'cancel imports nothing');
      await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='books'&&value.name==='失败演示.txt')throw new DOMException('fictional quota','QuotaExceededError');return put.call(this,value,...args)}});
      await page.locator('#file').setInputFiles([first,failed,unsupported]);await complete(page);
      assert((await page.locator('#importStatus').innerText()).startsWith('已导入 1 本书'));
      assert.equal(await page.locator('#importList [data-state=success]').count(),1);assert.equal(await page.locator('#importList [data-state=failed]').count(),2);
      assert((await page.locator('#importList').innerText()).includes('存储空间不足'));
      await page.screenshot({path:path.join(output,'import-'+width+'.png')});
      await page.locator('#openImportedBook').click();await ready(page);assert.equal(await page.locator('#title').innerText(),first.name);
      await page.locator('#backToLibrary').click();assert.equal((await records(page))[0].text,firstText);
      // All failed imports retain the old library and offer no successful-read action.
      await page.locator('#file').setInputFiles(failed);await complete(page);assert((await page.locator('#importStatus').innerText()).startsWith('已导入 0 本书'));assert(await page.locator('#openImportedBook').isHidden());await page.locator('#confirmImport').click();
      await page.evaluate(()=>{localStorage.setItem('reading-initiative-enabled','true');document.getElementById('proactiveEnabled').checked=true;document.getElementById('preferencesCompanionEnabled').checked=true});
      await guide(page);const before=calls.length;await page.locator('#guideSample').click();await ready(page);await page.waitForTimeout(350);
      assert.equal(calls.length,before,'sample with prior automatic companion enabled spends no request');
      assert.equal(await page.locator('#proactiveEnabled').isChecked(),false);assert.equal(await page.evaluate(()=>localStorage.getItem('reading-initiative-enabled')),'true');
      const id=await page.evaluate(()=>localStorage.getItem('reading-last-book'));
      assert.equal((await records(page)).filter(b=>b.sample).length,1);assert(await page.locator('#readingGuide').isHidden());
      await page.locator('#backToLibrary').click();assert(await page.locator('#proactiveEnabled').isChecked(),'restore previous in-memory setting after sample');
      const beforeCover=calls.length;await page.locator(`.library-book[data-book-id="${id}"]`).click();await ready(page);await page.waitForTimeout(200);assert.equal(calls.length,beforeCover,'opening the existing demo cover also avoids automatic AI');assert(!await page.locator('#proactiveEnabled').isChecked());await page.locator('#backToLibrary').click();assert(await page.locator('#proactiveEnabled').isChecked());
      await guide(page);await page.locator('#guideSample').click();await ready(page);assert.equal(await page.evaluate(()=>localStorage.getItem('reading-last-book')),id);assert.equal((await records(page)).length,2,'repeated sample reuses only owned demo');
      await readerControls(page);await page.locator('#proactiveEnabled').check();await page.locator('#proactiveEnabled').uncheck();
      await page.locator('#backToLibrary').click();assert(!await page.locator('#proactiveEnabled').isChecked(),'do not overwrite an explicit new choice');assert.equal(await page.evaluate(()=>localStorage.getItem('reading-initiative-enabled')),'false');
      await page.reload();await page.locator('#appRail').waitFor();assert.equal(await page.locator('dialog[open]').count(),0,'existing library gets no forced guide');assert.equal((await records(page)).length,2);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(errors.length,0,errors.join(';'));await context.close();console.log('PASS optional onboarding, import state/selection/cancel/partial failure, sample reuse/no automatic AI/pref restoration '+width);
    }
    const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('**/api/companion',r=>r.fulfill({status:503,body:'{}'}));await page.goto(base);await page.locator('#firstImport').waitFor();
    const original='这是读者自己导入的同名书，绝不能当作内置试读复用。';await page.locator('#file').setInputFiles(book(sampleName,original));await complete(page);await page.locator('#confirmImport').click();
    await guide(page);await page.locator('#guideSample').click();await ready(page);const both=await records(page);assert.equal(both.length,2);assert(both.some(b=>b.text===original&&!b.sample));assert.equal(both.filter(b=>b.sample).length,1);
    await page.locator('#backToLibrary').click();await page.locator('#file').setInputFiles(book(sampleName,'另一份独立副本'));assert((await page.locator('#importList').innerText()).includes('已有同名书'));await complete(page);await page.locator('#confirmImport').click();assert.equal((await records(page)).length,3,'same name may import as an independent copy');assert((await records(page)).some(b=>b.text===original));await page.close();console.log('PASS same-name user source preserved; only owned sample reused; independent re-import permitted');
  }finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
})().catch(e=>{console.error(e);process.exitCode=1});
