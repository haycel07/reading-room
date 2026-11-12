const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/13/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.join(__dirname, '..');
const fixture = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/reading-preferences.css"><style>.hidden{display:none!important}body{margin:0;font:14px sans-serif}.settings{position:fixed;right:12px;top:12px;bottom:12px;z-index:5}.reading{max-width:1200px;padding:12px}.reader-wrap{height:600px;overflow:auto}.txt{font-size:20px;line-height:1.9;margin:auto}.meta{height:20px}#readingProgressRail{height:200px;width:8px;background:#ddd}.toc-list button{display:block}#readerTools .feature-row{display:flex}</style></head><body class="is-reading">
<button id="toggleSettings">阅读设置</button><button id="editCompanion">伴读设定</button><button class="open-ai-settings">AI设置</button><input id="proactiveEnabled" type="checkbox">
<div class="reading"><div class="meta">TXT 信息</div><div id="readerWrap" class="reader-wrap"><div class="txt structured"><p>这是原始段落，不应因为设置改变而修改字符。</p><p>${'足够长的阅读正文，用于测试键盘翻屏。'.repeat(300)}</p></div></div><div id="readingProgressRail"></div></div><div id="ebook" class="hidden"></div><div id="pdf" class="hidden"></div><button id="ebookNext">电子书下一页</button><button id="ebookPrev">电子书上一页</button><button id="next">PDF下一页</button><button id="prev">PDF上一页</button><div id="tocList" class="toc-list"><button>第一章</button></div>
<aside id="settings" class="settings hidden"><div class="settings-head"><h3>阅读设置</h3><button id="closeSettings">关闭</button></div><div class="setting"><label for="fontSize">文字大小</label><input id="fontSize" type="range" min="14" max="32" value="20"></div><div class="setting"><label for="encoding">编码</label><select id="encoding"><option>auto</option></select></div><section class="advanced-type"><h4>精细排版</h4><label>字距<input id="letterSpacing" type="range" min="0" max="4" step=".2" value="0"></label></section><details id="companionPreferences"><summary>设定</summary><input id="assistantName" value="栞"><textarea id="companionPrompt">用户自己的提示词</textarea><button id="saveCompanionSettings">保存</button></details><section class="ai-config"><h4>AI</h4><label>API密钥<input id="aiKey" type="password"></label></section><p class="settings-note">原始设置说明</p></aside>
<div class="companion-controls"><label for="persona">风格</label><select id="persona"><option value="gentle">温和</option></select></div><dialog id="readerTools"><section><h4>听书</h4><div class="feature-row"><label>音色<select id="ttsVoice"><option value="0">音色一</option><option value="1">音色二</option></select></label><label>语速<select id="ttsRate"><option value="1">1</option><option value="1.5">1.5</option></select></label><label>音调<input id="ttsPitch" type="range" min=".5" max="1.5" step=".1" value="1"></label><label>定时<select id="ttsSleep"><option value="0">0</option><option value="20">20</option></select></label></div><button id="ttsStart">开始</button><button id="ttsStop">停止</button><span id="ttsStatus"></span></section></dialog>
<script type="module">import{initReadingPreferences}from'/reading-preferences.js';const $=id=>document.getElementById(id);window.events={font:0,saved:0,wake:[],full:0,ebookNext:0,pdfNext:0};$('fontSize').oninput=()=>events.font++;$('saveCompanionSettings').onclick=()=>events.saved++;$('proactiveEnabled').onchange=()=>{if(!window.apiAvailable)$('proactiveEnabled').checked=false};$('toggleSettings').onclick=()=>$('settings').classList.toggle('hidden');$('closeSettings').onclick=()=>$('settings').classList.add('hidden');$('ebookNext').onclick=()=>events.ebookNext++;$('next').onclick=()=>events.pdfNext++;$('ttsStart').onclick=()=>{$('ttsStatus').textContent='已开始'};window.prefs=initReadingPreferences({styleEbook:()=>{},setWakeLock:v=>events.wake.push(v),toggleFullscreen:()=>events.full++,openSettings:()=>$('settings').classList.remove('hidden')});window.fixtureReady=true;</script></body></html>`;
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath:require('./reader-helpers.cjs').browserExecutable() });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.route('http://preferences.test/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: fixture });
      if (pathname === '/reading-preferences.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'dist/reading-preferences.js'), 'utf8') });
      if (pathname === '/reading-preferences.css') return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(root, 'dist/reading-preferences.css'), 'utf8') });
      return route.fulfill({ status: 404 });
    });
    await page.goto('http://preferences.test/');await page.waitForFunction(() => window.fixtureReady);
    await page.locator('#toggleSettings').click();
    assert.equal(await page.locator('[role=tab]').count(), 5);
    assert.equal(await page.locator('#fontSize').count(), 1);
    assert.equal(await page.locator('.range-ruler').count(), await page.locator('#settings input[type=range]').count(), '所有设置滑条都有刻度');
    assert.equal(await page.locator('#readerHeadingScaleValue').innerText(), '1.15', '倍率读数保留实际步长精度');
    for (const ruler of await page.locator('.range-control').all()) {
      const values = await ruler.evaluate(el => { const input=el.querySelector('input');return {min:input.min,max:input.max,marks:[...el.querySelectorAll('.range-tick.major')].map(x=>x.dataset.value)}; });
      assert(values.marks.some(x => Number(x) === Number(values.min)) && values.marks.some(x => Number(x) === Number(values.max)), '刻度必须包含范围两端');
    }
    await page.locator('#fontSize').fill('24');assert.equal(await page.evaluate(() => events.font), 1, '原有控件事件在移动后保留');
    assert.equal(await page.locator('#fontSize').getAttribute('aria-valuetext'), '24 px');
    await page.locator('#readerHeadingScale').fill('1.25');assert.equal(await page.locator('#readerHeadingScaleValue').innerText(), '1.25');
    const original = await page.locator('.txt').textContent();
    await page.locator('#textColumnWidth').fill('600');await page.locator('#paragraphIndent').fill('2');
    assert.equal(await page.locator('.txt p').first().evaluate(node => getComputedStyle(node).textIndent), '40px');
    assert.equal(await page.locator('.txt').evaluate(node => Math.round(node.getBoundingClientRect().width)), 600);
    assert.equal(await page.locator('.txt').textContent(), original, '缩进和排版不改动原文字');
    await page.locator('#preferences-tab-type').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#preferences-tab-reading').getAttribute('aria-selected'), 'true');
    await page.locator('#ebookReadingFlow').selectOption('scrolled');assert(await page.locator('#ebookColumnCount').isDisabled());
    await page.locator('#ebookReadingFlow').selectOption('paginated');await page.locator('#ebookColumnCount').selectOption('2');
    await page.locator('#showReaderProgress').uncheck();assert(await page.locator('#readingProgressRail').isHidden());
    await page.locator('#showReaderMeta').uncheck();assert(await page.locator('.meta').isHidden());
    await page.locator('#readerKeepAwake').check();assert.deepEqual(await page.evaluate(() => events.wake), [true]);
    await page.locator('#readerFullscreen').click();assert.equal(await page.evaluate(() => events.full), 1);
    await page.locator('#preferences-tab-companion').click();
    await page.locator('#preferencesCompanionEnabled').click();assert(!await page.locator('#preferencesCompanionEnabled').isChecked(), 'API校验失败后设置开关回退');
    await page.evaluate(() => window.apiAvailable = true);await page.locator('#preferencesCompanionEnabled').check();assert(await page.locator('#proactiveEnabled').isChecked());
    assert.equal(await page.locator('#assistantName').count(), 1);assert.equal(await page.locator('#companionPrompt').inputValue(), '用户自己的提示词');await page.locator('#saveCompanionSettings').click();assert.equal(await page.evaluate(() => events.saved), 1);
    await page.locator('#preferences-tab-voice').click();await page.locator('#ttsRate').selectOption('1.5');await page.locator('#ttsPitch').fill('1.2');await page.locator('#ttsSleep').selectOption('20');await page.locator('#ttsVoice').selectOption('1');
    const pitchWidth=await page.locator('#ttsPitch').evaluate(el=>({track:el.getBoundingClientRect().width,wrapper:el.closest('.range-control').getBoundingClientRect().width}));assert(Math.abs(pitchWidth.track-pitchWidth.wrapper)<1,'语音滑条轨道不能继承旧工具栏宽度上限，刻度应与轨道对齐');
    await page.locator('#ttsVoice').evaluate(node => node.replaceChildren(new Option('音色二', '0'), new Option('音色一', '1')));await page.waitForFunction(() => document.getElementById('ttsVoice').value === '0');
    await page.locator('#preferences-tab-reading').click();await page.locator('#readerMotion').selectOption('off');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.motionMode), 'off');
    await page.emulateMedia({ reducedMotion: 'reduce' });await page.locator('#readerMotion').selectOption('standard');assert.equal(await page.evaluate(() => prefs.effectiveMotion()), 'off');
    await page.emulateMedia({ reducedMotion: 'no-preference' });assert.equal(await page.evaluate(() => prefs.effectiveMotion()), 'standard');
    await page.locator('#closeSettings').click();await page.locator('body').click({ position: { x: 500, y: 20 } });await page.keyboard.press('PageDown');await page.waitForFunction(() => document.getElementById('readerWrap').scrollTop > 100);
    await page.evaluate(() => { document.getElementById('ebook').classList.remove('hidden'); });await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(() => events.ebookNext), 1);
    await page.reload();await page.waitForFunction(() => window.fixtureReady);await page.locator('#toggleSettings').click();assert.equal(await page.locator('#textColumnWidth').inputValue(), '600');await page.locator('#preferences-tab-reading').click();assert.equal(await page.locator('#ebookColumnCount').inputValue(), '2');await page.locator('#preferences-tab-voice').click();assert.equal(await page.locator('#ttsRate').inputValue(), '1.5');assert.equal(await page.locator('#ttsPitch').inputValue(), '1.2');assert.equal(await page.locator('#ttsSleep').inputValue(), '20');
    const output = path.join(root, 'output/settings-qa');fs.mkdirSync(output, { recursive: true });
    for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 900 });await page.screenshot({ path: path.join(output, 'preferences-' + width + '.png') });assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)); }
    console.log('PASS 设置分类/键盘导航、原事件与提示词保留、缩进和宽度真实生效、API开关回退、EPUB模式/栏数持久化、语音偏好与音色重排、元信息/进度隐藏、动效系统优先、键盘翻屏；无真实书籍或API');
  } finally { await browser.close(); }
})().catch(error => { console.error(error);process.exitCode = 1; });
