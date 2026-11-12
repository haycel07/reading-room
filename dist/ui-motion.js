const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(max-width:750px), (max-width:1000px) and (max-height:500px)');
const stacked=matchMedia('(max-width: 1099px)');
const motionAllowed=()=>!reduced.matches&&document.documentElement.dataset.motionMode!=='off';
const motionDuration=base=>document.documentElement.dataset.motionMode==='gentle'?Math.round(base*.8):base;
const animations=new WeakMap(),origins=new WeakMap();
const triggers={settings:'toggleSettings',companion:'companionToggle',tocPanel:'tocToggle',scopePanel:'previewScope'};
// Motion 14.12.0 is vendored locally; geometry is owned here, never by the reading DOM.
const running=new Set(),ghosts=new Set(),disclosures=new Map();let lastTrigger=null,bookOpening=null,bookPlace=null,navigating=false;
function play(el,props,{duration=.3,bounce=.04}={}){
 const seconds=document.documentElement.dataset.motionMode==='gentle'?duration*.8:duration;
 const a=window.Motion?.animate?Motion.animate(el,props,{type:'spring',visualDuration:seconds,bounce}):el.animate(Object.fromEntries(Object.entries(props)),{duration:seconds*1000,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
 a.readerElement=el;running.add(a);a.finished.then(()=>running.delete(a),()=>running.delete(a));return a;
}
function clearPose(el){for(const key of ['transform','opacity','transform-origin'])el.style.removeProperty(key)}
function stopPose(el){animations.get(el)?.cancel();animations.delete(el);clearPose(el);delete el.dataset.motionState}
function rect(el){if(!el?.isConnected||!el.getClientRects().length)return null;const r=el.getBoundingClientRect();return r.width>0&&r.height>0?{left:r.left,top:r.top,width:r.width,height:r.height}:null}
function sourceFor(fallback,surface){const candidate=lastTrigger&&performance.now()-lastTrigger.time<1200?lastTrigger.el:document.activeElement;const el=!surface?.contains(candidate)&&rect(candidate)&&candidate.closest?.('button,a')?candidate:fallback;return{el,box:rect(el)}}
function sourceBox(source){return source?.box||rect(source?.el)||{left:innerWidth/2,top:60,width:40,height:40}}
function pose(box,source){const from=sourceBox(source);return{transform:`translate(${from.left+from.width/2-box.left-box.width/2}px,${from.top+from.height/2-box.top-box.height/2}px) scale(${Math.max(.045,Math.min(.5,from.width/box.width))},${Math.max(.045,Math.min(.5,from.height/box.height))})`}}
function morph(el,visible,source,{duration=.3}={}){const box=rect(el);if(!box)return null;const live=rect(source?.el),destination=!visible&&live&&live.top+live.height>0&&live.top<innerHeight?{...source,box:live}:source;const from=pose(box,destination).transform;el.style.transformOrigin='center center';el.dataset.motionSource=source?.el?.id||'source';el.dataset.motionFrom=JSON.stringify(sourceBox(destination));el.dataset.motionTarget=JSON.stringify(box);el.dataset.motionState=visible?'entering':'exiting';return play(el,{transform:visible?[from,'translate(0px,0px) scale(1,1)']:['translate(0px,0px) scale(1,1)',from],opacity:visible?[.08,1]:[1,0]},{duration,bounce:visible?.045:0})}
function removeGhost(el){el.getAnimations({subtree:true}).forEach(a=>a.cancel());ghosts.delete(el);el.remove()}
function settleMotion(){settleDisclosures();cancelBookOpening();for(const a of running){a.cancel();clearPose(a.readerElement)}running.clear();for(const el of ghosts)el.remove();ghosts.clear();for(const el of document.querySelectorAll('.motion-exit'))el.classList.remove('motion-exit');for(const el of document.querySelectorAll('[data-motion-source]')){stopPose(el);el.style.removeProperty('transition');delete el.dataset.motionSource}}
export function cancelBookOpening(){bookOpening?.cancel();bookOpening=null;}
function coverGhost(book,box,direction){const overlay=document.createElement('div');overlay.className='book-opening-overlay';overlay.dataset.direction=direction;overlay.setAttribute('aria-hidden','true');const cover=document.createElement('div');cover.className='book-opening-cover';const leaf=document.createElement('div');leaf.className='book-opening-leaf';leaf.textContent=direction==='open'?book.name.replace(/\.[^.]+$/,''):'';cover.append(leaf);overlay.append(cover);Object.assign(cover.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});document.body.append(overlay);ghosts.add(overlay);return{overlay,cover,leaf}}
export function beginBookOpening(book,origin){
 settleMotion();navigating=true;requestAnimationFrame(()=>navigating=false);const cover=origin?.querySelector?.('.bookicon')||origin,sourceRect=rect(cover);bookPlace={id:book.id,kind:!origin||origin?.closest?.('.continue-card')?'continue':'grid',scroll:window.scrollY,box:sourceRect,width:innerWidth,height:innerHeight};
 if(!motionAllowed())return{finish(){},cancel(){}};
 const from=sourceRect||{left:(innerWidth-130)/2,top:Math.max(65,(innerHeight-180)/2),width:130,height:180};
 const g=coverGhost(book,from,'open');const page=document.getElementById('readerWrap');page.style.opacity='.15';if(rect(cover)){const style=getComputedStyle(cover);g.leaf.style.backgroundColor=style.backgroundColor;g.leaf.style.color=style.color;}g.overlay.dataset.from=JSON.stringify(from);play(g.cover,{opacity:[.65,1]},{duration:.2});
 let active=true;const own={cancel(){active=false;page.style.removeProperty('opacity');removeGhost(g.overlay)},async finish(){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(!active||bookOpening!==own)return;const to=rect(document.getElementById('readerWrap'));if(!to){own.cancel();return}g.overlay.dataset.to=JSON.stringify(to);g.overlay.dataset.state='expanding';
 const transform=`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`;
 play(page,{opacity:[.15,1]},{duration:.32,bounce:0});play(g.leaf,{opacity:[1,0],rotateY:[0,-95]},{duration:.25,bounce:0});const flight=play(g.cover,{transform:['translate(0px,0px) scale(1,1)',transform],opacity:[1,0]},{duration:.4,bounce:.015});
 await flight.finished.catch(()=>{});if(active){own.cancel();if(bookOpening===own)bookOpening=null}}};bookOpening=own;return own;
}
function restoreLibraryPlace(book,place){
 if(place?.id===book.id)window.scrollTo({top:place.scroll,behavior:'instant'});
 const button=document.querySelector('.library-book[data-book-id="'+CSS.escape(book.id)+'"]');const target=place?.kind==='continue'?document.querySelector('#continueCard button'):button?.querySelector('.bookicon');
 const chosen=target||button||document.querySelector('#continueCard button')||document.getElementById('libraryTitle'),box=rect(chosen);
 if(box&&place?.box&&place.width===innerWidth&&place.height===innerHeight)window.scrollBy({top:box.top-place.box.top,behavior:'instant'});const visible=rect(chosen);if(visible&&(visible.top<72||visible.top+visible.height>innerHeight-8))chosen.scrollIntoView({block:'center',behavior:'instant'});return chosen;
}
export function beginBookReturn(book){
 settleMotion();navigating=true;requestAnimationFrame(()=>navigating=false);const place=bookPlace,from=rect(document.getElementById('readerWrap'));
 if(!book||!from)return{finish(){}};if(!motionAllowed()||document.getElementById('reading').getAttribute('aria-busy')==='true')return{finish(){requestAnimationFrame(()=>restoreLibraryPlace(book,place))}};
 const g=coverGhost(book,from,'return');g.overlay.dataset.from=JSON.stringify(from);g.leaf.style.opacity='0';let active=true;
 const own={cancel(){active=false;removeGhost(g.overlay)},async finish(){await new Promise(r=>requestAnimationFrame(r));if(!active||bookOpening!==own)return;
 const chosen=restoreLibraryPlace(book,place),to=rect(chosen);if(!to){own.cancel();return}g.overlay.dataset.to=JSON.stringify(to);g.overlay.dataset.bookId=book.id;
 const transform=`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`;
 const flight=play(g.cover,{transform:['translate(0px,0px) scale(1,1)',transform],opacity:[.9,0]},{duration:.34,bounce:0});await flight.finished.catch(()=>{});if(active){own.cancel();if(bookOpening===own)bookOpening=null;if(!document.body.classList.contains('is-reading'))(chosen.closest('button')||chosen).focus?.({preventScroll:true})}}};bookOpening=own;return own;
}
export function captureLibraryLayout(grid){
 if(!motionAllowed()||!rect(grid))return()=>{};const old=new Map();for(const el of grid.children){if(old.size>=60)break;old.set(el.dataset.bookId,{cover:rect(el.querySelector('.bookicon')),label:rect(el.querySelector('.booklabel'))})}
 return()=>{if(!motionAllowed())return;for(const el of [...grid.children].slice(0,60)){const before=old.get(el.dataset.bookId);if(!before)continue;for(const [key,selector]of [['cover','.bookicon'],['label','.booklabel']]){const target=el.querySelector(selector),from=before[key],to=rect(target);if(!from||!to||to.top>innerHeight||to.top+to.height<0)continue;const dx=from.left-to.left,dy=from.top-to.top,sx=from.width/to.width,sy=from.height/to.height;if(Math.abs(dx)+Math.abs(dy)+Math.abs(1-sx)+Math.abs(1-sy)<.1)continue;stopPose(target);target.style.transformOrigin='top left';target.dataset.motionState='layout';const a=play(target,{transform:[`translate(${dx}px,${dy}px) scale(${sx},${sy})`,'translate(0px,0px) scale(1,1)']},{duration:.32});animations.set(target,a);a.finished.then(()=>{if(animations.get(target)===a)stopPose(target)},()=>{})}}};
}
function initViewport(){
  const root=document.documentElement,wrap=document.getElementById('readerWrap');let frame=0;
  root.dataset.platform=window.OnePageReading?'android':'web';
  const fit=()=>{frame=0;const viewport=window.visualViewport,height=viewport?.height||innerHeight,top=viewport?.offsetTop||0;root.style.setProperty('--viewport-height',height+'px');root.style.setProperty('--viewport-top',top+'px');
    if(!document.body.classList.contains('is-reading')||!wrap.getClientRects().length)return;
    const footer=document.querySelector('.reader-bottom').getBoundingClientRect().height,reserve=document.getElementById('proactiveEnabled').checked?145:0;
    root.style.setProperty('--reader-available-height',Math.max(120,Math.floor(height-Math.max(0,wrap.getBoundingClientRect().top+window.scrollY-top)-footer-reserve-12))+'px');
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(fit)};
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  const observer=new ResizeObserver(schedule);for(const selector of ['header','.reading-top','.initiative-control','.reader-bottom'])observer.observe(document.querySelector(selector));
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});document.getElementById('proactiveEnabled').addEventListener('change',schedule);schedule();
}

export function setPanel(id,visible,{immediate=false,restore=true}={}) {
 if(visible&&['settings','companion','scopePanel','localNotice'].includes(id))cancelBookOpening();
 if(id==='tocPanel'&&document.body.classList.contains('is-reading')){immediate=true;restore=false}
 const el=document.getElementById(id);if(!el||visible===!el.classList.contains('hidden'))return;
 const hadFocus=el.contains(document.activeElement),trigger=document.getElementById(triggers[id]);
 const previousPose=el.getAnimations().length?getComputedStyle(el).transform:null;stopPose(el);el.classList.remove('motion-exit');trigger?.setAttribute('aria-expanded',String(visible));
 if(visible){if(id==='settings')document.dispatchEvent(new CustomEvent('reading-settings-open'));if(id==='settings')setPanel('companion',false,{immediate:true,restore:false});if(id==='companion')setPanel('settings',false,{immediate:true,restore:false});origins.set(el,sourceFor(trigger,el));}
 if(id==='companion'&&visible===el.classList.contains('hidden')){document.dispatchEvent(new Event('reading-companion-layout'));document.body.classList.toggle('companion-docked',visible)}
 el.setAttribute('aria-hidden',String(!visible));el.inert=!visible;
 const instant=immediate||!motionAllowed()||id==='scopePanel'&&!visible;
 if(!visible&&!instant)el.classList.add('motion-exit');el.classList.toggle('hidden',!visible);
 if(id==='settings'&&!visible)document.dispatchEvent(new CustomEvent('reading-settings-close'));
 if(visible){el.querySelector('button')?.focus({preventScroll:true});if(id==='companion'&&stacked.matches)el.scrollIntoView({behavior:'instant',block:'nearest'});}
 if(!instant){const a=morph(el,visible,origins.get(el),{duration:visible?.3:.22});if(a){animations.set(el,a);if(previousPose&&previousPose!=='none'){a.cancel();const to=visible?'translate(0px,0px) scale(1,1)':pose(rect(el),origins.get(el)).transform;const replacement=play(el,{transform:[previousPose,to],opacity:visible?[.6,1]:[1,0]},{duration:.22,bounce:0});animations.set(el,replacement);replacement.finished.then(()=>{if(animations.get(el)===replacement){stopPose(el);el.classList.remove('motion-exit')}},()=>{});}else a.finished.then(()=>{if(animations.get(el)===a){stopPose(el);el.classList.remove('motion-exit')}},()=>{});}}
 else clearPose(el);
 if(!visible&&restore&&hadFocus){const origin=origins.get(el)?.el;const target=origin?.isConnected&&!origin.closest('.hidden')?origin:trigger;target?.focus({preventScroll:!stacked.matches});}
}

export const togglePanel=id=>setPanel(id,document.getElementById(id).classList.contains('hidden'));

export function setShelfOpen(open){
 const shelf=document.querySelector('.sidebar'),trigger=document.getElementById('mobileShelf');if(open===shelf.classList.contains('open'))return;
 const previousPose=shelf.getAnimations().length?getComputedStyle(shelf).transform:null;stopPose(shelf);shelf.classList.remove('motion-exit');shelf.style.transition='none';if(open)origins.set(shelf,{el:trigger,box:rect(trigger)});else if(motionAllowed()&&mobile.matches)shelf.classList.add('motion-exit');
 shelf.classList.toggle('open',open);document.body.classList.toggle('shelf-open',open);trigger.setAttribute('aria-expanded',String(open));document.dispatchEvent(new CustomEvent('reading-sidebar-change',{detail:{open}}));
 shelf.inert=!open;shelf.setAttribute('aria-hidden',String(!open));document.querySelector('main').inert=open;
 if(motionAllowed()){let a=morph(shelf,open,origins.get(shelf)||{el:trigger,box:rect(trigger)},{duration:open?.3:.22});if(a){if(previousPose&&previousPose!=='none'){a.cancel();a=play(shelf,{transform:[previousPose,open?'translate(0px,0px) scale(1,1)':pose(rect(shelf),origins.get(shelf)).transform],opacity:open?[.6,1]:[1,0]},{duration:.22,bounce:0})}animations.set(shelf,a);a.finished.then(()=>{if(animations.get(shelf)===a){stopPose(shelf);shelf.classList.remove('motion-exit');requestAnimationFrame(()=>shelf.style.removeProperty('transition'))}},()=>{});}}
 else{shelf.classList.remove('motion-exit');shelf.style.removeProperty('transition');}
 if(open)document.getElementById(document.body.classList.contains('is-reading')?'tocClose':'closeShelf').focus({preventScroll:true});else if(mobile.matches)trigger.focus({preventScroll:true});
}
export function stopSurfaceMotion(el){stopPose(el)}
export function animateSelectionTools(box){const el=document.getElementById('selectionTools');stopPose(el);if(!motionAllowed())return;const a=morph(el,true,{box},{duration:.18});if(a){el.dataset.motionSource='selection';animations.set(el,a);a.finished.then(()=>{if(animations.get(el)===a)stopPose(el)},()=>{})}}
function settleDisclosures(){for(const [detail,rec]of disclosures){rec.a.cancel();detail.open=rec.target;rec.body.inert=false;for(const key of ['height','overflow','opacity'])rec.body.style.removeProperty(key)}disclosures.clear()}
function initDisclosures(){
 document.addEventListener('reading-outline-reveal',settleDisclosures);
 document.addEventListener('click',event=>{const summary=event.target.closest?.('summary'),detail=summary?.parentElement;if(event.defaultPrevented||!detail?.matches('.catalog-branch,.catalog-text-group,.mind-map-tree details')||event.target.closest('button')||!motionAllowed())return;
 event.preventDefault();const pending=disclosures.get(detail),target=!(pending?pending.target:detail.open);let body=detail.querySelector(':scope > .disclosure-body,:scope > .catalog-children');if(!body){body=document.createElement('div');body.className='disclosure-body';while(summary.nextSibling)body.append(summary.nextSibling);detail.append(body)}
 const start=detail.open?body.getBoundingClientRect().height:0;pending?.a.cancel();detail.open=true;body.style.height='auto';const end=target?body.scrollHeight:0;body.style.overflow='hidden';body.inert=!target;
 const a=play(body,{height:[start+'px',end+'px'],opacity:target?[.45,1]:[1,0]},{duration:.22,bounce:0});const rec={a,body,target};disclosures.set(detail,rec);a.finished.then(()=>{if(disclosures.get(detail)!==rec)return;detail.open=target;body.inert=false;for(const key of ['height','overflow','opacity'])body.style.removeProperty(key);disclosures.delete(detail)},()=>{});
 });
}
function initDialogs(){
 const wired=new WeakSet(),defaults={readerTools:'readerToolsToggle',readingStats:'statsToggle',dataTools:'dataToolsToggle',notesDialog:'notesToggle',noteDialog:'noteSelection',organizeLibrary:'aiOrganizeToggle'};
 const wire=d=>{if(wired.has(d))return;wired.add(d);d.dataset.sharedDialog='true';const show=d.showModal.bind(d),close=d.close.bind(d);let source=null,closingGhost=null;
 const enter=()=>{source=sourceFor(document.getElementById(defaults[d.id]),d);if(motionAllowed()){const a=morph(d,true,source,{duration:.3});if(a){animations.set(d,a);a.finished.then(()=>{if(animations.get(d)===a)stopPose(d)},()=>{})}}};
 d.showModal=function(){if(closingGhost){removeGhost(closingGhost);closingGhost=null}cancelBookOpening();stopPose(d);const result=show();enter();return result};
 d.close=function(value){const box=d.open?rect(d):null;stopPose(d);const result=close(value);if(box&&motionAllowed()&&!navigating){const g=document.createElement('div');g.className='dialog-return-ghost';closingGhost=g;g.setAttribute('aria-hidden','true');Object.assign(g.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});document.body.append(g);ghosts.add(g);const a=morph(g,false,source,{duration:.22});if(a)a.finished.then(()=>removeGhost(g),()=>removeGhost(g));else removeGhost(g)}return result};
 d.addEventListener('cancel',e=>{if(e.defaultPrevented)return;e.preventDefault();d.close()});if(d.open)enter();
 };
 document.querySelectorAll('dialog').forEach(wire);new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes){if(node.nodeType!==1)continue;if(node.matches('dialog'))wire(node);node.querySelectorAll('dialog').forEach(wire)}}).observe(document.body,{childList:true});
}

export function initMotion() {
  initViewport();initDialogs();initDisclosures();
  document.addEventListener('click',event=>{const el=event.target.closest?.('button,a');if(el)lastTrigger={el,time:performance.now()}},true);
  window.addEventListener('resize',settleMotion);
  for(const id of ['settings','companion','tocPanel','scopePanel','localNotice']) {
    const el=document.getElementById(id);el.inert=el.classList.contains('hidden');
    el.setAttribute('aria-hidden',String(el.inert));
    el.setAttribute('role','region');
    el.setAttribute('aria-label',({settings:'阅读设置',companion:'阅读助手',tocPanel:'书籍目录',scopePanel:'发送内容预览',localNotice:'配置AI服务'})[id]);
    const trigger=document.getElementById(triggers[id]);
    trigger?.setAttribute('aria-controls',id);trigger?.setAttribute('aria-expanded',String(!el.inert));
  }
  function shelfSize(){
    const shelf=document.querySelector('.sidebar');
    stopPose(shelf);shelf.style.removeProperty('transition');shelf.classList.remove('motion-exit');
    if(!mobile.matches){shelf.classList.remove('open');document.body.classList.remove('shelf-open');document.querySelector('main').inert=false;document.getElementById('mobileShelf').setAttribute('aria-expanded','false')}
    shelf.inert=!shelf.classList.contains('open');shelf.setAttribute('aria-hidden',String(shelf.inert));
  }
  shelfSize();mobile.addEventListener('change',shelfSize);
  document.getElementById('shelfScrim').onclick=()=>setShelfOpen(false);
  document.addEventListener('keydown',e=>{
    // Native dialogs handle their own Escape and focus trap.
    if(document.querySelector('dialog[open]')||e.defaultPrevented)return;
    if(e.key==='Escape') {
      const id=['scopePanel','settings','tocPanel','companion','localNotice'].find(id=>!(id==='tocPanel'&&document.body.classList.contains('is-reading'))&&!document.getElementById(id).classList.contains('hidden'));
      if(id)setPanel(id,false);
    }
    if(e.key==='Tab'&&document.body.classList.contains('shelf-open')) {
      const controls=[...document.querySelector('.sidebar').querySelectorAll('button:not(:disabled),a[href],input:not([type=hidden])')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
    }
  });
  reduced.addEventListener('change',()=>{
    if(reduced.matches){settleMotion();document.getAnimations().forEach(a=>a.cancel());for(const el of document.querySelectorAll('.motion-exit'))el.classList.remove('motion-exit')}
  });
  document.addEventListener('reading-motion-change',()=>{if(!motionAllowed()){settleMotion();document.getAnimations().forEach(a=>a.cancel());document.querySelectorAll('.motion-exit,.touch-ripple').forEach(el=>el.classList.contains('touch-ripple')?el.remove():el.classList.remove('motion-exit'))}});
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest('button');if(!button||button.id==='shelfScrim'||button.disabled||!motionAllowed()||event.button!==0||button.closest('dialog')||button.classList.contains('library-book'))return;
    const a=play(button,{opacity:[.78,1]},{duration:.16,bounce:0});a.finished.then(()=>a.cancel(),()=>{});
  });
  const status=document.getElementById('status');let statusSignature='';new MutationObserver(()=>{const signature=status.style.display+'|'+status.textContent;if(signature===statusSignature)return;statusSignature=signature;stopPose(status);if(status.style.display!=='none'&&motionAllowed()){const a=play(status,{opacity:[.35,1],transform:['translateY(9px)','translateY(0px)']},{duration:.18,bounce:0});animations.set(status,a);a.finished.then(()=>{if(animations.get(status)===a)stopPose(status)},()=>{})}}).observe(status,{attributes:true,attributeFilter:['style'],childList:true});
  const intro=document.getElementById('initiativeCard');
  new MutationObserver(changes=>{
    if(changes.some(c=>c.attributeName==='class')&&!intro.classList.contains('hidden')&&motionAllowed()){
      stopPose(intro);const a=play(intro,{opacity:[0,1],transform:['translateY(-6px) scale(.98)','translateY(0) scale(1)']},{duration:.2,bounce:0});animations.set(intro,a);a.finished.then(()=>{if(animations.get(intro)===a)stopPose(intro)},()=>{});
    }
    if(intro.classList.contains('hidden')){stopPose(intro);intro.getAnimations().forEach(a=>a.cancel())}
  }).observe(intro,{attributes:true,attributeFilter:['class']});
}
