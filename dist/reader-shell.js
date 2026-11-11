import {setPanel,setShelfOpen} from './ui-motion.js';
const $=id=>document.getElementById(id);

export function initReaderShell({home,seek,progress,catalog,notify}) {
 const sidebar=document.querySelector('.sidebar'),panel=$('tocPanel');
 const readingSidebar=document.createElement('section');readingSidebar.id='readingSidebar';readingSidebar.setAttribute('aria-label','目录与阅读进度');
 const rail=document.createElement('div');rail.id='readingProgressRail';rail.innerHTML='<span class="rail-start" aria-hidden="true">始</span><div class="reading-rail-track"><span id="readingProgressFill"></span><input id="readingProgressSlider" type="range" min="0" max="1000" step="1" value="0" aria-label="阅读位置，竖向进度导航"></div><output id="readingProgressValue" for="readingProgressSlider">0%</output>';
 readingSidebar.append(panel,rail);sidebar.append(readingSidebar);
 $('readingProgressSlider').setAttribute('aria-orientation','vertical');
 const back=document.createElement('button');back.id='backToLibrary';back.type='button';back.className='back-library-button';back.innerHTML='<span aria-hidden="true">‹</span> 书架';back.onclick=home;
 document.querySelector('.crumb').before(back);
 const titleButton=$('libraryTitle');if(titleButton)titleButton.onclick=()=>{home();$('librarySearch').value='';$('shelfSearch').value='';$('libraryFilter').value='all';$('libraryGroup').value='';$('librarySearch').dispatchEvent(new Event('input'));notify('已显示全部书籍')};
 $('brandHome')?.addEventListener('click',home);
 let scrubbing=false;
 const update=value=>{
  const p=Math.max(0,Math.min(1,Number(value)||0));
  if(!scrubbing)$('readingProgressSlider').value=String(Math.round(p*1000));
  $('readingProgressFill').style.height=(p*100)+'%';
  $('readingProgressValue').textContent=Math.round(p*100)+'%';
  $('readingProgressSlider').setAttribute('aria-valuetext','已读位置 '+Math.round(p*100)+'%');
 };
 $('readingProgressSlider').oninput=e=>{scrubbing=true;update(Number(e.target.value)/1000)};
 $('readingProgressSlider').onchange=async e=>{try{await seek(Number(e.target.value)/1000)}catch{notify('位置跳转未完成，请重试')}finally{scrubbing=false;update(progress())}};
 $('readingProgressSlider').addEventListener('keydown',event=>{
  const delta={ArrowUp:-10,ArrowDown:10,ArrowLeft:-10,ArrowRight:10,PageUp:-100,PageDown:100}[event.key];
  if(delta===undefined&&!['Home','End'].includes(event.key))return;
  event.preventDefault();const slider=$('readingProgressSlider');slider.value=event.key==='Home'?'0':event.key==='End'?'1000':String(Number(slider.value)+delta);slider.dispatchEvent(new Event('input'));slider.dispatchEvent(new Event('change'));
 });
 $('tocToggle').onclick=()=>{
  if(matchMedia('(max-width:750px), (max-width:1000px) and (max-height:500px)').matches)setShelfOpen(!sidebar.classList.contains('open'));
  else{catalog.current();$('tocSearch').focus({preventScroll:true})}
 };
 $('tocClose').onclick=()=>setShelfOpen(false);
 const observer=new MutationObserver(()=>{
  if(document.body.classList.contains('is-reading')){
   panel.classList.remove('hidden');panel.inert=false;panel.setAttribute('aria-hidden','false');$('tocToggle').setAttribute('aria-expanded','true');
   $('mobileShelf').setAttribute('aria-label','打开目录');$('mobileShelf').textContent='目录';
  }else{$('mobileShelf').setAttribute('aria-label','打开书架');$('mobileShelf').textContent='书架'}
 });observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',()=>{if(!matchMedia('(max-width:750px), (max-width:1000px) and (max-height:500px)').matches)setShelfOpen(false)});
 update(progress());
 return {update};
}
