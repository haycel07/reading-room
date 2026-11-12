# Anx Windows 实机对照与改版

日期：2026-11-12，Asia/Shanghai。用户确认：先按电脑实机做，兼顾手机布局。本轮接续版本26 / 源码 `5a9e02e2bac31f0da5567826203c6fe7760c5569`，发布后版本和提交以 Sites 返回结果及 Git HEAD 为准。

## 实际运行的对象与证据

- 官方稳定版 Anx Reader **1.14.0 Windows portable**，下载自 https://github.com/Anxcye/anx-reader/releases/tag/v1.14.0 。不是模拟网页，也不是把 APK 静态分析称为实机。
- ZIP：`output/anx-live-20261112/Anx-Reader-windows-1.14.0.zip`，32,976,388字节，SHA256 `052bc63717f912b6962f3b98f11f86eea3337223d54ca9a18b48be7aa0051c86`。
- 可执行文件：`output/anx-live-20261112/portable/anx_reader.exe`。Windows Authenticode 验证通过，签名者 SignPath Foundation；本轮实际启动并通过原生 Windows 窗口操作。
- REA CLI 6.7.0 对 ZIP 的结构证据：`output/anx-live-20261112/rea-windows-package.json`，Evidence `ev_466cc7cb75a0425e71f3369fa7525c4cc27c92c7a9c9f0e47d725f27c761fe7e`。这条证据只证明 ZIP 静态结构；原生运行观察另由 Sky 截图和操作记录支持。
- 原版界面截图 `output/anx-live-20261112/screens/01-library.png` 至 `15-ai-home.png`。覆盖书架、导入确认、长按／右键管理、详情、干净阅读、工具栏、目录、样式、详细设置、阅读内AI、划词、统计、笔记、全局设置、全局AI。
- 使用原创虚构 EPUB《雨停之前》，作者“虚构作者”，未配置 Anx API 密钥。原版的选区批注成功留下引文记录；自动输入的自定义笔记文字未确认保存，不把它计为成功。
- 旧文档“未运行 Anx 实机”描述的是之前的 Android 静态研究，本轮已增加 Windows 实际运行；仍没有安卓真机／模拟器逐屏验收。

## 采用的操作与界面

| 区域 | 当前实现 |
| --- | --- |
| 主导航 | 桌面80px浅灰蓝窄栏：书架、统计、AI、笔记、设置；手机底部导航。保留“一页之间”品牌，不复制 Anx 标识。 |
| 书架 | 顶部搜索、导入、排序／分组／视图菜单；阅读状态筛选芯片；紧凑封面网格。新导入电子书提取标题、作者和封面，原文件独立保留。 |
| 导入 | 可多选文件，先勾选确认，再逐本导入，显示结果，点击“好”回书架；取消不会导入。支持格式仍由本项目解析器决定。 |
| 书籍管理 | 桌面右键／触屏长按封面，底部操作面板；更多中可共享源文件、查看详情。详情可编辑展示书名、作者、分组和阅读状态，不改原文件。删除仍须用户确认。 |
| 阅读 | 隐藏书架导航，沉浸正文。轻点中间显示／收起顶部工具和底部胶囊；左右14%边缘翻页／翻屏。正文位置和控制栏显示相互独立。 |
| 目录 | 覆盖式抽屉，目录／书签两页、章节搜索和当前章定位；跳章自动收起，提供“后退／关闭”。进度导航移到底部胶囊的进度弹层。 |
| 样式 | 底部快速弹层绑定原有字号、行距、段距、字体、电子书翻页方式和配色；齿轮进入完整五类设置。已有偏好、人物提示词与身份配置保留。新设备 EPUB 默认双栏上限，窄屏由引擎适配；已有单栏配置保留。 |
| 划词 | 复制、划线、笔记、解释、搜索、翻译、本地朗读、分享；解释／翻译沿用明确划选和已读约束。复制、笔记不调用模型。 |
| 伴读 | 桌面右侧独立栏，手机正文下方独立区域；不覆盖阅读视口。本轮后续反馈改成横屏右侧／竖屏顶部两行气泡，不预留底栏；点气泡后打开聊天。 |
| 全局笔记 | 书籍列表与笔记详情。离开阅读页保存精确 `lastVisibleAnchor`；只展示该边界允许的笔记。旧记录没有精确边界时，先回到书中查看，不能按百分比猜测字符偏移。 |
| 全局 AI | 选择一本书，先恢复真实阅读位置，再进入该书对话；不在隐藏的正文上计算范围，防止把整本书当成已读。 |
| 统计／设置 | 独立页面入口；统计保留用户指定的 GitHub 七行方格、选年和日期明细；设置入口保留AI服务、人物、听书和备份。 |

颜色与布局从实机取样：背景约 `#f3f2f7`，导航 `#e3e7f0`，选中态 `#d9e4f6`，主色 `#3b6088`。正文继续以白色为默认；保留用户已选阅读颜色与字体。Windows Mica 和系统标题栏属于系统效果，网页没有伪造电池、窗口按钮或同步状态。

## 代码与数据边界

- `dist/anx-interface.js/.css`：主导航、书架、导入、书籍详情、全局页和最终视觉层。独立实现，无 Flutter UI／二进制移植。
- `dist/anx-reader-shell.js`：沉浸阅读、目录抽屉、胶囊工具、快速样式、真实进度与跳转后退。`app.js` 已改用本文件；旧 `reader-shell.js` 保留在仓库但不再加载。
- `app.js`：导入只保存新记录；展示元数据和封面与源文件分开。TXT 连续普通行合并为较少文本节点，原文字符顺序、换行、章节节点和注释偏移不变，避免长书数万个内联节点造成布局阻塞。
- 布局缩小不等于用户回退：打开伴读保留之前实际可见的精确边界；实际滚动、跳章、翻页、书籍切换时立即失效。EPUB 使用渲染器 relocation reason 区分重排与导航。没有设置延时窗口来放行真正回退后的较后内容。
- EPUB iframe 的 Escape／翻页键转交外层；隐藏控件时将焦点还给正文，避免 `:focus-within` 让胶囊栏一直显示。
- 所有数据库版本、原始存储名和已有记录兼容；没有迁移清库、重导用户真书、覆盖人物提示词。旧手动已读标记仍停用。
- 被 Git 忽略的 `companion-server.cjs` 增加三个新静态资源路由。已核对38749监听的完整本项目脚本路径，只重启该服务。Sites 部署不会分发该本机脚本。

## 验证与复现

均为隔离 Chrome 上下文、虚构书和 API 替身。截图在 `output/anx-live-20261112/web/`。不是安卓真机结果，也没有本轮真实 AI 费用／延迟测量。

主要入口：

```powershell
node tests/anx-runtime-ui.cjs
node tests/anx-library-notes.cjs
node tests/annotations.cjs
node tests/companion.cjs
node tests/selection.cjs
node tests/content-selection-browser.cjs
node tests/continuous-reading.cjs
node tests/prepared.cjs
node tests/prepared-formats.cjs
node tests/preparation-resume.cjs
node tests/summaries.cjs
node tests/mobile-platform.cjs
node tests/android-navigation.cjs
node tests/style-position.cjs
node tests/reading-preferences.cjs
node tests/anx-features.cjs
node tests/data-api.cjs
```

包括1440／1024／390主旅程，多选导入与取消、真实封面、书籍元数据、返回／刷新、跳章后退、EPUB双栏与 iframe 点击／键盘、样式代理、旧偏好和提示词保留、伴读不挡正文；全局笔记前进／回退／刷新隔离；TXT/PDF/EPUB划线、复制、编辑、缩放和恢复；长文连续概括、切书、生成中回退、缓存、失败；虚构备份追加恢复／原文件保留／密钥排除；320–1280多尺寸、横屏、安全区和缩小视口模拟键盘。

`reader-shell.cjs` 入口已转向当前主旅程；早期 `material-ui.cjs`、`reader-v2.cjs` 等属于旧版外观断言，不是新版 Anx 导航的验收入口。`content-selection.cjs`、`token-budget.cjs`、`token-api.cjs` 继续验证原有伴读协议；不能把固定替身字符数当成真实计费 token。

Android 交付：**1.7.0 / versionCode10**，包名与原签名保持，安装包 `output/android/一页之间-1.7.0.apk`。构建后须验证 v2/v3 原签名及 APK 内全部 `assets/reader/` 文件与最终 `dist` 一致；不卸载旧应用，不删除旧包。网页窗口测试与签名检查不能替代安卓实机验收。

## 保留的差异和限制

- 这是按 Windows 实际操作重建的主要界面与流程，不宣称每一个 Anx 页面、像素和平台行为完全一致。统计保留用户原先指定的七行热图；全局AI沿用本产品按书、按已读范围对话。
- 用户此前明确不处理 WebDAV／云书库，本轮仍没有加同步或释放云空间的假按钮；未复制 Anx 的全书分析入口以绕过防剧透。
- TXT 保持连续滚动并支持按屏前后翻；电子书使用本项目 Foliate 分页，PDF 保持原版面。没有把所有格式伪装成同一个原生翻页引擎。
- AI防剧透仍是尽力输入限制，模型已有知识、用户主动跳读、预备伴读提前发送当前／下一区等原有限制继续有效。
- 解析器和扫描件的文字层／OCR／DRM限制不变。本轮没有真实用户API、安卓真机、多设备自动同步验证。

## 许可证

参考官方 tag `356b7183e8463e7c60d84a72502d0055e55a19fd`，Anx Reader 为 MIT，版权2025 Anxcye，完整许可仍在 `dist/licenses/anx-reader-MIT.txt`。本轮只独立重建交互和视觉，不复制 Anx 商标、Flutter运行库、Dart UI 或第三方解析器实现；原有 Foliate、PDF.js、Mammoth、OpenCC、Motion 的版权和许可继续随 `dist` 与 APK 交付，未增加应用运行依赖。


最终本地构建核验：APK SHA256 `67c1db8269401e78b8d0015eba742c08c5d1b67a813df97990dcfee938f0094a`；v2/v3签名验证通过，证书仍为 `638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26`；254个APK阅读器资源与最终dist逐字节一致。本机38749的app、新UI模块、样式和动效HTTP响应与磁盘逐字节一致；核验监听PID33144、命令为本项目绝对路径companion-server.cjs，PID仅为本轮快照。


### 后续反馈：小气泡（2026-11-12）

用户指出底部伴读严重影响阅读，要求横屏上方／右侧、竖屏只能上方，并点击气泡再聊天。当前已取消底部168px短评区及关联工具栏抬高规则。小气泡两行显示、可关闭，正文几何在开启伴读和评论到达时保持不变；竖屏点击进入完整聊天页。全屏聊天期间冻结此前实际已读边界，视口变大不扩大上下文，实际回退仍立即隔离较后记录。Android新增1.7.1/code11，旧1.7.0哈希仍是历史包的有效记录。新截图和验证以 `output/companion-bubble/`、`tests/companion-bubble.cjs` 及交接文档最新追加为准。


气泡版构建核验：1.7.1/code11，APK SHA256 `9433e0445ab9605f6c1516f0f731555789882e11fbb775ceb7018023a21e5de3`；254个内置阅读器资源与本次最终dist逐字节一致，v2/v3原签名通过。
