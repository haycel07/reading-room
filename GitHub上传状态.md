# 发布与验证状态

核验日期2026-11-13（Asia/Shanghai），本机／GitHub／Android新版本1.7.6 / code16；线上仍为Sites32的1.7.5，不能混称全部已更新。

| 部分 | 已核验状态 |
| --- | --- |
| 正式本机阅读器 | http://127.0.0.1:38749/ ，已更新；确认原服务完整脚本且无活动请求后重启到PID34288，新reading-position.js返回200 |
| 本机应用提交 | 487f5624c82b220c0396050ffc1157813636d1b8；后续仅交付文档 |
| GitHub应用提交／v1.7.6 | 9903abf0d1ea552c87fae580d41acbebc875d114，与Sites独立历史；后续仅交付文档 |
| APK | 原包名原签名，1.7.6 / code16，260项assets/reader与dist逐一一致 |
| APK SHA256 | 8ee4081f56670cd5af378ce8d84b6a6ebf02ffc019b2a6fa666e944ee69368a5 |
| GitHub下载 | APK与sha256均独立下载回读一致，latest指向v1.7.6 |
| 私有线上站点 | https://reading-room-1109.tangqichen2007.chatgpt.site ，仍为Sites32，源码8a200841ddad7eb89af808e8da23e2ff1b03bbd7，owner-only不变 |

- [公开源码](https://github.com/haycel07/reading-room)、[1.7.6安装包](https://github.com/haycel07/reading-room/releases/tag/v1.7.6)。
- [本轮完整CI](https://github.com/haycel07/reading-room/actions/runs/43355264143)：已成功；干净Ubuntu检出、默认24套及JDK17真实Java策略全部通过。

## 线上发布阻塞

Sites helper提示凭据过期，按官方流程续取后，原生工具返回“Sites Git is not yet enabled for this client. Use a hosted Work session, or try again with the latest Codex and Sites plugin after rollout.”。没有推送新应用到Sites，没有保存／部署新版本，不用旧提交配新归档冒充来源。刷新线上站点仍是旧逻辑；先使用本机或1.7.6 APK。没有改访问范围。

恢复发布时先核对Site身份与owner-only，再续取可用源码凭据，使用Sites source helper推送现有本机提交并生成新归档，保存部署后核对精确来源。最后成功打开Sites源码结果为c40e68ce57d364218e99a168339883936ef02dfc；本机提交在此基础上，不覆盖或丢弃本地修复。阻塞回执output/reading-performance/sites-blocked.json不含凭据。

## 验证与真实边界

- 本机定向与分组回归通过，新增精确边界／大文本测量次数／隐藏书架不重建、旧任务让路和合法预备、关闭设置恢复；附加后段刷新、跨区迟到、PDF/EPUB及手动对话。首轮默认测试因旧PDF首屏假设失败；将机会放回折线以下后，PDF真实边界回归已通过，不掩盖该次退出码。
- 54000单位虚构文本靠后位置，定位从约3801.6ms、48619次测量降至约1–3ms、17次，截止偏移相同。只代表该函数该本机样例。
- 一次真实本机Codex（gpt-6.1-terra）约33152ms返回，390×844实际显示短评且完成后未再滚动；后续任务替身。脚本收尾取消隐藏复选框超时，finally已关闭隔离浏览器，不称整个脚本退出成功、不为收尾重复调用模型。
- 原签名证书SHA256：638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26，v2/v3通过。Android仅编译、资源与签名，未做真机／模拟器；其他服务商本轮未做真实请求。

## 保留与清理

旧主目录1.7.5 APK远端独立回读后已删除，保留最新1.7.6。Sites32部署归档虽已上传历史附件并回读，但它仍对应线上当前版本，因此保留，不当作过去版本删除。output/github/repository此前物理删除被自动审批拒绝（blocked by policy），不重试或绕过；旧物理副本和Git历史仍在，当前公开树不跟踪output。

真实书架／进度／对话／笔记／原书未动；research/、修改说明.md、商机与功能路线报告.md五份文件SHA256保持，未提交上传，临时Git排除恢复。许可证按用户要求跳过。证据目录output/reading-performance。

用户已确认主要使用线上私有网页，因此本轮目标的线上部分仍未完成。再次续取Sites凭据仍返回同一客户端功能不可用错误，get_site也没有提供备用源码凭据。不要把本机／APK验证当作用户线上问题已闭环。
