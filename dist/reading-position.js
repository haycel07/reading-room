// Exact UTF-16 boundary, measured in source order rather than scroll percentage.
// Plain TXT has monotone lines; rich documents use conservative prefix bounds.
export function visibleTextOffset(root, bottom) {
  const doc=root.ownerDocument,walker=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const range=doc.createRange(),plain=!root.classList.contains('structured');
  const boundsAt=(node,end)=>{
    range.setStart(node,plain?end-1:0);range.setEnd(node,end);
    let rect=range.getBoundingClientRect();
    // Non-rendering characters cannot prove that an earlier prefix was seen.
    if(plain&&!rect.height){range.setStart(node,0);rect=range.getBoundingClientRect()}
    return rect;
  };
  let node,offset=0;
  while(node=walker.nextNode()) {
    const length=node.length;if(!length)continue;
    const bounds=boundsAt(node,length);
    if(!bounds.height||bounds.bottom<=bottom+1){offset+=length;continue}
    let low=0,high=length;
    while(low<high){
      const mid=Math.ceil((low+high)/2),rect=boundsAt(node,mid);
      if(rect.height&&rect.bottom>bottom+1)high=mid-1;else low=mid;
    }
    return offset+low;
  }
  return offset;
}
