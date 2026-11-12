import { setPanel, setShelfOpen } from "./ui-motion.js";
import { icon } from "./anx-interface.js";
const $ = (id) => document.getElementById(id);

// Back and settings stay visible. Only secondary reading tools are collapsible.
export function initReaderShell({
  home,
  seek,
  progress,
  catalog,
  notify,
  snapshot,
  restore,
}) {
  const sidebar = document.querySelector(".sidebar"),
    panel = $("tocPanel");
  const section = document.createElement("section");
  section.id = "readingSidebar";
  section.setAttribute("aria-label", "书籍目录");
  section.append(panel);
  sidebar.append(section);
  const tabs = document.createElement("div");
  tabs.className = "outline-tabs";
  tabs.innerHTML =
    '<button type="button" class="active" id="outlineChapters">目录</button><button type="button" id="outlineBookmarks">书签</button>';
  panel.prepend(tabs);
  const bookmarkHost = document.createElement("div");
  bookmarkHost.id = "outlineBookmarkList";
  bookmarkHost.className = "hidden";
  panel.append(bookmarkHost);
  $("outlineBookmarks").onclick = () => {
    tabs
      .querySelectorAll("button")
      .forEach((b) =>
        b.classList.toggle("active", b.id === "outlineBookmarks"),
      );
    $("tocList").classList.add("hidden");
    document.querySelector(".catalog-tools").classList.add("hidden");
    bookmarkHost.classList.remove("hidden");
    bookmarkHost.replaceChildren($("bookmarkList"));
    document.dispatchEvent(new Event("reading-bookmarks-open"));
  };
  $("outlineChapters").onclick = () => {
    tabs
      .querySelectorAll("button")
      .forEach((b) => b.classList.toggle("active", b.id === "outlineChapters"));
    $("tocList").classList.remove("hidden");
    document.querySelector(".catalog-tools").classList.remove("hidden");
    bookmarkHost.classList.add("hidden");
  };
  const back = document.createElement("button");
  back.id = "backToLibrary";
  back.type = "button";
  back.className = "back-library-button";
  back.setAttribute("aria-label", "返回书架");
  back.innerHTML = icon("back") + '<span>书架</span>';
  back.title = '返回书架';
  back.onclick = home;
  document.querySelector(".crumb").before(back);
  const top = $("reading").querySelector(".reading-top");
  document.querySelector("header").append(top.querySelector(".read-actions"));
  document.querySelector("header .read-actions").append($("toggleSettings"));
  $("toggleSettings").innerHTML = icon("settings") + '<span>设置</span>';
  $("toggleSettings").setAttribute("aria-label", "阅读设置");
  $("toggleSettings").title = '阅读设置';
  top.classList.add("hidden");
  const bar = document.createElement("nav");
  bar.id = "readerDock";
  bar.setAttribute("aria-label", "阅读工具栏");
  const add = (id, label, glyph, run) => {
    const b = document.createElement("button");
    b.id = id;
    b.type = "button";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = icon(glyph) + "<span>" + label + "</span>";
    b.onclick = run;
    bar.append(b);
    return b;
  };
  const showToc = () => {
    setPanel("tocPanel", true, { immediate: true });
    setShelfOpen(true);
    catalog.current();
  };
  add("dockToc", "目录", "book", showToc);
  add("dockNotes", "笔记", "note", () => $("notesToggle").click());
  add("dockProgress", "阅读进度", "progress", () => {
    const open = $("readingProgressRail").classList.toggle("hidden") === false;
    $("dockProgress").setAttribute("aria-expanded", String(open));
    $("quickStyle").classList.add("hidden");
  });
  add("dockStyle", "样式", "palette", () => {
    $("quickStyle").classList.toggle("hidden");
    $("readingProgressRail").classList.add("hidden");
    document.dispatchEvent(new Event("reading-settings-open"));
  });
  add("dockListen", "听书", "headphones", () => {
    $("readerToolsToggle").click();
    $("ttsStart").scrollIntoView({ block: "center" });
  });
  $("reading").append(bar);
  const rail = document.createElement("section");
  rail.id = "readingProgressRail";
  rail.className = "hidden reader-popover";
  rail.setAttribute("aria-label", "阅读进度导航");
  rail.innerHTML =
    '<h3>阅读进度 <output id="readingProgressValue" for="readingProgressSlider">0%</output></h3><input id="readingProgressSlider" type="range" min="0" max="1000" step="1" value="0" aria-label="阅读位置"><span id="readingProgressFill" hidden></span><div class="progress-chapters"></div>';
  rail
    .querySelector(".progress-chapters")
    .append(
      $("chapterPrev"),
      $("chapterNext"),
      $("ebookControls"),
      $("pdfControls"),
    );
  $("reading").append(rail);
  const quick = document.createElement("section");
  quick.id = "quickStyle";
  quick.className = "reader-popover hidden";
  quick.setAttribute("aria-label", "快捷样式");
  quick.innerHTML =
    '<div class="quick-style-head"><h3>样式</h3><button id="fullStyle" aria-label="更多阅读设置">' +
    icon("settings") +
    '</button></div><div class="quick-style-fields"></div><div class="quick-themes"></div>';
  for (const [source, label] of [
    ["fontSize", "文字大小"],
    ["lineHeight", "行间距"],
    ["paragraphSpacing", "段落间距"],
    ["fontFamily", "文字字体"],
    ["ebookReadingFlow", "电子书翻页方式"],
  ]) {
    const control = $(source);
    if (!control) continue;
    const row = document.createElement("label");
    const title = document.createElement("span");
    title.textContent = label;
    const output = document.createElement("output");
    const proxy = control.cloneNode(true);
    proxy.id = "quick-" + source;
    proxy.removeAttribute("aria-describedby");
    const sync = () => {
      proxy.value = control.value;
      output.textContent =
        control.tagName === "SELECT"
          ? ""
          : control.value + (source === "fontSize" ? " px" : " 倍");
    };
    sync();
    proxy.addEventListener(
      control.type === "range" ? "input" : "change",
      () => {
        control.value = proxy.value;
        control.dispatchEvent(
          new Event(control.type === "range" ? "input" : "change", {
            bubbles: true,
          }),
        );
        sync();
      },
    );
    control.addEventListener("input", sync);
    control.addEventListener("change", sync);
    row.append(title, output, proxy);
    quick.querySelector(".quick-style-fields").append(row);
  }
  for (const theme of document.querySelectorAll(".themes button")) {
    const b = theme.cloneNode(true);
    b.textContent = "A";
    b.onclick = () => {
      theme.click();
      quick
        .querySelectorAll(".theme")
        .forEach((x) =>
          x.classList.toggle("active", x.dataset.theme === theme.dataset.theme),
        );
    };
    quick.querySelector(".quick-themes").append(b);
  }
  quick.querySelector("#fullStyle").onclick = () => {
    quick.classList.add("hidden");
    $("toggleSettings").click();
  };
  $("reading").append(quick);
  const footer = document.createElement("div");
  footer.id = "readingFolio";
  footer.innerHTML =
    '<time></time><span class="folio-title"></span><span class="folio-progress"></span>';
  $("reading").append(footer);
  const clock = () =>
    (footer.querySelector("time").textContent = new Intl.DateTimeFormat(
      "zh-CN",
      { hour: "2-digit", minute: "2-digit", hour12: false },
    ).format(new Date()));
  clock();
  setInterval(clock, 60000);
  let scrubbing = false,
    history = [];
  const update = (value) => {
    const p = Math.max(0, Math.min(1, Number(value) || 0));
    if (!scrubbing)
      $("readingProgressSlider").value = String(Math.round(p * 1000));
    $("readingProgressValue").textContent = Math.round(p * 100) + "%";
    footer.querySelector(".folio-progress").textContent =
      Math.round(p * 100) + "%";
    footer.querySelector(".folio-title").textContent = $(
      "ebook",
    ).classList.contains("hidden")
      ? $("pdf").classList.contains("hidden")
        ? ""
        : $("page").value + " / " + $("pages").textContent
      : $("ebookPosition").textContent;
    $("readingProgressSlider").setAttribute(
      "aria-valuetext",
      Math.round(p * 100) + "%",
    );
  };
  $("readingProgressSlider").oninput = (e) => {
    scrubbing = true;
    update(Number(e.target.value) / 1000);
  };
  $("readingProgressSlider").onchange = async (e) => {
    remember();
    try {
      await seek(Number(e.target.value) / 1000);
    } catch {
      notify("位置跳转未完成，请重试");
    } finally {
      scrubbing = false;
      update(progress());
    }
  };
  $("tocToggle").onclick = showToc;
  $("mobileShelf").onclick = showToc;
  $("tocClose").onclick = () => {
    setShelfOpen(false);
    setPanel("tocPanel", false, { immediate: true });
  };
  const jumpback = document.createElement("div");
  jumpback.id = "readerJumpBack";
  jumpback.className = "hidden";
  jumpback.innerHTML =
    '<button id="jumpBack">← 后退</button><button id="closeJumpBack">× 关闭</button>';
  $("reading").append(jumpback);
  function remember() {
    const value = snapshot?.();
    if (!value) return;
    history.push(value);
    history = history.slice(-12);
    jumpback.classList.remove("hidden");
  }
  $("jumpBack").onclick = async () => {
    const previous = history.pop();
    if (previous) await restore?.(previous);
    jumpback.classList.toggle("hidden", !history.length);
  };
  $("closeJumpBack").onclick = () => {
    history = [];
    jumpback.classList.add("hidden");
  };
  function controls(visible) {
    document.body.classList.toggle("reader-controls", visible);
    if (!visible) {
      quick.classList.add("hidden");
      rail.classList.add("hidden");
      if(document.activeElement?.closest('#readerDock,#quickStyle,#readingProgressRail')){
        $('readerWrap').tabIndex=-1;
        $('readerWrap').focus({preventScroll:true});
      }
    }
  }
  function turnPage(delta) {
    document.dispatchEvent(new Event("reader-navigation"));
    controls(false);
    if (!$("ebook").classList.contains("hidden"))
      $(delta > 0 ? "ebookNext" : "ebookPrev").click();
    else if (!$("pdf").classList.contains("hidden"))
      $(delta > 0 ? "next" : "prev").click();
    else
      $("readerWrap").scrollBy({
        top: delta * $("readerWrap").clientHeight * 0.88,
        behavior:
          document.documentElement.dataset.motionMode === "off"
            ? "instant"
            : "smooth",
      });
  }
  function tap(event, clientX = event.clientX) {
    if (
      event.target.closest?.(
        "button,a,input,textarea,select,.initiative-card",
      ) ||
      document.querySelector("dialog[open]") ||
      !$("settings").classList.contains("hidden") ||
      !$("selectionTools").classList.contains("hidden") ||
      event.view?.getSelection()?.toString()
    )
      return;
    const bounds = $("readerWrap").getBoundingClientRect();
    if (clientX < bounds.left + bounds.width * 0.14) turnPage(-1);
    else if (clientX > bounds.right - bounds.width * 0.14) turnPage(1);
    else controls(!document.body.classList.contains("reader-controls"));
  }
  $("readerWrap").addEventListener("click", tap);
  document.addEventListener("reader-ebook-tap", (e) => {
    if (!e.detail.selected) tap(e.detail.event, e.detail.x);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.querySelector("dialog[open]"))
      controls(false);
  });
  $("readerWrap").addEventListener("wheel", () => controls(false), {
    passive: true,
  });
  document.addEventListener("reading-sidebar-change", (e) => {
    if (!e.detail.open) setPanel("tocPanel", false, { immediate: true });
  });
  let wasReading = false;
  new MutationObserver(() => {
    const active = document.body.classList.contains("is-reading");
    if (active !== wasReading) {
      wasReading = active;
      controls(false);
      history = [];
      jumpback.classList.add("hidden");
      sidebar.inert = !active;
      sidebar.setAttribute("aria-hidden", String(!active));
      if (!active) setShelfOpen(false);
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  $("libraryTitle").onclick = () => {
    home();
    $("librarySearch").value = "";
    $("shelfSearch").value = "";
    $("libraryFilter").value = "all";
    $("libraryGroup").value = "";
    $("librarySearch").dispatchEvent(new Event("input"));
  };
  $("brandHome").addEventListener("click", home);
  sidebar.inert = true;
  sidebar.setAttribute("aria-hidden", "true");
  update(progress());
  return { update, remember, controls };
}
