// Optional first-read guidance and explicit, non-destructive book import.
const $ = (id) => document.getElementById(id);
const SAMPLE_ID = 'onepage-first-page-v1';
const GUIDE_KEY = 'onepage-reading-guide-dismissed-v1';
const SAMPLE_NAME = '窗边的书店 · 一页试读.txt';
const SAMPLE_TEXT = `第一章 窗边的书店

雨下起来的时候，林禾刚好走到书店门前。门上的小铃响了一声，柜台后的人抬起头，把一本摊开的书往旁边挪了挪。

“进来躲一会儿吧。”他说。

店里没有音乐，只有靠窗的一把木椅。林禾坐下，把湿了一半的伞放在脚边。窗玻璃蒙着薄薄的水汽，街上的灯便成了一团柔和的光。

她从身边的架子抽出一本书。夹在扉页里的不是书签，而是一张没有写完的购物清单：面包、牛奶，还有一朵花。

最后那一项让她笑了。谁会把买花写在清单上呢？仿佛不提醒自己，今天就会忘记有一件没什么用处、却很想做的事。

店主端来一杯温水，没有问她想买什么。杯底在桌面上留下一圈浅浅的水印，恰好围住了木头上的一个小结。

“这张清单是你的吗？”林禾举起那页纸。

“不是。”店主看了一眼，“不过，一直没有人来找。”

林禾把清单放回原处，翻到了正文。第一句话很短，她读完以后没有马上往下看。雨落在窗台上的声音，好像替书里的句号多停留了一会儿。

第二章 雨声慢下来

过了一会儿，有人推门进来，先抖了抖外套，再小声问有没有一本关于散步的书。

店主想了想，指向林禾身后的架子：“那一排都是。不过，有的书里没有路，只有人为什么想出门。”

林禾又笑了。这一次她没有抬头，手指轻轻压着刚读过的那一行。她发现，和别人待在同一间安静的屋子里读书，确实会有一点不同。

等她再看向窗外，雨已经小了。伞还在脚边，杯子里的水还有一点温度。她决定把这一页读完，再站起来。
`;
const supported = /\.(txt|md|markdown|html|htm|docx|pdf|epub|mobi|azw|azw3|prc|fb2|fbz|cbz|fb2\.zip)$/i;
const show = (el, visible) => {
  el.hidden = !visible;
  el.classList.toggle('hidden', !visible);
};
const bytes = (size) => size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`;
const format = (name) => /\.fb2\.zip$/i.test(name) ? 'FB2.ZIP' : name.split('.').pop().toUpperCase();

export function initReaderOnboarding(h) {
  const empty = $('libraryEmpty');
  empty.classList.add('reader-first-library');
  empty.innerHTML = `<div class="first-book-illustration" aria-hidden="true"><span>一页</span></div><div class="first-reading-copy"><h2>从第一本书开始</h2><p>导入一本喜欢的书，或先读一页，找到舒服的阅读方式。</p><div class="first-reading-actions"><button id="firstImport" type="button">导入书籍</button><button id="firstSample" type="button">先试读一页</button></div><div class="first-reading-links"><button id="openReadingGuide" type="button">使用指南</button><button id="skipReadingGuide" type="button">先跳过</button></div><ol id="firstReadingTips"><li><b>把书放进来</b><span>支持 EPUB、PDF、TXT 等格式，导入与解析在此设备完成。</span></li><li><b>调成喜欢的样子</b><span>进入阅读后，右上角“设置”可调整配色、字号和留白。</span></li><li><b>想聊时再开启伴读</b><span>不配置 AI 也能读书。开启预备短评会发送含未读部分的区间。</span></li></ol><small class="first-reading-storage">书籍与记录保存在当前浏览器，本机、线上和安卓之间不会自动同步。</small></div>`;
  const guide = document.createElement('dialog');
  guide.id = 'readingGuide';
  guide.className = 'reader-dialog reading-guide';
  guide.setAttribute('aria-labelledby', 'readingGuideTitle');
  guide.innerHTML = `<div class="reader-dialog-head"><h2 id="readingGuideTitle">开始之前，认识这一页</h2><button id="closeReadingGuide" type="button" aria-label="关闭使用指南">×</button></div><ol class="reading-guide-steps"><li><h3>导入后，点书封开始阅读</h3><p>可以一次选择多本书，确认后再导入。导入成功可直接打开；原文件和已有书籍都会保留。</p></li><li><h3>书架和设置，一直都在顶部</h3><p>左上角“书架”退出阅读，右上角“设置”调整配色和排版。轻点正文中间呼出其他工具，选中文字可复制、划线或记笔记。</p></li><li><h3>伴读是可选的</h3><p>不配置 AI 也能读书。开启主动伴读后，会提前发送当前区及符合条件的下一区文字，含尚未读到的部分；短评到允许位置才出现，不能绝对保证防剧透。</p></li></ol><p class="guide-storage-note">书架、进度和对话分别保存在当前浏览器或安卓应用。本机、线上、安卓不会自动互通，换设备前可先导出备份。</p><div class="reading-guide-actions"><button id="guideSample" type="button">试读一页</button><button id="guideLater" type="button">先跳过</button><button id="guideDone" type="button">知道了</button></div>`;
  document.body.append(guide);
  const dismissed = () => { try { return localStorage.getItem(GUIDE_KEY) === 'true'; } catch { return false; } };
  const dismiss = () => {
    try { localStorage.setItem(GUIDE_KEY, 'true'); } catch { /* Guidance must remain usable without storage. */ }
    refreshEmpty();
    if (guide.open) guide.close();
  };
  function refreshEmpty() {
    const hasBooks = h.books().length > 0;
    const title = hasBooks ? '没有找到这本书' : '从第一本书开始';
    const copy = hasBooks ? '试试其他书名，或清除筛选后再找找。' : '导入一本喜欢的书，或先读一页，找到舒服的阅读方式。';
    if (empty.querySelector('h2').textContent !== title) empty.querySelector('h2').textContent = title;
    if (empty.querySelector('p').textContent !== copy) empty.querySelector('p').textContent = copy;
    show(empty.querySelector('.first-reading-actions'), !hasBooks);
    show(empty.querySelector('.first-book-illustration'), !hasBooks);
    show(empty.querySelector('.first-reading-links'), !hasBooks);
    show($('firstReadingTips'), !hasBooks && !dismissed());
    show($('skipReadingGuide'), !dismissed());
    show(empty.querySelector('.first-reading-storage'), !hasBooks);
    empty.classList.toggle('is-first-reading', !hasBooks);
  }
  const watchLibrary = new MutationObserver(refreshEmpty);
  watchLibrary.observe($('libraryGrid'), { childList: true });
  watchLibrary.observe(empty, { childList: true, subtree: true });
  $('firstImport').onclick = () => $('file').click();
  $('openReadingGuide').onclick = () => guide.showModal();
  $('skipReadingGuide').onclick = dismiss;
  for (const id of ['guideLater', 'guideDone']) $(id).onclick = dismiss;
  $('closeReadingGuide').onclick = () => guide.close();

  // Only suppress automatic preparation for this demo session, never its saved setting.
  let sampleSession = null;
  function restoreSamplePreference() {
    if (!sampleSession) return;
    const session = sampleSession;
    sampleSession = null;
    if (session.changed) return;
    $('proactiveEnabled').checked = session.enabled;
    $('proactiveStatus').textContent = session.status;
    if ($('preferencesCompanionEnabled')) $('preferencesCompanionEnabled').checked = session.enabled;
  }
  function beginSamplePreference(id) {
    sampleSession = { id, enabled: $('proactiveEnabled').checked, status: $('proactiveStatus').textContent, changed: false, entered: false };
    $('proactiveEnabled').checked = false;
    if ($('preferencesCompanionEnabled')) $('preferencesCompanionEnabled').checked = false;
    $('proactiveStatus').textContent = '试读不会自动调用 AI；真实书籍的伴读设置保留。';
  }
  $('proactiveEnabled').addEventListener('change', () => { if (sampleSession) sampleSession.changed = true; });
  const watchReading = new MutationObserver(() => {
    const reading = document.body.classList.contains('is-reading');
    const id = localStorage.getItem('reading-last-book');
    if (sampleSession?.entered && (!reading || id !== sampleSession.id)) restoreSamplePreference();
    if (reading && !sampleSession && h.books().some((b) => b.id === id && b.readerOnboardingSample === SAMPLE_ID)) beginSamplePreference(id);
    if (sampleSession && reading && id === sampleSession.id) sampleSession.entered = true;
  });
  watchReading.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  watchReading.observe($('reading'), { attributes: true, attributeFilter: ['class', 'aria-busy'] });
  async function sample() {
    const trigger = $('firstSample');
    trigger.disabled = true;
    try {
      let book;
      for (const candidate of h.books().filter((b) => b.readerOnboardingSample === SAMPLE_ID)) {
        if (await candidate.data.text() === SAMPLE_TEXT) { book = candidate; break; }
      }
      if (!book) {
        book = await h.importFile(new File([SAMPLE_TEXT], SAMPLE_NAME, { type: 'text/plain' }));
        book.readerOnboardingSample = SAMPLE_ID;
        await h.save(book);
        h.refresh();
      }
      restoreSamplePreference();
      beginSamplePreference(book.id);
      h.beforeOpen();
      await h.open(book);
      $('proactiveStatus').textContent = '试读不会自动调用 AI；真实书籍的伴读设置保留。';
      h.notify('正在试读：不会自动调用 AI');
    } catch {
      restoreSamplePreference();
      h.refresh();
      h.notify('试读暂时无法打开，请重试或导入自己的书。');
    } finally { trigger.disabled = false; }
  }
  $('firstSample').onclick = sample;
  $('guideSample').onclick = () => {guide.close();h.navigate('library');sample();};
  refreshEmpty();
  initImport(h);
  return { showGuide: () => guide.showModal(), sample };
}

function initImport(h) {
  const dialog = document.createElement('dialog');
  dialog.id = 'importDialog';
  dialog.className = 'reader-dialog import-dialog';
  dialog.setAttribute('aria-labelledby', 'importTitle');
  dialog.innerHTML = `<h2 id="importTitle"></h2><p class="page-hint">导入与解析在此设备完成，不会覆盖已有书籍。</p><p id="importSelection" class="import-selection" aria-live="polite"></p><div id="importList"></div><p id="importStatus" role="status"></p><div class="import-actions"><button id="cancelImport" type="button">取消</button><button id="openImportedBook" type="button" class="hidden" hidden>打开这本书</button><button id="confirmImport" type="button">导入</button></div>`;
  document.body.append(dialog);
  let rows = [], importing = false, done = false, imported = [];
  const setState = (entry, state, message) => {
    entry.row.dataset.state = state;
    entry.state.textContent = message;
  };
  const selection = () => {
    const chosen = rows.filter((entry) => entry.input.checked);
    $('importSelection').textContent = `已选择 ${chosen.length} / ${rows.length} 本 · ${bytes(chosen.reduce((n, e) => n + e.file.size, 0))}`;
    $('confirmImport').textContent = `导入 ${chosen.length} 本书`;
    $('confirmImport').disabled = !chosen.length;
  };
  $('file').multiple = true;
  $('file').onchange = (event) => {
    const files = [...event.target.files];
    event.target.value = '';
    if (!files.length || importing) return;
    done = false;
    imported = [];
    $('importTitle').textContent = `选择了 ${files.length} 个文件`;
    $('importStatus').textContent = '';
    show($('cancelImport'), true);
    show($('openImportedBook'), false);
    $('importList').replaceChildren();
    rows = files.map((file) => {
      const problem = !supported.test(file.name) ? `暂不支持 ${format(file.name)} 格式` : !file.size ? '文件为空，请重新选择' : '';
      const row = document.createElement('label');
      row.className = 'import-item';
      const input = document.createElement('input');
      input.type = 'checkbox'; input.checked = !problem; input.disabled = !!problem;
      input.setAttribute('aria-label', '导入 ' + file.name);
      const detail = document.createElement('span'); detail.className = 'import-item-detail';
      const name = document.createElement('strong'); name.textContent = file.name;
      const meta = document.createElement('small'); meta.textContent = `${format(file.name)} · ${bytes(file.size)}`;
      const state = document.createElement('small'); state.className = 'import-item-state';
      detail.append(name, meta, state);
      if (h.books().some((b) => b.name === file.name)) {
        const notice = document.createElement('small'); notice.className = 'import-duplicate-note';
        notice.textContent = '已有同名书，将保留原书并另存为独立副本。';detail.append(notice);
      }
      row.append(input, detail);$('importList').append(row);
      const entry = { file, row, input, state, problem };
      setState(entry, problem ? 'failed' : 'waiting', problem || '等待导入');
      input.addEventListener('change', () => {setState(entry, 'waiting', input.checked ? '等待导入' : '未选择');selection();});
      return entry;
    });
    const rejected = rows.filter((entry) => entry.problem).length;
    if (rejected) $('importStatus').textContent = `${rejected} 个文件不能导入，原因见上方；其他文件仍可继续。`;
    selection();
    dialog.showModal();
  };
  $('cancelImport').onclick = () => dialog.close();
  dialog.addEventListener('cancel', (event) => { if (importing) event.preventDefault(); });
  $('openImportedBook').onclick = async () => {
    if (!imported.length) return;
    const book = imported[0];
    dialog.close();h.navigate('library');h.beforeOpen();await h.open(book);
  };
  $('confirmImport').onclick = async () => {
    if (done) {dialog.close();h.navigate('library');return;}
    const chosen = rows.filter((entry) => entry.input.checked);
    if (!chosen.length) return;
    importing = true;
    $('confirmImport').disabled = true;show($('cancelImport'), false);
    rows.forEach((entry) => entry.input.disabled = true);
    let failed = rows.filter((entry) => entry.problem).length;
    for (const [index, entry] of chosen.entries()) {
      $('importStatus').textContent = `正在导入 ${index + 1} / ${chosen.length}`;
      setState(entry, 'importing', '正在导入…');
      try {
        const book = await h.importFile(entry.file);
        imported.push(book);setState(entry, 'success', '已导入');
      } catch (error) {
        failed++;
        const reason = error?.name === 'QuotaExceededError' ? '存储空间不足，请先备份再检查设备空间。' : String(error?.message || '导入未完成，请重试').slice(0, 160);
        setState(entry, 'failed', '未导入：' + reason);
      }
    }
    importing = false;done = true;
    $('importStatus').textContent = `已导入 ${imported.length} 本书` + (failed ? `。${failed} 个文件未导入，原因见上方。` : '');
    $('confirmImport').disabled = false;$('confirmImport').textContent = '好';
    $('openImportedBook').textContent = imported.length === 1 ? '打开这本书' : '阅读第一本';
    show($('openImportedBook'), imported.length > 0);
    h.refresh();
  };
}
