const ready=page=>page.waitForFunction(()=>{
 if(document.querySelector('#reading')?.getAttribute('aria-busy')==='true')return false;
 const text=document.querySelector('#txt'),view=document.querySelector('foliate-view');
 return text&&!text.classList.contains('hidden')&&text.textContent.length>0||view?.renderer||document.querySelector('#pdfTextLayer span');
});
// Move the real reading viewport near an offset. No hidden manual-marker API.
async function scrollNear(page,offset){
 await page.locator('#readerWrap').evaluate((wrap,offset)=>{
   const root=document.querySelector('#txt'),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,n=offset;
   while(node=walker.nextNode()){
     if(n<=node.length){const r=document.createRange(),at=Math.max(0,Math.min(node.length-1,n));r.setStart(node,at);r.setEnd(node,Math.min(at+1,node.length));const rect=r.getBoundingClientRect();wrap.scrollTop+=rect.bottom-wrap.getBoundingClientRect().bottom+2;wrap.dispatchEvent(new Event('scroll'));return}
     n-=node.length;
   }
   wrap.scrollTop=wrap.scrollHeight;wrap.dispatchEvent(new Event('scroll'));
 },offset);
 await page.waitForTimeout(50);
}
const browserExecutable=()=>[process.env.ONEPAGE_TEST_BROWSER,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(p=>require('node:fs').existsSync(p));
async function readerControls(page){
 if(!await page.locator('body').evaluate(el=>el.classList.contains('reader-controls'))){const bounds=await page.locator('#readerWrap').boundingBox();if(!bounds)throw Error('Reader is not visible');await page.mouse.click(bounds.x+bounds.width/2,bounds.y+Math.min(140,bounds.height/2))}
 await page.locator('#readerDock').waitFor({state:'visible'});
}
async function importIntoReader(page,files){
 await page.locator('#file').setInputFiles(files);
 await page.locator('#confirmImport').click();
 await page.waitForFunction(()=>document.getElementById('confirmImport').textContent==='好');
 const result=await page.locator('#importStatus').innerText();if(!result.startsWith('已导入 1 本书'))throw Error(result);
 await page.locator('#confirmImport').click();
 await page.locator('.library-book').first().click();await ready(page);await readerControls(page);
}
module.exports={ready,scrollNear,browserExecutable,readerControls,importIntoReader};
