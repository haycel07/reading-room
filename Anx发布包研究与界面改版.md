# Anx 发布包研究与界面改版

2026-11-10。本轮已应用 `frontend-design` 和 `reverse-engineer-anything` 技能。使用官方固定发布包建立证据，再依据本项目的解析器和用户要求实现交互。

## 实际研究对象

- 官方 Anx Reader v1.14.0 Android arm64 APK，27,520,363 字节。
- APK SHA256：`ac17738ddd11c2b1834494b1a31d494384fcabefa8501c9587ab63fef20b1eb4`。
- 同 tag 源码 commit：`356b7183e8463e7c60d84a72502d0055e55a19fd`，MIT。
- 发布页：https://github.com/Anxcye/anx-reader/releases/tag/v1.14.0 。
- 本机研究原件、源码片段与原始 JSON：`output/anx-rea/`；完整台账 `output/anx-rea/研究台账.md`。这些研究产物不进入应用与线上资源。

## REA 实际证据

| 操作 | 证据 ID | 支持的结论 |
| --- | --- | --- |
| REA 6.7 inspect-artifact | `ev_65b5c1c26cab92c8b64ef607dcbc17a82519729573e574e06eead58d027f3782` | APK 成员和产物图 |
| REA 6.7 identify-flutter-build | `ev_9dd01cbf0c87d7ac62b154fea2e54023d904a0b3adffd2803eb69b925b0381d6` | Flutter AOT、arm64 libapp.so 18,678,704 字节 |
| REA 6.7 analyze-javascript-application | `ev_3ffeaf9958d90a826006785548be92c86cfdfddc2bfe02dfde448ab9946e8cff` | 从 APK 提取的 book.js/view.js 静态分析，导入图不完整，没有执行 |

普通 SHA256 字节校验另行证实 APK 的 `assets/foliate-js/src/book.js`、`view.js` 和 `index.html` 与同 tag 文件完全一致。该校验不是 REA 工具调用。

REA 6.8 的 Node 版本要求不匹配，因此补做了受当前 Node 支持的 6.7 分析，旧输出保留。Android 类反编译返回 `capability_unavailable`，未安装 JADX；没有 Dart UI 反编译、Anx 实机或模拟器观察，不能用源码推测冒充运行观察。

## 研究如何落到本项目

| Anx 同版本实现 | 本项目实现与检查 |
| --- | --- |
| more_settings 三类设置，内容切换过渡 | 五类设置：排版、阅读、伴读、语音、AI 服务；保留原控件 ID 和事件，新增控件接实际状态 |
| epub_player 300ms debounce → book.js changeStyle → renderer 属性和 CSS | 本项目 180ms 合并排版更新；依据本项目 foliate 的真实属性设置 flow/栏数，不能照搬版本不同的属性名 |
| changeStyle 保存 lastLocation.cfi 并恢复 | EPUB 栏数和分页/滚动切换后恢复 CFI；TXT 保留可见字符 Range，防止改字号后跳位置 |
| book_toc 展开当前祖先，章变动时定位，搜索不抢焦点 | 单实例目录移入阅读左栏；原生 details 分级折叠、章节搜索、当前章定位，手动滚动与搜索期间不抢位置 |
| heatmap 点击天数筛选统计 | 用户指定的 GitHub 式七行、周列等边小格，最近一年/年份、月份/星期、强度图例、键盘提示与单日书籍时长 |
| 主页与阅读页各有导航结构 | 阅读左侧只显示目录和竖向可跳转进度；顶部返回书架，手机使用同一目录抽屉 |
| 圆角控件与交互过渡 | 白色分层表面、分级圆角、按钮/目录/设置过渡；可选标准/轻柔/关闭，系统减少动态优先 |

相关源码证据具体行号与摘录在本地完整台账。没有复制 Anx 品牌、美术或二进制；完整 MIT 许可随应用保留在 `dist/licenses/anx-reader-MIT.txt`。

## 数据与验证

数据库版本、原文与注释偏移未迁移；既有自定义提示词与对话不因更名被改写。默认助手名称为“栞”，可在伴读设置改名；API 配置统一使用“API 密钥”，内部兼容字段不影响旧配置。新偏好与助手名字进入备份白名单，密钥仍排除。

隔离浏览器、虚构书籍与替身模型测试覆盖 1440/1024/390px、目录/竖向跳读、热图等边/闰日/单日筛选、设置实际效果、原文位置保持、快速改样式后返回/切书、EPUB 嵌套目录与 CFI、PDF 跳页、减少动态与旧提示词保留。`tests/fixture-nested.epub` 是虚构测试文件，不依赖临时 output。原有注释、上下文和预备评论相关回归也保留。

安卓增加醒屏和全屏宿主接口，Back 依次处理弹窗、抽屉、设置/伴读、全屏、书架。原生 Back 的实际脚本另有隔离网页回归；这不等于安卓实机验证。APK 使用同签名覆盖更新，不要求卸载；未连接真实安卓设备或模拟器。
