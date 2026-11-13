// Original implementation; chapter grouping is presentation-only, source text is untouched.
export function chapterInfo(raw) {
 const label=raw.trim().replace(/^#{1,6}\s+/, '');
 const m=label.match(/^((?:第[零〇一二三四五六七八九十百千万两\d]+[章节回卷部篇集]|chapter\s+\d+)\s*.*?)[（(](\d+)[）)]\s*$/i);
 return {label,group:m?m[1].trim():null,part:m?Number(m[2]):null};
}
export const isChapter=line=>/^(?:#{1,6}\s+\S.{0,80}|第[零〇一二三四五六七八九十百千万两\d]+[章节回卷部篇集].{0,60}|(?:序章|序言|前言|楔子|引子|后记|尾声|番外|附录)(?:[\s：:·—（(-].{0,50})?|chapter\s+\d+\b.{0,60})$/i.test(line.trim());
export function createCatalog({list,search,count}) {
 let entries=[],active=-1,stack=[],lastGroup=null,lastManualScroll=0;
 const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.motionMode!=='off';
 function ensureBranch(entry){
  if(entry.branch)return entry.branch;
  const detail=document.createElement('details');detail.className='catalog-branch';detail.open=true;
  const summary=document.createElement('summary'),content=document.createElement('div');content.className='catalog-children';
  entry.button.before(detail);summary.append(entry.button);detail.append(summary,content);entry.branch=detail;entry.childrenHost=content;return detail;
 }
 function refresh(){
  const q=search.value.trim().toLocaleLowerCase();let matched=0;
  for(const entry of entries){entry.match=!q||entry.label.toLocaleLowerCase().includes(q);if(entry.match)matched++}
  const childMap=new Map(),memo=new Map();for(const entry of entries){if(!childMap.has(entry.parent))childMap.set(entry.parent,[]);childMap.get(entry.parent).push(entry)}
  const visible=entry=>{if(memo.has(entry))return memo.get(entry);const value=entry.match||(childMap.get(entry)||[]).some(visible);memo.set(entry,value);return value};
  for(const entry of entries){const show=visible(entry);(entry.branch||entry.button).hidden=!show;entry.button.hidden=!show;entry.button.classList.toggle('catalog-context',!entry.match&&show);if(q&&entry.branch&&show)entry.branch.open=true}
  for(const group of list.querySelectorAll('.catalog-text-group')){group.hidden=![...group.querySelectorAll('button')].some(b=>!b.hidden);if(q)group.open=true}
  count.textContent=q?`${matched} / ${entries.length} 处`:`${entries.length} 处`;list.classList.toggle('no-results',!!q&&!matched);
 }
 function reveal(entry,animate=true){
  if(!entry)return;document.dispatchEvent(new CustomEvent('reading-outline-reveal'));
  for(let ancestor=entry.parent;ancestor;ancestor=ancestor.parent)if(ancestor.branch)ancestor.branch.open=true;
  if(entry.group)entry.group.open=true;
  if(!list.getClientRects().length)return;
  const rect=entry.button.getBoundingClientRect(),bounds=list.getBoundingClientRect();
  const top=list.scrollTop+rect.top-bounds.top-(list.clientHeight-rect.height)/2;
  list.scrollTo({top:Math.max(0,top),behavior:animate&&motion()?'smooth':'instant'});
 }
 search.addEventListener('input',refresh);
 list.addEventListener('wheel',()=>lastManualScroll=Date.now(),{passive:true});list.addEventListener('touchstart',()=>lastManualScroll=Date.now(),{passive:true});
 return {
  reset(){entries=[];active=-1;stack=[];lastGroup=null;list.replaceChildren();search.value='';refresh()},
  add(raw,action,depth=0,target=null){
   const {label,group,part}=chapterInfo(raw),button=document.createElement('button');button.type='button';button.textContent=part?`分段 ${part} · ${label}`:label;button.title=label;
   const parent=[...stack].reverse().find(e=>e.depth<depth)||null;
   let host=parent?(ensureBranch(parent),parent.childrenHost):list,textGroup=null;
   if(group){
    if(!lastGroup||lastGroup.name!==group||lastGroup.parent!==parent){const detail=document.createElement('details');detail.className='catalog-text-group';detail.open=true;const summary=document.createElement('summary');summary.textContent=group;detail.append(summary);host.append(detail);lastGroup={name:group,parent,detail}}
    textGroup=lastGroup.detail;host=textGroup;
   }else lastGroup=null;
   const entry={button,label,action,target,depth,parent,group:textGroup};
   button.onclick=event=>{event.preventDefault();event.stopPropagation();action();this.activate(entries.indexOf(entry))};
   entries.push(entry);stack=stack.filter(e=>e.depth<depth);stack.push(entry);host.append(button);if(search.value)refresh();else count.textContent=entries.length+' 处';return button;
  },
  activate(i){
   if(i<0||i>=entries.length||i===active)return;const changed=true;active=i;
   entries.forEach((e,j)=>{e.button.classList.toggle('current',j===i);if(j===i)e.button.setAttribute('aria-current','location');else e.button.removeAttribute('aria-current')});
   if(changed&&!search.value&&Date.now()-lastManualScroll>700)requestAnimationFrame(()=>reveal(entries[i],true));
  },
  track(wrap){let i=-1;const top=wrap.getBoundingClientRect().top+70;entries.forEach((e,j)=>{if(e.target?.isConnected&&e.target.getBoundingClientRect().top<=top)i=j});if(i>=0)this.activate(i)},
  current(){reveal(entries[active]||entries[0])},
  step(delta){const i=Math.max(0,Math.min(entries.length-1,active<0?0:active+delta));entries[i]?.button.click()},
  get entries(){return entries}
 };
}
