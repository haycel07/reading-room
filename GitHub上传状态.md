# 发布与验证状态

核验日期2026-11-13（Asia/Shanghai），当前应用1.7.6 / code16；Sites33已成功发布，本机、GitHub和APK的应用资源一致。之后交付文档提交不改变这些资源。

| 部分 | 已核验状态 |
| --- | --- |
| 正式本机阅读器 | http://127.0.0.1:38749/ ，已更新；确认原服务完整脚本且无活动请求后重启到PID34288，新reading-position.js返回200 |
| 本机应用提交 | 487f5624c82b220c0396050ffc1157813636d1b8；后续仅交付文档 |
| GitHub应用提交／v1.7.6 | 9903abf0d1ea552c87fae580d41acbebc875d114，与Sites独立历史；后续仅交付文档 |
| APK | 原包名原签名，1.7.6 / code16，260项assets/reader与dist逐一一致 |
| APK SHA256 | 8ee4081f56670cd5af378ce8d84b6a6ebf02ffc019b2a6fa666e944ee69368a5 |
| GitHub下载 | APK与sha256均独立下载回读一致，latest指向v1.7.6 |
| 私有线上站点 | https://reading-room-1109.tangqichen2007.chatgpt.site ，Sites33发布成功，源码446130da84e6842231e43573d5502c0e5f95d255，owner-only不变 |

- [公开源码](https://github.com/haycel07/reading-room)、[1.7.6安装包](https://github.com/haycel07/reading-room/releases/tag/v1.7.6)。
- [本轮完整CI](https://github.com/haycel07/reading-room/actions/runs/43355264143)：已成功；干净Ubuntu检出、默认24套及JDK17真实Java策略全部通过。

## 线上发布恢复

上一轮客户端源码凭据不可用的阻塞已解除。本次重新取得同一Site的凭据，使用已有本机代理恢复Git连接，官方source helper推送并打包精确提交446130da84e6842231e43573d5502c0e5f95d255；原生私有发布部署appgdep_6af6aa9dfd248191ac33d28278997840成功，保存版本33与该提交一致。

已逐一核验归档中的260项应用资源与dist、GitHub应用及原签名1.7.6 APK一致，并重新确认只有owner一名允许访问者，无组或外部访客。没有重新调用真实模型，也没有操作用户的线上书架或强制刷新其阅读页。用户需要刷新网页才能加载新脚本；开关仍在“设置→伴读”，保留原选择。

本次是部署核验，不冒充用户当前浏览器、API配置或Android真机验收。前次24套干净CI仍适用于相同应用资源；之前的真实本机Codex显示与本轮线上发布结果分别报告。回执在output/online-publication。

## 验证与真实边界

- 本机定向与分组回归通过，新增精确边界／大文本测量次数／隐藏书架不重建、旧任务让路和合法预备、关闭设置恢复；附加后段刷新、跨区迟到、PDF/EPUB及手动对话。首轮默认测试因旧PDF首屏假设失败；将机会放回折线以下后，PDF真实边界回归已通过，不掩盖该次退出码。
- 54000单位虚构文本靠后位置，定位从约3801.6ms、48619次测量降至约1–3ms、17次，截止偏移相同。只代表该函数该本机样例。
- 一次真实本机Codex（gpt-6.1-terra）约33152ms返回，390×844实际显示短评且完成后未再滚动；后续任务替身。脚本收尾取消隐藏复选框超时，finally已关闭隔离浏览器，不称整个脚本退出成功、不为收尾重复调用模型。
- 原签名证书SHA256：638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26，v2/v3通过。Android仅编译、资源与签名，未做真机／模拟器；其他服务商本轮未做真实请求。

## 保留与清理

旧主目录1.7.5 APK远端独立回读后已删除，保留最新1.7.6。Sites32部署归档已在GitHub历史附件独立回读；本次Sites33发布成功后，该旧归档也按精确路径删除。保留Sites33当前归档。output/github/repository此前物理删除被自动审批拒绝（blocked by policy），不重试或绕过；旧物理副本和Git历史仍在，当前公开树不跟踪output。

真实书架／进度／对话／笔记／原书未动；research/、修改说明.md、商机与功能路线报告.md五份文件SHA256保持，未提交上传，临时Git排除恢复。许可证按用户要求跳过。证据目录output/reading-performance。

