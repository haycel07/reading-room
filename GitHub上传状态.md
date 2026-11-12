# 发布与验证状态

核验日期：2026-11-13（Asia/Shanghai）。应用版本1.7.4 / Android code14。本轮阅读配色与新手引导源码已经完成；发布回执将在部署核验后更新，不把上一轮状态当成本轮证明。

- 私有站点：https://reading-room-1109.tangqichen2007.chatgpt.site ，确认仍仅owner可访问；发布前基线Sites30。
- GitHub：https://github.com/haycel07/reading-room ，独立历史，不强推。
- 新APK原包名、原签名，259个assets/reader资源与dist逐一一致。SHA256：f93a75dffa409a5ca5ebc04b9ef67777bfb574f2f4cccf935b0938d98b4bb524。
- 原签名证书SHA256：638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26，v2/v3验证通过。
- 新增引导与配色回归通过，尺寸1440/390/320；进度锚点压力回归通过；宿主Java策略通过。完整默认22套及干净CI最终结果待当前运行结束写入。
- 正式本机服务已核对完整路径并重启，当前PID34320，127.0.0.1:38749，新配色和引导资源返回200；本轮未调用真实AI。

Android仅编译与资源／签名核验，未做真机或模拟器验收。真实书架、进度、笔记、对话和源书未动。新出现的research/、修改说明.md、商机与功能路线报告.md不自动提交或上传；许可证按用户要求跳过。

旧主目录APK与临时部署归档先上传GitHub、独立下载SHA256验证，再删除。output/github/repository之前被自动审批拒绝物理删除（blocked by policy），本轮不重试该删除或绕过限制。其当前Git树不跟踪output产物，物理文件与Git历史仍保留，不能说全部旧副本已清空。

本轮审计目录output/reading-appearance；历史归档：https://github.com/haycel07/reading-room/releases/tag/history-2026-11-12。
