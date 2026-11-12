import { setPanel } from "./ui-motion.js";
import { downloadFile, noteExport } from "./library-data.js";
const $ = (id) => document.getElementById(id);
const paths = {
  book: "M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15",
  stats: "m3 17 6-7 4 4 8-10",
  ai: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  note: "M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6",
  settings:
    "m9 3-1 3-3 1-2 4 2 2v3l3 2 2 3h4l2-3 3-2v-3l2-2-2-4-3-1-1-3z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  search: "M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  add: "M12 4v16 M4 12h16",
  sort: "M4 6h16 M4 12h11 M4 18h6",
  more: "M12 5h.01 M12 12h.01 M12 19h.01",
  back: "m15 5-7 7 7 7",
  close: "m6 6 12 12 M6 18 18 6",
  palette:
    "M21 12a9 9 0 1 0-9 9h2a2 2 0 0 0 1-4c-2-1 1-4 3-3 2 1 3 0 3-2 M7 10h.01 M10 6h.01 M15 7h.01",
  headphones: "M4 14v-3a8 8 0 0 1 16 0v3 M4 13H2v7h5v-7z M20 13h2v7h-5v-7z",
  progress: "M12 3a9 9 0 1 0 9 9 M12 3v9h9",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  copy: "M8 7h12v15H8z M4 17H2V2h13v2",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  share: "M12 15V2 M7 7l5-5 5 5 M5 12H3v10h18V12h-2",
  folder: "M3 6h7l2 3h9v12H3z",
  check: "m5 12 4 4L20 5",
};
export const icon = (name) =>
  '<svg class="anx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
  (paths[name] || paths.book) +
  '"/></svg>';
const button = (label, glyph, run) => {
  const b = document.createElement("button");
  b.type = "button";
  b.title = label;
  b.setAttribute("aria-label", label);
  b.innerHTML = icon(glyph);
  b.onclick = run;
  return b;
};
const titleOf = (b) => b.displayTitle || b.name.replace(/\.[^.]+$/, "");
export function coverElement(book) {
  const el = document.createElement("span");
  el.className = "bookicon";
  if (
    typeof book.cover === "string" &&
    /^data:image\/(png|jpeg|webp);base64,/.test(book.cover)
  ) {
    const image = document.createElement("img");
    image.src = book.cover;
    image.alt = "";
    el.append(image);
  } else {
    const label = document.createElement("span");
    label.textContent = titleOf(book).slice(0, 30);
    el.append(label);
  }
  return el;
}
export async function readBookMetadata(book) {
  if (book.type !== "ebook") return;
  let source;
  try {
    const { makeBook } = await import("./foliate/view.js");
    source = await makeBook(book.data);
    const meta = source.metadata || {},
      plain = (v) =>
        typeof v === "string"
          ? v
          : Array.isArray(v)
            ? v.map(plain).join("、")
            : v?.name || v?.value || "";
    book.displayTitle = plain(meta.title) || titleOf(book);
    book.displayAuthor = plain(meta.author) || plain(meta.creator);
    const blob = await source.getCover?.();
    if (blob && blob.size < 12 * 1024 * 1024) {
      const bitmap = await createImageBitmap(blob);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = Math.max(
          1,
          Math.round((bitmap.height * 240) / bitmap.width),
        );
        if (canvas.height > 800) canvas.height = 800;
        canvas
          .getContext("2d")
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        book.cover = canvas.toDataURL("image/jpeg", 0.83);
      } finally {
        bitmap.close();
      }
    }
  } catch {
    /* A missing cover must not prevent import. */
  } finally {
    source?.destroy?.();
  }
}
export function initAnxInterface(h) {
  document.body.classList.add("anx-layout");
  const nav = document.createElement("nav");
  nav.id = "appRail";
  nav.setAttribute("aria-label", "主导航");
  const brand = button("一页之间 · 返回书架", "book", () =>
    navigate("library"),
  );
  brand.className = "rail-brand";
  nav.append(brand);
  const items = document.createElement("div");
  items.className = "rail-items";
  nav.append(items);
  document.querySelector(".app").prepend(nav);
  for (const [id, label, glyph] of [
    ["library", "书架", "book"],
    ["statistics", "统计", "stats"],
    ["ai", "AI", "ai"],
    ["notes", "笔记", "note"],
    ["preferences", "设置", "settings"],
  ]) {
    const b = button(label, glyph, () => navigate(id));
    b.dataset.page = id;
    b.innerHTML += "<span>" + label + "</span>";
    items.append(b);
  }
  const main = document.querySelector("main"),
    page = document.createElement("section");
  page.id = "appPage";
  page.className = "hidden";
  main.append(page);
  let route = "library",
    selectedNoteBook = null,
    noteRevision = 0;
  function active(id) {
    route = id;
    document.body.dataset.appPage = id;
    items.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.page === id);
      b.setAttribute("aria-current", b.dataset.page === id ? "page" : "false");
    });
  }
  function leavePage() {
    noteRevision++;
    for (const d of document.querySelectorAll("dialog.app-page-dialog[open]")) {
      d.close();
      d.classList.remove("app-page-dialog");
    }
    page.replaceChildren();
    page.classList.remove("book-details");
    page.classList.add("hidden");
  }
  function navigate(id) {
    if (document.body.classList.contains("is-reading")) h.home();
    leavePage();
    active(id);
    $("welcome").classList.toggle("hidden", id !== "library");
    if (id === "library") return;
    page.classList.remove("hidden");
    if (id === "statistics") {
      const d = $("readingStats");
      $("statsToggle").click();
      d.close();
      d.classList.add("app-page-dialog");
      page.append(d);
      d.show();
      d.querySelector(".reader-dialog-head button").onclick = () =>
        navigate("library");
    } else if (id === "notes") renderNotes();
    else if (id === "preferences") renderPreferences();
    else if (id === "ai") renderAI();
  }
  function heading(text) {
    const title = document.createElement("h1");
    title.className = "app-page-title";
    title.textContent = text;
    page.append(title);
    return title;
  }
  function renderPreferences() {
    heading("一页之间");
    const intro = document.createElement("p");
    intro.className = "settings-overview";
    intro.textContent = "属于你的阅读时间";
    page.append(intro);
    const list = document.createElement("div");
    list.className = "settings-list";
    for (const [name, category, glyph, hint] of [
      ["阅读与排版", "type", "palette", "字体、留白、配色与翻页"],
      ["阅读伙伴", "companion", "ai", "栞的个性、选句与评论安排"],
      ["AI 服务", "ai", "ai", "服务商、模型与 API 密钥"],
      ["听书", "voice", "headphones", "本地音色、语速与定时"],
      ["备份与恢复", null, "folder", "书籍、阅读进度与笔记"],
    ]) {
      const b = button(name, glyph, () =>
        category ? h.preferences.open(category) : $("dataToolsToggle").click(),
      );
      const text = document.createElement("span");
      const strong = document.createElement("b");
      strong.textContent = name;
      const small = document.createElement("small");
      small.textContent = hint;
      text.append(strong, small);
      b.append(text);
      const arrow = document.createElement("span");
      arrow.textContent = "›";
      b.append(arrow);
      list.append(b);
    }
    page.append(list);
    const about = document.createElement("p");
    about.className = "page-hint";
    about.textContent =
      "书籍和记录保存在当前浏览器。本机、线上和安卓的数据分别保存。";
    page.append(about);
  }
  function renderAI() {
    heading("AI 对话");
    const section = document.createElement("div");
    section.className = "ai-home";
    const welcomeTitle = document.createElement("h2");
    welcomeTitle.textContent = "和阅读伙伴接着聊";
    const hint = document.createElement("p");
    hint.textContent =
      "选择一本书，恢复到上次阅读位置后开始。对话仍然跟随这本书的已读范围。";
    const list = document.createElement("div");
    list.className = "ai-book-list";
    for (const book of [...h.books()].sort(
      (a, b) => (b.progress || 0) - (a.progress || 0),
    )) {
      const b = document.createElement("button");
      b.type = "button";
      b.append(coverElement(book));
      const label = document.createElement("span");
      label.textContent = titleOf(book);
      b.append(label);
      b.onclick = async () => {
        leavePage();
        active("library");
        await h.open(book);
        await h.ready();
        h.controls(true);
        setPanel("companion", true);
      };
      list.append(b);
    }
    if (!list.children.length)
      hint.textContent = "先从书架导入一本书，再让栞陪你一起读。";
    section.append(welcomeTitle, hint, list);
    page.append(section);
  }
  async function renderNotes() {
    const rev = ++noteRevision;
    heading("笔记");
    const split = document.createElement("div");
    split.className = "all-notes";
    const list = document.createElement("div");
    list.className = "note-book-list";
    const detail = document.createElement("div");
    detail.className = "note-book-detail";
    split.append(list, detail);
    page.append(split);
    const records = await Promise.all(
      h.books().map(async (book) => ({
        book,
        marks: await h.annotations.store.list(book.id),
      })),
    );
    if (rev !== noteRevision) return;
    const available = records.filter((x) => x.marks.length);
    if (!available.length) {
      detail.innerHTML =
        '<div class="page-empty"><b>还没有笔记</b><p>阅读时选中文字，即可划线或写下想法。</p></div>';
      return;
    }
    for (const { book, marks } of available) {
      const b = document.createElement("button");
      b.type = "button";
      b.append(coverElement(book));
      const label = document.createElement("span");
      label.textContent = titleOf(book);
      const count = document.createElement("small");
      count.textContent = marks.length + " 条划线与笔记";
      label.append(count);
      b.append(label);
      b.onclick = () => select(book, marks, b);
      list.append(b);
    }
    const pick =
      available.find((x) => x.book.id === selectedNoteBook) || available[0];
    select(pick.book, pick.marks, list.children[available.indexOf(pick)]);
    function select(book, marks, trigger) {
      selectedNoteBook = book.id;
      [...list.children].forEach((b) =>
        b.classList.toggle("active", b === trigger),
      );
      detail.replaceChildren();
      const header = document.createElement("div");
      header.className = "note-book-header";
      const title = document.createElement("h2");
      title.textContent = titleOf(book);
      const summary = document.createElement("p");
      const anchor = book.lastVisibleAnchor,
        visible = marks.filter((m) => h.visible({ anchor: m.anchor }, anchor));
      summary.textContent =
        visible.length + " 条在上次阅读位置之前 · 共 " + marks.length + " 条";
      const open = button("回到书中", "book", async () => {
        leavePage();
        active("library");
        await h.open(book);
        await h.ready();
        $("notesToggle").click();
      });
      open.append("回到书中");
      const exp = button("导出已读笔记", "share", () =>
        downloadFile(
          titleOf(book) + "-笔记.md",
          "text/markdown",
          noteExport(visible, "md", titleOf(book)),
        ),
      );
      exp.append("导出");
      header.append(title, summary, open, exp);
      detail.append(header);
      if (!anchor) {
        const hint = document.createElement("p");
        hint.className = "page-hint";
        hint.textContent =
          "这本书还没有保存精确的已读边界。回到书中后，可查看当前位置之前的笔记。";
        detail.append(hint);
      }
      for (const mark of visible) {
        const card = document.createElement("article");
        card.className = "global-note";
        const quote = document.createElement("blockquote");
        quote.textContent = mark.quote;
        card.append(quote);
        if (mark.note) {
          const note = document.createElement("p");
          note.textContent = mark.note;
          card.append(note);
        }
        const jump = button("回到原文", "book", async () => {
          leavePage();
          active("library");
          await h.open(book);
          await h.ready();
          await h.jump(mark);
        });
        jump.append("回到原文");
        card.append(jump);
        detail.append(card);
      }
    }
  }
  // Search and actions occupy the same top bar as the observed desktop app.
  const toolbar = document.createElement("div");
  toolbar.className = "anx-library-top";
  toolbar.append(document.querySelector(".library-search"));
  const actions = document.createElement("div");
  actions.className = "library-top-actions";
  actions.append(
    button("备份与恢复", "folder", () => $("dataToolsToggle").click()),
    button("导入书籍", "add", () => $("file").click()),
  );
  const sort = document.createElement("details");
  sort.className = "library-sort-menu";
  const summary = document.createElement("summary");
  summary.title = "书架排序与显示";
  summary.setAttribute("aria-label", "书架排序与显示");
  summary.innerHTML = icon("sort");
  const menu = document.createElement("div");
  menu.className = "surface-menu";
  menu.append(
    $("librarySort"),
    document.querySelector(".view-switch"),
    $("libraryGroup"),
    $("aiOrganizeToggle"),
  );
  sort.append(summary, menu);
  actions.append(sort);
  toolbar.append(actions);
  $("welcome").prepend(toolbar);
  const filters = document.createElement("div");
  filters.className = "library-status-chips";
  for (const [value, label] of [
    ["finished", "已读完"],
    ["reading", "正在读"],
    ["unread", "未开始"],
    ["favorite", "收藏"],
  ]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.dataset.filter = value;
    b.onclick = () => {
      const select = $("libraryFilter");
      select.value = select.value === value ? "all" : value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncFilters();
    };
    filters.append(b);
  }
  toolbar.after(filters);
  function syncFilters() {
    filters
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.filter === $("libraryFilter").value),
        ),
      );
  }
  $("libraryFilter").addEventListener("change", syncFilters);
  syncFilters();
  $("librarySearch").placeholder = "搜索书籍";
  $("librarySearch").setAttribute("aria-label", "搜索书籍");
  $("libraryEmpty").querySelector("span").textContent = "( ˘ ᵕ ˘ )";
  $("libraryEmpty").querySelector("h2").textContent = "书架上没有书";
  $("libraryEmpty").querySelector("p").textContent =
    "点击右上角 ＋，添加喜欢的书。";
  // Staged multi-file import, followed by an explicit completion step.
  const importer = document.createElement("dialog");
  importer.id = "importDialog";
  importer.className = "reader-dialog import-dialog";
  importer.innerHTML =
    '<h2 id="importTitle"></h2><p class="page-hint">支持 EPUB、PDF、TXT、DOCX 等阅读格式</p><div id="importList"></div><p id="importStatus" role="status"></p><div class="import-actions"><button id="cancelImport" type="button">取消</button><button id="confirmImport" type="button">导入</button></div>';
  document.body.append(importer);
  let pending = [],
    importing = false,
    done = false;
  $("file").multiple = true;
  $("file").onchange = (e) => {
    pending = [...e.target.files];
    e.target.value = "";
    if (!pending.length) return;
    done = false;
    importing = false;
    $("importTitle").textContent = "选择了 " + pending.length + " 本书";
    $("importStatus").textContent = "";
    $("confirmImport").textContent = "导入 " + pending.length + " 本书";
    $("confirmImport").disabled = false;
    $("cancelImport").classList.remove("hidden");
    $("importList").replaceChildren();
    for (const f of pending) {
      const row = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = true;
      const name = document.createElement("span");
      name.textContent = f.name;
      row.append(input, name);
      $("importList").append(row);
    }
    importer.showModal();
  };
  $("cancelImport").onclick = () => importer.close();
  importer.addEventListener("cancel", (e) => {
    if (importing) e.preventDefault();
  });
  $("confirmImport").onclick = async () => {
    if (done) {
      importer.close();
      navigate("library");
      return;
    }
    const files = pending.filter(
      (_, i) => $("importList").children[i].querySelector("input").checked,
    );
    if (!files.length) {
      $("importStatus").textContent = "请选择至少一本书";
      return;
    }
    importing = true;
    $("confirmImport").disabled = true;
    $("cancelImport").classList.add("hidden");
    importer.querySelectorAll("input").forEach((i) => (i.disabled = true));
    let success = 0;
    const errors = [];
    for (const file of files) {
      $("importStatus").textContent =
        "正在导入 " + (success + errors.length + 1) + " / " + files.length;
      try {
        await h.importFile(file);
        success++;
      } catch (e) {
        errors.push(file.name + "：" + e.message);
      }
    }
    importing = false;
    done = true;
    $("importStatus").textContent =
      "已导入 " +
      success +
      " 本书" +
      (errors.length ? "。" + errors.join("；") : "");
    $("confirmImport").disabled = false;
    $("confirmImport").textContent = "好";
    h.refresh();
  };
  // Right-click on desktop and long-press on touch expose book actions.
  const sheet = document.createElement("dialog");
  sheet.id = "bookActions";
  sheet.className = "reader-dialog book-actions-sheet";
  document.body.append(sheet);
  let holdTimer;
  function bookActions(book) {
    sheet.replaceChildren();
    const info = document.createElement("div");
    info.className = "book-actions-info";
    info.append(coverElement(book));
    const title = document.createElement("b");
    title.textContent = titleOf(book);
    info.append(title);
    const remove = button("移除书籍", "trash", async () => {
      sheet.close();
      await h.remove(book);
    });
    const details = document.createElement("details");
    details.className = "book-more";
    const summary = document.createElement("summary");
    summary.setAttribute("aria-label", "更多书籍操作");
    summary.innerHTML = icon("more");
    const menu = document.createElement("div");
    menu.className = "surface-menu";
    for (const [label, run] of [
      [
        "共享文件",
        () =>
          downloadFile(
            book.name,
            book.data.type || "application/octet-stream",
            book.data,
          ),
      ],
      [
        "详情",
        () => {
          sheet.close();
          showDetails(book);
        },
      ],
    ]) {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = run;
      menu.append(b);
    }
    details.append(summary, menu);
    sheet.append(
      info,
      remove,
      details,
      button("关闭书籍操作", "close", () => sheet.close()),
    );
    sheet.showModal();
  }
  $("libraryGrid").addEventListener("contextmenu", (e) => {
    const el = e.target.closest("[data-book-id]"),
      book = h.books().find((b) => b.id === el?.dataset.bookId);
    if (book) {
      e.preventDefault();
      bookActions(book);
    }
  });
  $("libraryGrid").addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    const el = e.target.closest("[data-book-id]"),
      book = h.books().find((b) => b.id === el?.dataset.bookId);
    if (book) {
      const x = e.clientX,
        y = e.clientY;
      holdTimer = setTimeout(() => {
        el.dataset.longPress = "true";
        bookActions(book);
      }, 550);
      const clear = (event) => {
        if (
          event.type !== "pointermove" ||
          Math.hypot(event.clientX - x, event.clientY - y) > 8
        ) {
          clearTimeout(holdTimer);
          $("libraryGrid").removeEventListener("pointermove", clear);
        }
      };
      $("libraryGrid").addEventListener("pointermove", clear);
      $("libraryGrid").addEventListener("pointerup", clear, { once: true });
    }
  });
  $("libraryGrid").addEventListener(
    "click",
    (e) => {
      const el = e.target.closest("[data-long-press]");
      if (el) {
        delete el.dataset.longPress;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  function showDetails(book) {
    navigate("details");
    page.classList.add("book-details");
    const back = button("返回书架", "back", () => {
      page.classList.remove("book-details");
      navigate("library");
    });
    page.append(back);
    const hero = document.createElement("div");
    hero.className = "book-details-hero";
    hero.append(coverElement(book));
    const info = document.createElement("div");
    const title = document.createElement("h1");
    title.textContent = titleOf(book);
    const author = document.createElement("p");
    author.textContent = book.displayAuthor || "作者未提供";
    info.append(title, author);
    hero.append(info);
    page.append(hero);
    const grid = document.createElement("div");
    grid.className = "details-grid";
    const form = document.createElement("form");
    form.className = "details-card";
    for (const [key, label, value] of [
      ["displayTitle", "书名", titleOf(book)],
      ["displayAuthor", "作者", book.displayAuthor || ""],
    ]) {
      const row = document.createElement("label");
      row.textContent = label;
      const input = document.createElement("input");
      input.name = key;
      input.value = value;
      input.maxLength = 200;
      row.append(input);
      form.append(row);
    }
    const group = document.createElement("label");
    group.textContent = "分组";
    const gi = document.createElement("input");
    gi.name = "group";
    gi.value = h.features.info(book.id).group || "";
    group.append(gi);
    form.append(group);
    const stateLabel = document.createElement("label");
    stateLabel.textContent = "阅读状态";
    const state = document.createElement("select");
    state.name = "state";
    for (const [value, label] of [
      ["unread", "未开始"],
      ["reading", "正在读"],
      ["finished", "已读完"],
    ])
      state.add(new Option(label, value));
    state.value =
      h.features.info(book.id).state ||
      (book.progress > 0 ? "reading" : "unread");
    stateLabel.append(state);
    form.append(stateLabel);
    const save = document.createElement("button");
    save.textContent = "保存信息";
    form.append(save);
    form.onsubmit = async (e) => {
      e.preventDefault();
      book.displayTitle =
        form.elements.displayTitle.value.trim() || titleOf(book);
      book.displayAuthor = form.elements.displayAuthor.value.trim();
      h.features.updateInfo(book.id, {
        group: gi.value.trim().slice(0, 24),
        state: state.value,
      });
      await h.save(book);
      h.refresh();
      title.textContent = titleOf(book);
      author.textContent = book.displayAuthor || "作者未提供";
      h.notify("信息已保存，原文件保留");
    };
    const stats = document.createElement("div");
    stats.className = "details-card";
    const p = document.createElement("p");
    p.textContent = "阅读进度 " + Math.round((book.progress || 0) * 100) + "%";
    const date = document.createElement("p");
    date.textContent =
      "首次导入 " + new Date(book.added).toLocaleDateString("zh-CN");
    const format = document.createElement("p");
    format.textContent =
      (book.format || book.type).toUpperCase() +
      " · " +
      (book.data.size / 1024).toFixed(1) +
      " KB";
    const read = document.createElement("button");
    read.textContent = "继续阅读";
    read.onclick = () => {
      leavePage();
      active("library");
      h.open(book);
    };
    stats.append(p, date, format, read);
    grid.append(form, stats);
    page.append(grid);
  }
  document.addEventListener("click", (e) => {
    for (const d of document.querySelectorAll(".library-sort-menu[open]"))
      if (!d.contains(e.target)) d.open = false;
  });
  new MutationObserver(() => {
    if (document.body.classList.contains("is-reading")) {
      leavePage();
      active("library");
    }
    document.body.classList.toggle(
      "companion-docked",
      !$("companion").classList.contains("hidden"),
    );
    if($("companion").classList.contains("hidden"))document.body.classList.remove('bubble-chat');
  }).observe($("companion"), { attributes: true, attributeFilter: ["class"] });
  active("library");
  return { navigate, bookActions };
}
