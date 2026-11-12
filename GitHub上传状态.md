# 发布与验证状态

核验日期：2026-11-13（Asia/Shanghai）。当前版本见package.json，以下是本次交付证据，不能替代下一轮实时核对。

| 部分 | 本次已核验状态 |
| --- | --- |
| 私有站点 | https://reading-room-1109.tangqichen2007.chatgpt.site ，Sites第30版，发布成功，owner-only权限保持 |
| Sites应用源码 | 4a1381683cc8be1e1c39a7e426e5b2069b962ef7 |
| GitHub APK／网页基线 | v1.7.3标签 → 3e556f9e2ea4ef0cbd9f156a7650a0c4d3fb8bac |
| GitHub后续代码修复 | 5d57674dcb899afbd9cba1fa15264f498059dc0f，补Linux启动与跨平台临时目录；之后交付文档提交不改变APK网页资源 |
| Android交付 | 1.7.3 / code13，原包名原签名，255个assets/reader资源与最终dist逐一一致 |
| APK SHA256 | 630631ccb1028963242fc4360775de515c5ba74a733f7f5734860606e277478e |
| GitHub资源 | APK与sha256文件均独立下载回读一致；当前树git ls-files output/为0，历史不改写 |
| 本机服务 | 已核对完整脚本身份并重启，最后核验PID26780，127.0.0.1:38749；native-bridge.js返回200，发现一个本机Codex程序候选；本轮未发真实模型请求 |

- 公开源码：https://github.com/haycel07/reading-room
- APK与校验文件：https://github.com/haycel07/reading-room/releases/tag/v1.7.3
- 历史附件：https://github.com/haycel07/reading-room/releases/tag/history-2026-11-12
- 干净环境CI：https://github.com/haycel07/reading-room/actions/runs/43279665183 （状态以本轮最终核验为准）

## 验证

本机npm test的20个默认套件、宿主JVM真实Java地址／连接策略、summaries、formats、docx-html通过。桌面与手机设置提示已实际查看。首轮Linux CI暴露LOCALAPPDATA假设，下一轮又暴露Windows TEMP假设；均已修复，并用os.tmpdir处理默认测试输出。CI最终状态在下方补记，不把失败或进行中算作通过。

最终CI已通过：干净Ubuntu检出、npm ci、Playwright Chromium安装、20个默认回归套件、JDK17真实Java策略测试全部成功。证明提交5d57674dcb899afbd9cba1fa15264f498059dc0f，运行43279665183。之后仅补交付文档，未改变应用、测试或安装包资源。

原签名证书SHA256：638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26。未做Android真机／模拟器验收，未调用真实AI或真实服务商密钥。

## 旧包与原文件

本次主目录旧1.7.2 APK和上一版临时部署包，均先确认GitHub附件并独立回读SHA256一致，再删除本地副本；保留最新1.7.3 APK。之前的68项旧包清理、旧气泡包清理记录仍在对应忽略审计目录。

output/github/repository此前整目录及24份旧附件物理删除被自动审批拒绝（仅返回blocked by policy），本轮不重试该删除、不绕过限制。此次只停止跟踪发布仓库当前树的output产物，文件仍在该检出副本中，Git历史也仍在，不能声称物理目录已清空或仓库历史体积已缩小。

审计：output/review-fixes，包括APK、GitHub附件回读、旧包清理、受保护原文件SHA256和CI结果。修改说明.md、商机与功能路线报告.md、research内三份原文件保留且哈希不变，未自动提交或上传。浏览器真实书架／进度／对话／笔记和原始书籍未动；许可证按用户要求跳过。
