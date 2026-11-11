const ready=page=>page.waitForFunction(()=>{
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
module.exports={ready,scrollNear};
