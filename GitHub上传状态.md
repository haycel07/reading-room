# 发布与验证状态

核验：2026-11-18。当前应用1.8.0／Android code17；原私有站点Sites34与原签APK均已发布。冻结版三小时耐久已于05:29:58通过，五小时窗口已于05:48:45结束，交付记录已完成。

| 部分 | 已核验状态 |
| --- | --- |
| 本机正式服务 | http://127.0.0.1:38749/ ，核对完整脚本与无活动请求后重启，当前四个新资源已实际使用；未来操作须重查PID |
| 本机／Sites应用源码 | 2c391343ba5468630b4b64d02dc0efbfc37f365c |
| GitHub代码与v1.8.0 | 835dfaed7761bebafb177d15bd1d928ca69ef3c6；与Sites独立历史 |
| GitHub CI | https://github.com/haycel07/reading-room/actions/runs/44150373455 ，默认31套隔离回归及Java成功 |
| 本地完整回归 | 38套通过，另宿主Java通过；真实AI不在默认列表 |
| APK | 原包名chat.tangqichen.onepage，1.8.0／17，263项assets/reader与dist逐一字节一致 |
| APK SHA256 | 85bd7eef2c972bdad68f897b62897a2e4ea204856c671f1c599a3ce2fd2071b0 |
| 签名 | v2/v3通过，证书638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26 |
| 下载回读 | https://github.com/haycel07/reading-room/releases/tag/v1.8.0 ，APK及SHA文件已独立下载核验；tag固定代码提交835dfae |
| 私有站点 | https://reading-room-1109.tangqichen2007.chatgpt.site ，Sites34，succeeded；仅owner，零组和外部访客 |
| 生产资源与界面 | 262项非HTML资源字节一致；HTML有托管包装，核心阅读节点／脚本／样式一致；390与1440隔离交互通过，零模型调用 |

Sites版本ID：appgprj_6af1187a5f00819189e42bf3474abdb3~appgver_939b7b810ad081918ecb777dce184fb1

部署ID：appgdep_6afca0570e148191b353a419befb0c92

本地发布归档gzip SHA256：2ffc9a2c95d258d11b537e35678ec8e8938bf51e94d21cf540099eb444f4faf4。后端会重新封装tar，不能拿其存储内容hash冒充本地gzip文件hash。归档含263项阅读资源及托管清单，没有未知用户文件。源码、安装包和归档的应用资源已分别核对；另从GitHub代码提交835dfae独立下载源码tarball，263项dist资源全部字节相等，未依赖换行归一化，下载只在内存中处理。

## 真实调用与设备边界

伴读场景3次本机Codex：短评约12.1秒、区间概述13.6秒、追问10.5秒，实际显示气泡并聊天；其他用替身。线上资源回读与浏览器交互通过，不等于用户当前服务商账户或Android真机端到端验收。05:22对最终本机服务再做1次虚构短文真实复测，200成功，约11.0秒；本轮总计4次真实请求。未读取真实书籍、用户配置或密钥。

开发期三小时与冻结版三小时耐久均通过，时间部分重叠。冻结版长TXT运行10800秒、358次采样、零页面错误，源指纹始终一致，结束GC后JS堆约3.36MiB。证据为output/overnight-20261118/soak-current/result.json。整个五小时窗口中曾有执行额度中断，后台测试仍持续，交接文档如实记录。

## 旧版本清理

- 旧主目录APK1.7.6：GitHub资产742025487，独立回读SHA为8ee4081f56670cd5af378ce8d84b6a6ebf02ffc019b2a6fa666e944ee69368a5，核对后已删除主目录副本。
- Sites33旧临时归档：GitHub历史资产760569184，SHA86ccf13167f568df17144bab35dda88d5b2e854ad041401836cd279bf1e32b6d；独立回读后删除。追加sites33-archive-proof.json，不覆盖旧历史清单。
- 历史归档：https://github.com/haycel07/reading-room/releases/tag/history-2026-11-12 。本轮不重试此前被拒绝的public checkout旧产物删除；其保留不等于版本历史已物理清空。

后续仅交付文档提交不修改已发布的263项应用资源、APK或Site版本。保留真实用户数据，不强制刷新当前阅读页；用户刷新后载入新版本。
