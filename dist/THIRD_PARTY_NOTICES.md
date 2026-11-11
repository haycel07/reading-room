# 第三方组件与许可证

- foliate-js：用于 EPUB、MOBI/KF8（AZW3）、FB2 和 CBZ。来源：本机保存的 eddmann/Marginalia 项目中的 `packages/foliate-js`，其许可证及版权声明保留于 `foliate/LICENSE`。`foliate/fixed-layout.js` 的 polyfill 导入在本项目中被移除，改为依赖现代浏览器原生支持。
- zip.js 2.7.52：用于 ZIP 格式，许可证 `foliate/vendor/LICENSE.zip.js`。
- fflate 0.8.2：用于相关压缩数据，许可证 `foliate/vendor/LICENSE.fflate`。
- Mozilla PDF.js：用于 PDF 阅读；许可证 `pdfjs/LICENSE`，字体与字符映射的许可证随各自文件夹保留。
- Mammoth.js 1.11.0：用于 DOCX 导入；许可证 `mammoth/LICENSE`。

这些组件被打包到本项目中。电子书文件及解析在浏览器端处理；用户主动使用 AI 时，所需文本会发送给用户配置的服务，或本机 Codex。自动伴读会提前准备当前区与下一区。


## 界面设计参考（2026-11-10）

本轮书库、目录信息结构参考 Anx Reader 官方项目的封面网格、章节层级和当前位置定位方式，使用本项目独立实现，未复制 Anx 品牌、插画、书封或 Dart 代码。
参考版本：`Anxcye/anx-reader` commit `0c7fc1ad4551f7dbbeba6a6468f69d830957fa2a`；该版本 LICENSE 为 MIT。
来源：https://github.com/Anxcye/anx-reader/tree/0c7fc1ad4551f7dbbeba6a6468f69d830957fa2a


## OpenCC-JS 1.4.2（2026-11-10 新增）

- 用于生成简体／繁体 TXT 副本；独立于原书文本、阅读进度和注释。
- 来源：https://github.com/nk2028/opencc-js ，npm 官方 `opencc-js@1.4.2` 包；下载后按 registry 的 SHA512 integrity 校验。
- 程序代码 MIT，内置 opencc-data 字典 Apache-2.0。完整许可保存在 `opencc/LICENSE`、`opencc/THIRD_PARTY_LICENSES.md` 和 `opencc/LICENSES/Apache-2.0.txt`。

## 本轮对 foliate-js 的本地修改

`paginator.js`、`fixed-layout.js` 的电子书 iframe sandbox 移除了 `allow-scripts`，保留 `allow-same-origin` 供父阅读器定位与划线。电子书自身脚本不执行，避免它读取用户配置的 AI 密钥或调用安卓桥接；互动脚本型电子书可能因此失去交互。原项目许可与版权文件保持不变。

本轮界面按用户指定的白色工业终端方向独立设计，未使用《明日方舟》标识、人物、美术或音频素材。前端设计流程使用已安装的 `frontend-design` 技能（anthropics/skills）；该技能不是应用运行依赖。

## Anx 发布产物研究与本次交互重建

本次进一步研究 Anx Reader **v1.14.0** 官方 Android arm64 发布包与同 tag 源码 `356b7183e8463e7c60d84a72502d0055e55a19fd`。使用 REA 检查 APK、识别 Flutter AOT、静态分析包内实际 JavaScript；包内 `book.js`、`view.js` 与 `index.html` 和该 tag 对应文件逐字节一致。

参考并在本项目重建的交互包括：分类设置、将设置真正应用于渲染器、合并频繁样式更新、调整布局后恢复 CFI、展开当前章祖先、搜索时不抢目录位置、点击热图日期查看书籍记录。目录、日历、偏好与 CSS 使用本项目独立实现，未移植 Flutter 二进制或整份 Dart UI。GitHub 式七行方格按用户指定设计。

Anx Reader 为 MIT；对应完整版权与许可保留在 [licenses/anx-reader-MIT.txt](licenses/anx-reader-MIT.txt)。官方发布与源码：https://github.com/Anxcye/anx-reader/releases/tag/v1.14.0 。完整证据边界见项目根目录 `Anx发布包研究与界面改版.md`；未将静态分析宣称为 Dart UI 反编译或 Anx 实机观察。

## Motion 14.12.0：应用共享元素动效

UI 实际调用 Motion 的免费 MIT JavaScript `animate` 弹簧引擎，并在本项目实现按钮到面板、书封到阅读页及返回、书架 FLIP 和目录/标签过渡；没有使用 Motion+ 的收费布局 API，也没有引入 React。

- GitHub：https://github.com/motiondivision/motion ，固定源码提交 `8f3409c05420e5eff238748e0cb58d0751ce66a1`（已核对版本与许可）。
- 官方发布包 `motion@14.12.0`，通过 npm registry SHA512 integrity 校验。运行文件是发布包原始 `dist/motion.js`，在本项目存放于共享 vendor 目录 `foliate/vendor/motion.js`，不修改电子书解析器。
- 完整 MIT 许可与版权保留在 [licenses/motion-MIT.txt](licenses/motion-MIT.txt)。离线打包，无第三方脚本CDN或遥测接入。
- 固定下载与校验脚本：项目根目录 `tools/vendor_motion.py`；研究和包原件在本机忽略的 `output/motion-research/`。
