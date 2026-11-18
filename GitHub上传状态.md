# 1.9.3 发布与验证状态

| 部分 | 已核验 |
| --- | --- |
| 私有站点 | [Sites 38](https://reading-room-1109.tangqichen2007.chatgpt.site) 生产部署成功，所有者 1，组与外部访客 0 |
| Sites 源码 | `b5b6dd6c7b77be3fd5b641ddd4a50bb8b2613d52` |
| GitHub 版本 | [v1.9.3](https://github.com/haycel07/reading-room/releases/tag/v1.9.3) 固定 `8e41889246085215d2e30713279ffcb1ec122394` |
| GitHub CI | [运行 44305499257](https://github.com/haycel07/reading-room/actions/runs/44305499257) 通过 38 套默认回归与 Java |
| 本地回归 | 45 套离线回归和 Java 通过 |
| 本机 | 127.0.0.1:38749，加载新共享协议，已读回 1.9.3 |
| APK | 原签名 v2/v3，code21，SHA256 `b3d041cd101267b1618fa86946aed3587f29404d4eb78caf128d9c4a2f496e8f` |
| 资源 | 本机、Sites 归档和 APK 的 263 项文件一致。线上 262 项非 HTML 字节一致，HTML 验证结构 |

Site 项目 `appgprj_6af1187a5f00819189e42bf3474abdb3`，版本 `appgprj_6af1187a5f00819189e42bf3474abdb3~appgver_a76ac5941b1c8191854c0c7ff15affdd`，部署 `appgdep_6afd9d4cc97c819187f800f9dbc34df3`。

自北京时间 20:39:01 起的 248 分钟冻结耐久仍在运行，预计次日 00:47 结束。 虚构材料的两次本机 Codex 选句分别耗时 34.0 和 33.0 秒。候选列表分别为 35 和 53 句，分别命中第 2 和 52 句。 安卓真机和用户线上模型账号仍待验。最新本机 APK 在 `output/android/一页之间-1.9.3.apk`。

1.9.2 APK 与站点归档已独立下载核对 SHA256 后清理本机包副本。协作文件、报告和用户资料均保存在本机。
