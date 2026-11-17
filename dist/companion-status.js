// Human-readable companion feedback. It never starts a request on its own.
export function createCompanionStatus(hooks) {
  const $=id=>document.getElementById(id),button=$('companionToggle');
  const name=document.createElement('span');name.id='companionNameLabel';name.textContent=hooks.name();
  const label=document.createElement('span');label.id='companionStateLabel';label.setAttribute('aria-hidden','true');
  button.replaceChildren(name,label);button.classList.add('companion-status-trigger');
  const row=document.createElement('section');row.id='companionReadiness';row.className='companion-readiness';
  row.setAttribute('aria-label','伴读状态');
  row.innerHTML='<div class="companion-readiness-copy"><b id="companionReadinessTitle"></b><p id="companionReadinessMessage" role="status" aria-live="polite"></p></div><div class="companion-readiness-actions"><button type="button" id="companionStateAction"></button><button type="button" id="clearCompanionDraft" hidden>清空草稿</button></div><small id="companionConsent">开启后会向所选AI发送预备区间，其中可能含未读文字。</small>';
  $('companion').querySelector('.companion-head').after(row);
  let stage='off',manualFailure=false,preparationFailure=false,unreadReply=false,last=null;
  const copy={
    unconfigured:['未连接','先连接阅读伙伴','填写你自己的AI服务后，就可以边读边聊。','设置AI'],
    off:['未开启','想听听我的想法吗','开启自动伴读后，我会先准备短评，读到对应位置再说。','开启伴读'],
    preparing:['准备中','正在提前准备短评','你照常往下读；准备好、读到对应位置后就会出现。','暂停伴读'],
    ready:['等你读','有一句想法，等你读到这里','不用停下来等我，也不用专门回复。','暂停伴读'],
    speaking:['有短评','刚刚留了一句话','点那条短评可以接着聊，也可以继续读。','暂停伴读'],
    waiting:['陪你读','你继续读，我在旁边','下一段有合适的细节，我会接着说。','暂停伴读'],
    quiet:['陪你读','这一段暂时没有补充','不硬找话说；下一段有合适的细节再聊。','暂停伴读'],
    paused:['暂缓','自动短评暂缓','选字、调整设置或编辑消息时，先把这一刻留给你。','返回阅读'],
    draft:['有草稿','草稿还在，先不打断你','发送或清空草稿后，自动伴读才会继续。','继续编辑'],
    context:['整理中','正在整理已读内容','长书首次可能需要一些时间，可以随时取消。','取消整理'],
    responding:['回复中','正在接你的话','你可以取消，也可以先返回阅读，稍后再来看。','取消回复'],
    'reply-ready':['有回复','回复已经到了','已经留在这本书的对话里。','查看回复'],
    'reply-error':['未完成','这次回复没有完成','保留了当前位置和问题，可以再试一次。','重试回复'],
    error:['待重试','短评这次没准备好','原书和阅读记录都在；可以重新准备一次。','重新准备'],
  };
  function current(){
    if(hooks.busy())return hooks.replying()?'responding':'context';
    if(!hooks.available())return 'unconfigured';
    if(manualFailure)return 'reply-error';
    if(unreadReply)return 'reply-ready';
    if(hooks.draft())return 'draft';
    if(!hooks.enabled())return 'off';
    if(preparationFailure)return 'error';
    return copy[stage]?stage:'waiting';
  }
  function render(){
    const state=current(),[short,title,baseMessage,action]=copy[state];
    const message=state==='draft'&&!hooks.enabled()?'这条消息还没有发送，可以继续编辑或清空。':state==='unconfigured'&&hooks.draft()?'草稿留在当前会话中，连接AI后就可以发送。':baseMessage;
    const signature=state+'|'+message;
    if(last!==signature){
      label.textContent=short;row.dataset.state=state;button.dataset.companionState=state;
      $('companionReadinessTitle').textContent=title;$('companionReadinessMessage').textContent=message;
      $('companionStateAction').textContent=action;$('clearCompanionDraft').hidden=state!=='draft';
      $('companionConsent').hidden=!['off','unconfigured'].includes(state);last=signature;
    }
    const description=hooks.name()+'，'+short+'。'+message;
    if(button.getAttribute('aria-label')!==description)button.setAttribute('aria-label',description);
    if(button.title!==description)button.title=description;
    if(button.getAttribute('aria-description')!==message)button.setAttribute('aria-description',message);
    const disabled=hooks.busy()||!hooks.available()||!hooks.readingReady();
    if($('chatSend').disabled!==disabled)$('chatSend').disabled=disabled;
    return state;
  }
  $('companionStateAction').onclick=()=>{
    const state=current();
    if(state==='unconfigured')hooks.configure();
    else if(state==='off')hooks.toggle(true);
    else if(state==='responding')hooks.cancel();
    else if(state==='context')hooks.cancelContext();
    else if(state==='reply-error')hooks.retryManual();
    else if(state==='error')hooks.retryPreparation();
    else if(state==='draft')hooks.editDraft();
    else if(state==='reply-ready')hooks.openChat();
    else if(state==='paused')hooks.closeChat();
    else hooks.toggle(false);
    render();
  };
  $('clearCompanionDraft').onclick=()=>{hooks.clearDraft();render()};
  document.addEventListener('reading-companion-identity',render);
  document.addEventListener('reading-companion-before-open',()=>{unreadReply=false;render()});
  $('chatInput').addEventListener('input',()=>{manualFailure=false;render()});
  $('chatInput').addEventListener('focus',()=>document.body.classList.add('chat-editing'));
  $('chatInput').addEventListener('blur',()=>document.body.classList.remove('chat-editing'));
  render();
  return {
    update(value){stage=value;if(value==='error')preparationFailure=true;else if(value==='preparing'||value==='off')preparationFailure=false;return render()},
    refresh:render,
    reset(){stage=hooks.enabled()?'waiting':'off';manualFailure=false;preparationFailure=false;unreadReply=false;last=null;render()},
    manualStart(){manualFailure=false;unreadReply=false;render()},
    preparationRetry(){preparationFailure=false;stage='waiting';render()},
    forgetManualFailure(){manualFailure=false;render()},
    manualComplete({success,aborted=false}){manualFailure=!success&&!aborted;unreadReply=success&&!hooks.chatOpen();render()},
    get state(){return current()},
  };
}
