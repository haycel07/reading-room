const DEFAULT_NAME='栞';
export function assistantName(){const name=localStorage.getItem('companion-display-name');return typeof name==='string'&&name.trim()&&name.trim().length<=12?name.trim():DEFAULT_NAME}
export function applyAssistantIdentity(){
 const name=assistantName();
 for(const selector of ['.companion-head b','.initiative-heading b']){const el=document.querySelector(selector);if(el)el.textContent=name}
 const labels={companionToggle:name,editCompanion:'伴读设定',initiativeCard:name+'的阅读短评',companion:'与'+name+'聊天',chatInput:'和'+name+'说话',initiativeDismiss:'收起这句话'};
 for(const [id,text]of Object.entries(labels)){const el=document.getElementById(id);if(!el)continue;if(['initiativeCard','companion','chatInput','initiativeDismiss'].includes(id))el.setAttribute('aria-label',text);else el.textContent=text}
 document.querySelector('.companion-head .avatar').textContent=name.slice(0,1);
 document.querySelector('.scope-heading b').textContent=name+'能看到什么';
 document.querySelector('label[for="companionPrompt"]').textContent='人物提示词';
 document.querySelector('label[for="persona"]').textContent='对话风格';
 const field=document.getElementById('assistantName');if(field)field.value=name;
}
