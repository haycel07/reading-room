// Categorized, persistent reading preferences. Existing controls retain their IDs and handlers.
// Interaction structure studied from Anx Reader v1.14.0; this implementation is original.
const STORAGE_KEY = 'reading-interface-prefs';
const DEFAULTS = Object.freeze({
  textWidth: 790, firstIndent: 0, topSpace: 40, bottomSpace: 90,
  headingScale: 1.15, catalogSize: 13, catalogDensity: 'regular',
  motion: 'standard', showMeta: true, showProgress: true,
  ebookFlow: 'paginated', ebookColumns: '2', keepAwake: false, keyboardNavigation: true,
  voiceRate: '1', voicePitch: '1', voiceSleep: '0', voiceName: ''
});
const CATEGORIES = [
  ['type', '排版', '调整文字、配色、留白与背景。'],
  ['reading', '阅读', '目录、进度、界面与文件选项。'],
  ['companion', '伴读', '设置阅读伙伴的名字、语气与评论安排。'],
  ['voice', '语音', '选择本地音色、语速、音调和定时停止。'],
  ['ai', 'AI 服务', '选择运行方式，配置地址、模型和 API 密钥。']
];
let installed = null;

const RANGE_SCALES = {
  fontSize: ['px', [14, 18, 22, 26, 30, 32]],
  lineHeight: ['倍', [1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6]],
  letterSpacing: ['px', [0, 1, 2, 3, 4]],
  paragraphSpacing: ['倍', [0, .5, 1, 1.5, 2, 2.5, 3]],
  readerMargin: ['px', [8, 20, 32, 44, 56, 68, 80]],
  textColumnWidth: ['px', [600, 700, 800, 900, 1000, 1100]],
  paragraphIndent: ['字', [0, 1, 2, 3, 4]],
  readerTopSpace: ['px', [12, 32, 52, 72, 92, 120]],
  readerBottomSpace: ['px', [12, 40, 68, 96, 124, 160]],
  readerHeadingScale: ['倍', [1, 1.2, 1.4, 1.6, 1.8]],
  catalogFontSize: ['px', [11, 12, 14, 16, 18]],
  ttsPitch: ['倍', [.5, .7, .9, 1.1, 1.3, 1.5]]
};

function addRangeScale(control, settings) {
  const label = control.closest('label') || settings.querySelector('label[for="' + control.id + '"]');
  if (!label) return;
  const min = Number(control.min || 0), max = Number(control.max || 100), step = Number(control.step) || 1;
  const precision = (String(step).split('.')[1] || '').length;
  const format = value => Number(Number(value).toFixed(precision)).toLocaleString('zh-CN', { maximumFractionDigits: precision, useGrouping: false });
  const [unit, marks] = RANGE_SCALES[control.id] || ['', [min, max]];
  const major = [...new Set([min, ...marks, max])].filter(value => value >= min && value <= max);
  let output = label.querySelector('output, #fontValue, #lineValue');
  if (!output) { output = document.createElement('output');output.htmlFor = control.id; }
  output.classList.add('preferences-range-value');
  const readout = document.createElement('span');readout.className = 'range-readout';
  const suffix = document.createElement('span');suffix.className = 'range-unit';suffix.textContent = unit;
  readout.append(output, suffix);
  if (label.contains(control)) { label.classList.add('range-label-contained');label.insertBefore(readout, control); }
  else label.append(readout);
  const wrapper = document.createElement('div');wrapper.className = 'range-control';
  const ruler = document.createElement('div');ruler.className = 'range-ruler';ruler.setAttribute('aria-hidden', 'true');
  const mark = (value, prominent) => {
    const tick = document.createElement('span');tick.className = prominent ? 'range-tick major' : 'range-tick';
    tick.style.left = ((value - min) / (max - min) * 100) + '%';tick.dataset.value = value;
    if (prominent) {
      const caption = document.createElement('span');caption.textContent = format(value);tick.append(caption);
      if (value === min) tick.classList.add('first');if (value === max) tick.classList.add('last');
    }
    ruler.append(tick);
  };
  const steps = Math.round((max - min) / step), stride = Math.max(1, Math.ceil(steps / 60));
  for (let i = 0; i <= steps; i += stride) {
    const value = Number((min + i * step).toFixed(8));
    if (!major.some(n => Math.abs(n - value) < .000001)) mark(value, false);
  }
  major.forEach(value => mark(value, true));
  control.before(wrapper);wrapper.append(control, ruler);
  const update = () => {
    output.textContent = format(control.value);
    control.setAttribute('aria-valuetext', format(control.value) + (unit ? ' ' + unit : ''));
    wrapper.style.setProperty('--range-fill', ((Number(control.value) - min) / (max - min) * 100) + '%');
  };
  control.addEventListener('input', update);control.addEventListener('change', update);update();
}

function readPreferences() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { raw = {}; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const p = { ...DEFAULTS };
  for (const [key, min, max] of [
    ['textWidth', 600, 1100], ['firstIndent', 0, 4], ['topSpace', 12, 120],
    ['bottomSpace', 12, 160], ['headingScale', 1, 1.8], ['catalogSize', 11, 18]
  ]) if (Number.isFinite(Number(raw[key]))) p[key] = Math.min(max, Math.max(min, Number(raw[key])));
  for (const [key, choices] of [
    ['catalogDensity', ['compact', 'regular', 'comfortable']],
    ['motion', ['standard', 'gentle', 'off']], ['voiceRate', ['0.8', '1', '1.25', '1.5']],
    ['voiceSleep', ['0', '10', '20', '30']], ['ebookFlow', ['paginated', 'scrolled']],
    ['ebookColumns', ['1', '2']]
  ]) if (choices.includes(String(raw[key]))) p[key] = String(raw[key]);
  for (const key of ['showMeta', 'showProgress', 'keepAwake', 'keyboardNavigation']) if (typeof raw[key] === 'boolean') p[key] = raw[key];
  if (Number.isFinite(Number(raw.voicePitch))) p.voicePitch = String(Math.max(.5, Math.min(1.5, Number(raw.voicePitch))));
  if (typeof raw.voiceName === 'string') p.voiceName = raw.voiceName.slice(0, 240);
  return p;
}

export function initReadingPreferences(hooks = {}) {
  if (installed) return installed;
  const settings = document.getElementById('settings');
  if (!settings) throw new Error('阅读设置容器尚未创建');
  const $ = id => document.getElementById(id);
  const preferences = readPreferences();
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 'type', panelMotion = null, pillMotion = null;
  const pill=document.createElement('span');pill.className='preferences-tab-pill';pill.setAttribute('aria-hidden','true');
  const tabs = new Map(), panels = new Map();
  const nav = document.createElement('div');
  nav.className = 'preferences-tabs';nav.append(pill);
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', '设置分类');
  const content = document.createElement('div');
  content.className = 'preferences-content';
  settings.classList.add('settings-organized');
  settings.querySelector('.settings-head')?.after(nav, content);

  for (const [key, label, hint] of CATEGORIES) {
    const button = document.createElement('button');
    button.type = 'button';button.id = 'preferences-tab-' + key;
    button.className = 'preferences-tab';button.textContent = label;
    button.setAttribute('role', 'tab');button.setAttribute('aria-controls', 'preferences-' + key);
    const panel = document.createElement('section');
    panel.id = 'preferences-' + key;panel.className = 'preferences-pane';
    panel.setAttribute('role', 'tabpanel');panel.setAttribute('aria-labelledby', button.id);
    const description = document.createElement('p');description.className = 'preferences-description';description.textContent = hint;
    panel.append(description);nav.append(button);content.append(panel);
    tabs.set(key, button);panels.set(key, panel);
    button.addEventListener('click', () => select(key));
    button.addEventListener('keydown', event => {
      const order = CATEGORIES.map(([value]) => value);let index = order.indexOf(key);
      if (event.key === 'ArrowRight') index = (index + 1) % order.length;
      else if (event.key === 'ArrowLeft') index = (index - 1 + order.length) % order.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = order.length - 1;
      else return;
      event.preventDefault();select(order[index]);tabs.get(order[index]).focus();
    });
  }

  function select(key, { animate = true } = {}) {
    if (!panels.has(key)) key = 'type';
    const previous=selected;selected = key;
    for (const [name, panel] of panels) {
      const active = name === key;
      panel.hidden = !active;panel.inert = !active;
      tabs.get(name).setAttribute('aria-selected', String(active));
      tabs.get(name).tabIndex = active ? 0 : -1;
    }
    settings.dataset.preferenceCategory = key;
    content.scrollTop = 0;
    updatePill(animate);
    panelMotion?.cancel();
    if (animate && effectiveMotion() !== 'off') {
      const panel = panels.get(key),direction=CATEGORIES.findIndex(x=>x[0]===key)>=CATEGORIES.findIndex(x=>x[0]===previous)?1:-1;
      panel.getAnimations().forEach(animation => animation.cancel());
      panelMotion=window.Motion?.animate?Motion.animate(panel,{opacity:[.5,1],transform:[`translateX(${direction*12}px)`,'translateX(0px)']},{type:'spring',duration:.23,bounce:.035}):panel.animate([{opacity:.5,transform:`translateX(${direction*12}px)`},{opacity:1,transform:'none'}],{duration:190,easing:'ease-out'});
    }
  }
  function updatePill(animate=false){
    const button=tabs.get(selected);if(!button?.getClientRects().length)return;
    const prior=pill.getBoundingClientRect(),bounds=nav.getBoundingClientRect(),next=button.getBoundingClientRect();pillMotion?.cancel();
    Object.assign(pill.style,{left:next.left-bounds.left+nav.scrollLeft+'px',top:next.top-bounds.top+'px',width:next.width+'px',height:next.height+'px'});
    if(animate&&effectiveMotion()!=='off'&&prior.width>0){const from=`translateX(${prior.left-next.left}px) scaleX(${prior.width/next.width})`;pillMotion=window.Motion?.animate?Motion.animate(pill,{transform:[from,'translateX(0px) scaleX(1)']},{type:'spring',duration:.28,bounce:.035}):pill.animate([{transform:from},{transform:'none'}],{duration:220,easing:'ease-out'});}
  }
  new ResizeObserver(()=>updatePill()).observe(nav);
  document.addEventListener('reading-settings-open',()=>requestAnimationFrame(()=>updatePill()));

  function effectiveMotion() { return reduced.matches ? 'off' : preferences.motion; }
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    apply();
  }
  function apply() {
    root.style.setProperty('--text-column-width', preferences.textWidth + 'px');
    root.style.setProperty('--reader-first-indent', preferences.firstIndent + 'em');
    root.style.setProperty('--reader-top-space', preferences.topSpace + 'px');
    root.style.setProperty('--reader-bottom-space', preferences.bottomSpace + 'px');
    root.style.setProperty('--reader-heading-scale', preferences.headingScale);
    root.style.setProperty('--catalog-font-size', preferences.catalogSize + 'px');
    const density = { compact: [7, 34], regular: [10, 42], comfortable: [13, 50] }[preferences.catalogDensity];
    root.style.setProperty('--catalog-row-space', density[0] + 'px');
    root.style.setProperty('--catalog-row-height', density[1] + 'px');
    root.dataset.motionMode = effectiveMotion();
    root.dataset.readerMeta = preferences.showMeta ? 'show' : 'hide';
    root.dataset.readerProgress = preferences.showProgress ? 'show' : 'hide';
    root.style.setProperty('--motion-duration', effectiveMotion() === 'off' ? '0ms' : effectiveMotion() === 'gentle' ? '320ms' : '220ms');
    if (effectiveMotion() === 'off') {panelMotion?.cancel();pillMotion?.cancel();document.getAnimations().forEach(animation => animation.cancel());pill.style.removeProperty('transform');updatePill();}
    document.dispatchEvent(new CustomEvent('reading-motion-change', { detail: { mode: effectiveMotion() } }));
    document.dispatchEvent(new CustomEvent('reading-preferences-change', { detail: { ...preferences } }));
    hooks.onChange?.({ ...preferences });hooks.styleEbook?.();
  }

  const move = (node, category) => { if (node) panels.get(category).append(node); };
  for (const node of [...settings.querySelectorAll(':scope > .setting')]) {
    move(node, node.querySelector('#encoding') ? 'reading' : 'type');
  }
  move(settings.querySelector('.advanced-type'), 'type');
  move(settings.querySelector('.ai-config'), 'ai');
  const companion = $('companionPreferences');
  if (companion) { companion.open = true;move(companion, 'companion'); }
  const persona = $('persona');
  if (persona) {
    const card = document.createElement('div');card.className = 'preferences-field';
    const label = document.querySelector('label[for="persona"]');
    if (label) card.append(label);
    card.append(persona);panels.get('companion').insertBefore(card, companion || null);
  }

  function range(category, key, id, title, min, max, step, unit, hint) {
    const field = document.createElement('div');field.className = 'preferences-field';
    const label = document.createElement('label');label.htmlFor = id;
    const text = document.createElement('span');text.textContent = title;
    const output = document.createElement('output');output.htmlFor = id;
    output.id = id + 'Value';label.append(text, output);
    const input = document.createElement('input');input.type = 'range';input.id = id;
    Object.assign(input, { min, max, step, value: preferences[key] });
    const updateOutput = () => output.textContent = Number(input.value).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
    input.addEventListener('input', () => { preferences[key] = Number(input.value);updateOutput();persist(); });
    updateOutput();field.append(label, input);
    if (hint) { const small = document.createElement('small');small.textContent = hint;field.append(small); }
    panels.get(category).append(field);return input;
  }
  function choice(category, key, id, title, options, hint) {
    const field = document.createElement('div');field.className = 'preferences-field';
    const label = document.createElement('label');label.htmlFor = id;label.textContent = title;
    const input = document.createElement('select');input.id = id;
    for (const [value, text] of options) input.add(new Option(text, value));
    input.value = preferences[key];input.addEventListener('change', () => { preferences[key] = input.value;persist(); });
    field.append(label, input);
    if (hint) { const small = document.createElement('small');small.textContent = hint;field.append(small); }
    panels.get(category).append(field);return input;
  }
  function toggle(category, key, id, title, hint) {
    const label = document.createElement('label');label.className = 'preferences-switch';
    const text = document.createElement('span');const strong = document.createElement('b');strong.textContent = title;text.append(strong);
    if (hint) { const small = document.createElement('small');small.textContent = hint;text.append(small); }
    const input = document.createElement('input');input.type = 'checkbox';input.id = id;input.checked = preferences[key];
    input.addEventListener('change', () => { preferences[key] = input.checked;persist(); });
    label.append(text, input);panels.get(category).append(label);return input;
  }

  range('type', 'textWidth', 'textColumnWidth', '正文宽度', 600, 1100, 10, ' px', '桌面可重排正文；窄屏会自动适应窗口。');
  range('type', 'firstIndent', 'paragraphIndent', '首行缩进', 0, 4, .5, ' 字', '用于 EPUB、HTML、DOCX 的普通段落。TXT 原文字符与笔记位置保持不变。');
  range('type', 'topSpace', 'readerTopSpace', '页首留白', 12, 120, 4, ' px');
  range('type', 'bottomSpace', 'readerBottomSpace', '页尾留白', 12, 160, 4, ' px');
  range('type', 'headingScale', 'readerHeadingScale', '章节标题大小', 1, 1.8, .05, ' 倍', '相对于正文字号；不改变 PDF 原始版面。');
  range('reading', 'catalogSize', 'catalogFontSize', '目录文字大小', 11, 18, 1, ' px');
  choice('reading', 'catalogDensity', 'catalogDensity', '目录间距', [['compact', '紧凑'], ['regular', '适中'], ['comfortable', '宽松']]);
  choice('reading', 'ebookFlow', 'ebookReadingFlow', '电子书阅读方式', [['paginated', '分页阅读'], ['scrolled', '连续滚动']], '用于 EPUB 等可重排电子书；TXT 和 PDF 保持各自的阅读方式。');
  const columns = choice('reading', 'ebookColumns', 'ebookColumnCount', '电子书栏数', [['1', '单栏'], ['2', '双栏']], '仅分页阅读时生效；窄屏由阅读器自动适配，不强行挤成双栏。');
  const syncColumns = () => { columns.disabled = preferences.ebookFlow !== 'paginated'; };
  $('ebookReadingFlow').addEventListener('change', syncColumns);syncColumns();
  choice('reading', 'motion', 'readerMotion', '界面动效', [['standard', '标准'], ['gentle', '轻柔'], ['off', '关闭']], '系统启用“减少动态效果”时，始终关闭动效。');
  toggle('reading', 'showMeta', 'showReaderMeta', '显示文件信息', '阅读页显示格式、编码和存储位置。');
  toggle('reading', 'showProgress', 'showReaderProgress', '显示阅读进度', '显示页脚进度与工具栏中的阅读位置导航。');
  toggle('reading', 'keyboardNavigation', 'readerKeyboardNavigation', '键盘翻屏', '阅读时使用左右方向键或 Page Up / Page Down，输入和弹窗中不触发。');
  const awake = toggle('reading', 'keepAwake', 'readerKeepAwake', '阅读时保持屏幕常亮', '只在页面可见且正在阅读时申请，离开阅读页后释放。');
  if (hooks.setWakeLock) awake.addEventListener('change', () => Promise.resolve(hooks.setWakeLock(awake.checked)).catch(() => hooks.notify?.('此设备暂时无法保持屏幕常亮')));
  const fullscreen = document.createElement('button');fullscreen.type = 'button';fullscreen.id = 'readerFullscreen';fullscreen.className = 'preferences-inline-action';
  const fullscreenLabel = () => fullscreen.textContent = document.fullscreenElement ? '退出全屏阅读' : '进入全屏阅读';
  fullscreenLabel();document.addEventListener('fullscreenchange', fullscreenLabel);
  fullscreen.addEventListener('click', async () => {
    try {
      if (hooks.toggleFullscreen) await hooks.toggleFullscreen();
      else if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else hooks.notify?.('此设备暂不支持全屏阅读');
    } catch { hooks.notify?.('未能进入全屏，可继续正常阅读'); }
  });panels.get('reading').append(fullscreen);

  const sourceProactive = $('proactiveEnabled');
  if (sourceProactive) {
    const wrapper = document.createElement('label');wrapper.className = 'preferences-switch';
    const text = document.createElement('span');text.innerHTML = '<b>开启主动伴读</b><small>将提前发送当前区及下一区文字（含未读部分）到所选AI服务；读到允许位置后才显示短评。</small>';
    const mirror = document.createElement('input');mirror.type = 'checkbox';mirror.id = 'preferencesCompanionEnabled';
    mirror.checked = sourceProactive.checked;
    mirror.addEventListener('change', () => { sourceProactive.checked = mirror.checked;sourceProactive.dispatchEvent(new Event('change', { bubbles: true }));mirror.checked = sourceProactive.checked; });
    sourceProactive.addEventListener('change', () => mirror.checked = sourceProactive.checked);
    wrapper.append(text, mirror);panels.get('companion').insertBefore(wrapper, panels.get('companion').children[1] || null);
  }

  const voiceRow = $('ttsVoice')?.closest('.feature-row');
  if (voiceRow) {
    const section = voiceRow.closest('section');
    voiceRow.classList.add('preferences-voice-controls');move(voiceRow, 'voice');
    const hint = document.createElement('p');hint.className = 'preferences-description';
    hint.textContent = '听书使用设备本地语音。音色取决于系统已安装的语音包；不会自动切换到网络音色。';panels.get('voice').append(hint);
    if (section) {
      const shortcut = document.createElement('button');shortcut.type = 'button';shortcut.className = 'preferences-shortcut';shortcut.textContent = '语音设置';
      shortcut.addEventListener('click', () => open('voice'));section.insertBefore(shortcut, section.querySelector('.feature-row') || null);
    }
    for (const [id, key] of [['ttsRate', 'voiceRate'], ['ttsPitch', 'voicePitch'], ['ttsSleep', 'voiceSleep']]) {
      const control = $(id);if (!control) continue;control.value = preferences[key];
      control.addEventListener(control.type === 'range' ? 'input' : 'change', () => { preferences[key] = control.value;persist(); });
    }
    const voice = $('ttsVoice');
    const restoreVoice = () => { if (preferences.voiceName) { const option = [...voice.options].find(o => o.textContent === preferences.voiceName);if (option) voice.value = option.value; } };
    restoreVoice();new MutationObserver(restoreVoice).observe(voice, { childList: true });
    voice.addEventListener('change', () => { preferences.voiceName = voice.selectedOptions[0]?.textContent || '';persist(); });
    const listen = document.createElement('button');listen.type = 'button';listen.className = 'preferences-inline-action';listen.textContent = '从当前位置开始听书';
    listen.addEventListener('click', () => {
      if (!document.body.classList.contains('is-reading')) { hooks.notify?.('先打开一本书，再开始听书');return; }
      $('ttsStart')?.click();
    });panels.get('voice').append(listen);
    const stop = document.createElement('button');stop.type = 'button';stop.className = 'preferences-inline-action secondary';stop.textContent = '停止听书';stop.addEventListener('click', () => $('ttsStop')?.click());panels.get('voice').append(stop);
    const status = $('ttsStatus');
    if (status) {
      const mirror = document.createElement('p');mirror.id = 'preferencesVoiceStatus';mirror.className = 'preferences-description';mirror.setAttribute('role', 'status');
      const update = () => mirror.textContent = status.textContent;
      update();new MutationObserver(update).observe(status, { childList: true, subtree: true, characterData: true });panels.get('voice').append(mirror);
    }
  }

  function open(category = 'type', { focus = false } = {}) {
    hooks.closeTools?.();
    for (const dialog of document.querySelectorAll('dialog[open]')) if (dialog.id === 'readerTools') dialog.close();
    select(category, { animate: !settings.classList.contains('hidden') });
    if (settings.classList.contains('hidden')) {
      if (hooks.openSettings) hooks.openSettings();else $('toggleSettings')?.click();
    }
    if (category === 'companion' && companion) companion.open = true;
    if (focus) requestAnimationFrame(() => panels.get(selected).querySelector('input,select,textarea,button')?.focus({ preventScroll: true }));
  }

  $('editCompanion')?.addEventListener('click', () => open('companion'));
  document.addEventListener('click', event => {
    if (event.target.closest?.('.open-ai-settings')) select('ai', { animate: false });
  }, true);
  const voiceHint = document.createElement('p');voiceHint.className = 'preferences-description';
  voiceHint.textContent = '可随时从阅读工具开始或停止听书，这里的偏好会自动保存。';panels.get('voice').append(voiceHint);

  // Keep every pre-existing setting reachable, including future additions.
  const fixed = new Set([settings.querySelector('.settings-head'), nav, content]);
  for (const node of [...settings.children]) if (!fixed.has(node)) {
    if (node.classList.contains('settings-note')) { node.classList.add('preferences-footer');content.append(node); }
    else move(node, 'reading');
  }

  for (const control of settings.querySelectorAll('input[type=range]')) {
    addRangeScale(control, settings);
  }
  reduced.addEventListener('change', apply);
  document.addEventListener('keydown', event => {
    if (!preferences.keyboardNavigation || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!document.body.classList.contains('is-reading') || document.querySelector('dialog[open]') || !settings.classList.contains('hidden')) return;
    if (event.target.closest?.('input,textarea,select,[contenteditable=true],#companion')) return;
    const delta = ['ArrowRight', 'PageDown'].includes(event.key) ? 1 : ['ArrowLeft', 'PageUp'].includes(event.key) ? -1 : 0;
    if (!delta) return;
    const ebook = $('ebook'), pdf = $('pdf'), wrap = $('readerWrap');
    if (ebook && !ebook.classList.contains('hidden')) $(delta > 0 ? 'ebookNext' : 'ebookPrev')?.click();
    else if (pdf && !pdf.classList.contains('hidden')) $(delta > 0 ? 'next' : 'prev')?.click();
    else if (wrap) wrap.scrollBy({ top: delta * Math.max(100, wrap.clientHeight * .85), behavior: effectiveMotion() === 'off' ? 'instant' : 'smooth' });
    event.preventDefault();
  });
  select('type', { animate: false });apply();
  installed = {
    open,
    get values() { return { ...preferences }; },
    effectiveMotion,
    ebookCss() {
      return `body{padding-top:${preferences.topSpace}px!important;padding-bottom:${preferences.bottomSpace}px!important}p{text-indent:${preferences.firstIndent}em!important}blockquote p,li p,pre p,p:has(img){text-indent:0!important}h1,h2,h3,h4,h5,h6{font-size:${preferences.headingScale}em!important}`;
    }
  };
  return installed;
}
