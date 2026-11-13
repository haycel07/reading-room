# 发布与验证状态

核验日期：2026-11-13（Asia/Shanghai）。以下为1.7.4本轮交付证据，下一轮需重新核对，不照抄PID和历史行为。

| 部分 | 最终核验 |
| --- | --- |
| 私有站点 | https://reading-room-1109.tangqichen2007.chatgpt.site ，Sites31，发布成功，仍仅owner可访问 |
| Sites应用源码 | 3448a6b38bc9913710a0847b57e52e22c8cfe092 |
| GitHub应用源码及v1.7.4标签 | 4951a976f7f59bc77b3a8fa3faada1d30fd4c4f8；与Sites独立历史，之后仅补交付文档 |
| Android | 1.7.4 / code14，原包名原签名，259个assets/reader资源与dist逐一一致 |
| APK SHA256 | f93a75dffa409a5ca5ebc04b9ef67777bfb574f2f4cccf935b0938d98b4bb524 |
| GitHub附件 | APK与sha256文件均独立下载回读一致，latest指向v1.7.4；当前树git ls-files output/为0 |
| 本机服务 | 完整路径确认后重启，最后核验PID34320，127.0.0.1:38749，新配色／引导资源HTTP200；未调用真实AI |

- [公开源码](https://github.com/haycel07/reading-room)
- [1.7.4安装包与校验](https://github.com/haycel07/reading-room/releases/tag/v1.7.4)
- [干净Ubuntu CI](https://github.com/haycel07/reading-room/actions/runs/43289613335)：提交4951a976f7f59bc77b3a8fa3faada1d30fd4c4f8，22个默认隔离套件与JDK17真实Java策略均成功。
- [历史附件](https://github.com/haycel07/reading-room/releases/tag/history-2026-11-12)

## 验证边界

本机22个默认套件全部通过，进度锚点另作连续压力复测；1440/390/320尺寸实际查看正文、配色设置与首次流程。参考的是Windows Anx运行观察和固定版本源码／既有REA包证据，详见Anx阅读配色与新手引导.md。所有回归使用虚构书或替身，无真实模型调用。已有书架、阅读进度、对话、笔记、原始书籍、密钥和用户提示词未修改。

原签名证书SHA256：638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26，v2/v3验证通过。Android多文件选择仅编译核验；未做真机或模拟器验收，不把桌面浏览器尺寸模拟当成手机实机。PDF原页面不反色，扫描件仍无OCR。

## 旧包与原文件

旧主目录1.7.3 APK及上轮临时部署归档均已独立下载并核对远端SHA256，然后删除这两份本地文件；主目录保留最新1.7.4 APK和本轮部署归档。审计在output/reading-appearance，含APK、CI、附件回读、旧文件删除与受保护原文件记录。

output/github/repository此前物理删除被自动审批拒绝（blocked by policy），本轮没有重试或绕过。该发布检出当前Git树不跟踪output产物，物理旧文件和Git历史仍保留，不能声称全部旧副本已清空或历史已缩小。

修改说明.md、商机与功能路线报告.md、research内三份原文件SHA256保持不变，未提交或上传；临时Git排除已恢复。许可证按用户要求跳过。
