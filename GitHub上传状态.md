# 发布与验证状态

核验日期2026-11-13（Asia/Shanghai）。1.7.5 / code15修复“隐藏阅读工具时伴读一起消失”：顶部伴读入口常驻，新短评和已出现气泡独立于工具栏；未改触发、上下文或数据结构。

| 部分 | 当前交付证据 |
| --- | --- |
| 私有站点 | https://reading-room-1109.tangqichen2007.chatgpt.site ，Sites32发布成功，仍仅owner访问 |
| Sites应用源码 | 8a200841ddad7eb89af808e8da23e2ff1b03bbd7 |
| GitHub应用源码／v1.7.5标签 | 6b4dbc2fd8aa0518d3b530bab53a78e93d2846b7；后续只补交付文档，与Sites独立历史 |
| 安装包 | 原包名原签名，1.7.5 / code15，259个assets/reader资源与dist逐一一致 |
| APK SHA256 | a4675ded8b491927f6e420e18d5291118cd3675c618cef2c90723e26e36222af |
| GitHub附件 | APK及sha256均独立下载回读一致，latest指向v1.7.5 |
| 正式本机服务 | 确认PID34320完整脚本身份，38749返回本轮新CSS；没有修改服务代码，无需重启 |

- [源码](https://github.com/haycel07/reading-room)、[安装包](https://github.com/haycel07/reading-room/releases/tag/v1.7.5)。
- [完整CI](https://github.com/haycel07/reading-room/actions/runs/43348433517)：已成功，干净Ubuntu检出、Node24、22套隔离回归及JDK17真实Java策略全部通过，证明上述应用提交。
- 本机三格式导航15组（1440/390/320/844横屏/768竖屏×TXT/PDF/EPUB）及气泡6尺寸通过；实际查看320竖屏和桌面截图。验证隐藏期间新短评弹出、已有短评持续可见、常驻伴读44px触控、点击进入聊天、回退范围收紧与阅读区域尺寸不变。

原签名证书SHA256：638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26，v2/v3通过。Android只有编译、签名和资源一致性核验，未做真机／模拟器验收；本轮无真实模型调用。

旧主目录1.7.4 APK和Sites31临时部署归档均确认GitHub附件并独立下载SHA256一致后删除，保留最新1.7.5与本轮部署归档。output/github/repository此前物理删除被自动审批拒绝（blocked by policy），没有重试或绕过；物理旧文件与Git历史仍在，当前公开树不跟踪output产物。

真实书架、进度、笔记、对话和原始书籍未改。research/、修改说明.md、商机与功能路线报告.md五份文件SHA256未变，未提交／上传，临时Git排除恢复。审计目录output/companion-visibility。
