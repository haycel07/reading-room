// Reading paper/ink pairs are independent of the library's application palette.
export const READING_THEMES = Object.freeze({
  white: {name:'白色', paper:'#ffffff', ink:'#303630'},
  cream: {name:'纸白', paper:'#fbfbf3', ink:'#343434'},
  sage: {name:'青叶', paper:'#e7eee5', ink:'#2d3d32'},
  sepia: {name:'旧纸', paper:'#efe2c9', ink:'#493b2b'},
  dark: {name:'夜读', paper:'#202227', ink:'#e2e3dd'},
});
const KEY='reading-color-prefs';
const hex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export function luminance(color) {
  const channels=color.slice(1).match(/../g).map(c=>{
    const v=parseInt(c,16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
  });
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
export function contrastRatio(a,b) {
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function validPair(pair) {
  return !!pair&&hex(pair.paper)&&hex(pair.ink)&&contrastRatio(pair.paper,pair.ink)>=4.5;
}
const mix=(a,b,weight)=>'#'+a.slice(1).match(/../g).map((v,i)=>Math.round(parseInt(v,16)*(1-weight)+parseInt(b.slice(1).match(/../g)[i],16)*weight).toString(16).padStart(2,'0')).join('');
export function readingPalette(pair) {
  const dark=luminance(pair.paper)<.18,flat=contrastRatio(pair.paper,pair.ink)<7;
  const surface=flat?pair.paper:mix(pair.paper,pair.ink,.03),raised=flat?pair.paper:mix(pair.paper,pair.ink,.07);
  let muted=mix(pair.ink,pair.paper,.24),accent=dark?'#b8d1ee':'#3b6088';
  if([surface,raised,pair.paper].some(bg=>contrastRatio(bg,muted)<4.5))muted=pair.ink;
  if([surface,raised,pair.paper].some(bg=>contrastRatio(bg,accent)<4.5))accent=pair.ink;
  const onAccent=contrastRatio(accent,'#ffffff')>=4.5?'#ffffff':'#202227';
  return {dark,surface,raised,muted,accent,onAccent,selected:flat?pair.paper:mix(pair.paper,accent,.16)};
}
export function initReadingAppearance({initialTheme='white',onChange}) {
  let stored={};try{stored=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
  const custom=validPair(stored.custom)?stored.custom:{paper:'#f0eee7',ink:'#36342e'};
  const state={mode:stored.mode==='system'?'system':'manual',manual:(READING_THEMES[initialTheme]||initialTheme==='custom')?initialTheme:'white',custom};
  const system=matchMedia('(prefers-color-scheme: dark)'),root=document.documentElement;
  const settings=document.getElementById('settings'),themes=settings.querySelector('.themes');
  const field=themes.closest('.setting');field.classList.add('reading-palette-field');
  const preview=document.createElement('section');preview.id='readingAppearancePreview';preview.className='reading-appearance-preview';preview.setAttribute('aria-label','排版预览');
  preview.innerHTML='<small>读一小段，看看效果</small><p>雨停了，书店仍亮着灯。<br>翻过这一页，故事才刚刚开始。</p>';
  field.prepend(preview);
  const customButton=document.createElement('button');customButton.type='button';customButton.className='theme';customButton.dataset.theme='custom';themes.append(customButton);
  for(const button of themes.querySelectorAll('.theme')) {
    const id=button.dataset.theme,pair=READING_THEMES[id]||custom;
    button.innerHTML='<b aria-hidden="true">A</b><span></span>';button.querySelector('span').textContent=READING_THEMES[id]?.name||'自定义';
    button.title=READING_THEMES[id]?.name||'自定义';button.setAttribute('aria-label',id==='white'?'白色':(READING_THEMES[id]?.name||'自定义配色'));
    button.style.setProperty('--swatch-paper',pair.paper);button.style.setProperty('--swatch-ink',pair.ink);
    button.onclick=()=>{state.manual=id;state.mode='manual';persist();apply();onChange?.()};
  }
  const follow=document.createElement('label');follow.className='appearance-follow';
  follow.innerHTML='<input type="checkbox" id="followReadingSystem"><span>阅读配色跟随系统深浅</span>';
  const scope=document.createElement('p');scope.className='appearance-scope';scope.textContent='配色用于文字正文；PDF和漫画保留原页色。';
  const editor=document.createElement('details');editor.className='custom-reading-colors';
  editor.innerHTML='<summary>自定义背景与文字</summary><div class="color-pair-inputs"><label>背景<input type="color" id="readingPaperColor"></label><label>文字<input type="color" id="readingInkColor"></label><button type="button" id="applyReadingColors">应用配色</button></div><p id="readingColorStatus" role="status"></p>';
  field.append(follow,editor,scope);
  const paper=editor.querySelector('#readingPaperColor'),ink=editor.querySelector('#readingInkColor'),save=editor.querySelector('#applyReadingColors'),status=editor.querySelector('#readingColorStatus');
  paper.value=custom.paper;ink.value=custom.ink;
  const inspect=()=>{const pair={paper:paper.value,ink:ink.value},valid=validPair(pair);save.disabled=!valid;status.textContent=valid?'先选背景和文字，再应用到阅读页。':'文字与背景太接近，请加深文字或调整背景。';preview.style.backgroundColor=pair.paper;preview.style.color=pair.ink;};
  for(const input of [paper,ink])input.addEventListener('input',inspect);
  save.onclick=()=>{const pair={paper:paper.value,ink:ink.value};if(!validPair(pair))return;state.custom=pair;customButton.style.setProperty('--swatch-paper',pair.paper);customButton.style.setProperty('--swatch-ink',pair.ink);state.manual='custom';state.mode='manual';persist();apply();onChange?.();status.textContent='配色已应用，只保存在当前设备。'};
  editor.addEventListener('toggle',()=>{if(!editor.open)apply()});
  follow.querySelector('input').onchange=e=>{state.mode=e.target.checked?'system':'manual';persist();apply();onChange?.()};
  system.addEventListener('change',()=>{if(state.mode==='system'){apply();onChange?.()}});
  function persist(){localStorage.setItem(KEY,JSON.stringify({mode:state.mode,custom:state.custom}))}
  function apply() {
    const manualPair=READING_THEMES[state.manual]||state.custom;
    const light=luminance(manualPair.paper)<.18?'white':state.manual;
    const id=state.mode==='system'?(system.matches?'dark':light):state.manual;
    const pair=READING_THEMES[id]||state.custom,palette=readingPalette(pair),{dark}=palette;
    root.dataset.readingTheme=id;root.dataset.readingScheme=dark?'dark':'light';
    for(const [key,value]of Object.entries({'--read':pair.paper,'--readink':pair.ink,'--reading-accent':palette.accent,'--reading-on-accent':palette.onAccent,'--reading-surface':palette.surface,'--reading-raised':palette.raised,'--reading-muted':palette.muted,'--reading-selected':palette.selected}))root.style.setProperty(key,value);
    preview.style.backgroundColor=pair.paper;preview.style.color=pair.ink;
    follow.querySelector('input').checked=state.mode==='system';
    for(const button of document.querySelectorAll('.theme')){const swatch=READING_THEMES[button.dataset.theme]||state.custom;button.style.setProperty('--swatch-paper',swatch.paper);button.style.setProperty('--swatch-ink',swatch.ink);const active=button.dataset.theme===id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))}
    document.dispatchEvent(new CustomEvent('reading-appearance-change',{detail:{id,...pair,dark}}));
    return {id,...pair,dark};
  }
  apply();
  return {apply,get manualTheme(){return state.manual}};
}
