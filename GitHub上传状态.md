# 1.9.2 发布与验证状态

| 部分 | 已核验结果 |
| --- | --- |
| 私有网页 | [Sites 37](https://reading-room-1109.tangqichen2007.chatgpt.site) 部署成功，所有者 1，组和外部访客均为 0 |
| Site 源码 | `9d69cae296dfb4f0d3305da0186e516706fa3289` |
| GitHub | [v1.9.2](https://github.com/haycel07/reading-room/releases/tag/v1.9.2) 固定 `6166bd79aa42b4edc53b50d3cc9a591a0d376779` |
| GitHub CI | [44274215500](https://github.com/haycel07/reading-room/actions/runs/44274215500) 成功，38 套离线回归及 Java |
| APK | 原签名 v2/v3，`chat.tangqichen.onepage`，code20，SHA256 `fa70c2dff642259fc78dee828fc22fe4083063cd28f6ea889c0c6d481928ccbc` |
| 回读 | GitHub 源码、部署归档、APK 内的 263 项阅读资源与工作区逐字节相同。APK、校验文件及演示分别独立下载校验 |
| 生产回读 | 262 项非 HTML 资源逐字节一致。HTML 核对核心节点和依赖，390 和 1440 双尺寸隔离交互通过 |
| 本地回归 | 45 套和宿主 Java 通过，另有两版本各自固定源码的长时验证 |

Site 项目 `appgprj_6af1187a5f00819189e42bf3474abdb3`，版本 `appgprj_6af1187a5f00819189e42bf3474abdb3~appgver_9d0a85961ef88191819170e528f1bb86`，部署 `appgdep_6afd6a9586c08191baf689aa0055bc99`。部署 gzip SHA256 `6da5f27fc50091cf3807112e9bade6a882a569fd14ea4dc9bfbd465186085f6f`。远端重新封装 tar，有独立校验。两轮公开 CI 发布修正针对漏复制测试和 EPUB 重排下的测试竞态，最终 `dist` 保持一致。

1.9.1 运行 16500 秒，完成 342 次 TXT/PDF/EPUB 切换。1.9.2 在另一个隔离检出运行 3780 秒、79 次切换。两轮回书架后的 18 和 4 次回收采样中，文档计数最高分别为 1 和 1。每轮使用固定源码、虚构书与替身 API，检查读回位置、预览边界和 PDF 线程归属。调试器仍在采样中保留部分拆除的渲染节点，以上结果只说明旧文档不再累计。

1.9.2 的虚构 PDF 本机 Codex 问答通过，耗时 58.7 秒，返回书架后 PDF 解析线程为零。 APK 签名证书为 `638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26`。Android 真机待验。

本机 1.9.1 APK 和临时部署归档已在 GitHub 独立下载校验后清理。 保留最新本机安装包 `output/android/一页之间-1.9.2.apk`。本机 `talk/`、研究和用户附文件未随发布上传。
