// Reading position belongs to the reading session, not to an animation callback.
export function createCompanionSession(hooks) {
  installTouchActivation();
  const media=matchMedia('(max-width:900px), (orientation:portrait)');
  const panel=document.getElementById('companion');
  let checkpoint=null,open=false,revision=0,skipReturn=false,intent=null;
  const covered=()=>open&&media.matches;
  function syncPresentation(){
    document.body.classList.toggle('companion-screen',covered());
    // Keep this compatibility class visual-only; every compact entry uses it.
    document.body.classList.toggle('bubble-chat',covered());
    document.body.classList.toggle('companion-tight',covered()&&(window.visualViewport?.height||innerHeight)<500);
    panel.setAttribute('role',covered()?'dialog':'region');
    if(covered())panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');
    const reading=document.getElementById('reading'),header=document.querySelector('header');
    reading.inert=covered();header.inert=covered();
  }
  function begin(){
    revision++;skipReturn=false;intent=null;
    if(!open)checkpoint=hooks.capture();
    open=true;syncPresentation();hooks.onOpen?.(checkpoint);
  }
  function end(){
    if(!open)return;
    const saved=checkpoint,token=++revision;open=false;syncPresentation();
    checkpoint=null;intent=null;
    if(saved&&!skipReturn){
      Promise.resolve(hooks.restore(saved,()=>token===revision&&!open)).catch(error=>hooks.onError?.(error));
    }
    hooks.onClose?.(saved);skipReturn=false;
  }
  function navigation(){
    if(!open){revision++;return}
    // An explicit reference jump takes precedence over returning to the old page.
    skipReturn=true;if(!covered())intent={pending:true,until:performance.now()+750};
  }
  function refreshAfterReading(){
    if(open&&acceptReadingEvent()){checkpoint=hooks.capture(true);skipReturn=false;if(intent)intent.pending=false}
  }
  function acceptReadingEvent(){return !open||!covered()&&!!intent&&performance.now()<intent.until}
  function trap(event){
    if(!covered()||event.key!=='Tab'||document.querySelector('dialog[open]'))return;
    const scope=document.getElementById('scopePanel'),activePanel=scope&&!scope.classList.contains('hidden')?scope:panel;
    const items=[...activePanel.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')]
      .filter(el=>(typeof el.checkVisibility==='function'?el.checkVisibility({checkVisibilityCSS:true}):el.getClientRects().length>0&&getComputedStyle(el).visibility==='visible')&&!el.closest('[inert]'));
    if(!items.length){event.preventDefault();activePanel.tabIndex=-1;activePanel.focus();return}
    const first=items[0],last=items.at(-1),active=document.activeElement;
    if(event.shiftKey&&(active===first||!activePanel.contains(active))){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&(active===last||!activePanel.contains(active))){event.preventDefault();first.focus()}
  }
  document.addEventListener('reading-companion-before-open',begin);
  document.addEventListener('reading-companion-closed',end);
  document.addEventListener('keydown',trap);
  media.addEventListener('change',()=>{intent=null;if(open){syncPresentation();hooks.onPresentation?.(checkpoint)}});
  const resize=()=>{intent=null;syncPresentation()};
  addEventListener('resize',resize);
  window.visualViewport?.addEventListener('resize',resize);
  return {
    covered,
    get checkpoint(){return checkpoint},
    get open(){return open},
    navigation,
    refreshAfterReading,
    refreshAfterNavigation(){if(open&&!covered()){checkpoint=hooks.capture(true);skipReturn=false;intent=null}},
    input(){if(!open)revision++;else if(!covered())intent={pending:true,until:performance.now()+750}},
    acceptReadingEvent,
    reset(){revision++;skipReturn=true;end();checkpoint=null},
  };
}

// A tap on a fixed control can stop a mobile fling without producing `click`.
// Activate only a completed, stationary touch; never steal a drag or long press.
function installTouchActivation(){
  const selector='#initiativeReply,#initiativeDismiss,#companionToggle,#companionClose,#chatSend,#previewScope,#scopeClose,#companionStateAction,#clearCompanionDraft';
  let touch=null,last=null;
  document.addEventListener('pointerdown',event=>{
    last=null;
    if(event.pointerType!=='touch'){touch=null;return}
    const button=event.target.closest?.(selector);
    touch=event.isPrimary&&button&&!button.disabled?{button,id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()}:null;
  },true);
  document.addEventListener('pointermove',event=>{if(touch&&event.pointerId===touch.id&&Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>10)touch=null},true);
  document.addEventListener('pointercancel',()=>touch=null,true);
  document.addEventListener('contextmenu',()=>touch=null,true);
  document.addEventListener('pointerup',event=>{
    const saved=touch;touch=null;
    if(!saved||event.pointerId!==saved.id||performance.now()-saved.time>650||Math.hypot(event.clientX-saved.x,event.clientY-saved.y)>10||saved.button.disabled||!saved.button.isConnected||saved.button.closest('.hidden'))return;
    last={...saved,until:performance.now()+700};
    if(event.cancelable)event.preventDefault();
    saved.button.click();
  },true);
  document.addEventListener('click',event=>{
    const compatibilityTouch=event.isTrusted&&(event.pointerType==='touch'||!('pointerType'in event)&&event.detail>0);
    if(last&&compatibilityTouch&&performance.now()<last.until&&(event.target.closest?.(selector)===last.button||Math.hypot(event.clientX-last.x,event.clientY-last.y)<12)){event.preventDefault();event.stopImmediatePropagation()}
  },true);
}
