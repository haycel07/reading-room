# 1.9.1 发布与验证状态

| 部分 | 已核验结果 |
| --- | --- |
| 私有网页 | [Sites 36](https://reading-room-1109.tangqichen2007.chatgpt.site) 部署成功，所有者 1，组和外部访客均为 0 |
| Site 源码 | `f71944ee4581b3204c4b90215a9248725cb93c8c` |
| GitHub | [v1.9.1](https://github.com/haycel07/reading-room/releases/tag/v1.9.1) 固定 `68bbc4e7b3fb063e69e5d41e226156b971931181` |
| GitHub CI | [44245106993](https://github.com/haycel07/reading-room/actions/runs/44245106993) 成功，37 套离线回归及 Java 策略测试 |
| APK | 原签名 v2/v3，`chat.tangqichen.onepage`，code19，SHA256 `4eab0ccb32a2f125222dd399990590c5b88e349c8aa49c0167374c490cbb5077` |
| 回读 | GitHub 源码和 APK 内的 263 项阅读资源与 `dist` 逐字节相同。APK、校验文件和演示均从 GitHub 独立下载核验 |
| 生产回读 | 262 项非 HTML 资源逐字节一致。HTML 核对核心节点与依赖，390 和 1440 双尺寸隔离交互通过 |
| 本地回归 | 44 套和宿主 Java 通过。最终版耐久复验持续中 |

Site 项目 `appgprj_6af1187a5f00819189e42bf3474abdb3`，版本 `appgprj_6af1187a5f00819189e42bf3474abdb3~appgver_37873e6d7fe0819196bade6c2c26962f`，部署 `appgdep_6afd39982678819194d26a21d638cbb9`。本地部署 gzip SHA256 `d0f5350a4fd18a1b13079ae77e3c4ca72582d81bc4cbdca27372b9ec6263d876`。归档含阅读资源与托管清单，托管端重新封装后的 tar 有独立校验值。

Android 构建保留原证书 `638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26`。浏览器尺寸、触控、APK 构建和 Java 检查已核验，Android 真机待验。源和权限在发布前后分别核对。

诊断文件在本机 `output/companion-refinement-20261118/`，不随源码上传。只在旧 APK 或站点归档已上传、独立回读并核对 SHA 后清理指定的旧副本。

旧 1.8.0 与 1.9.0 的主目录 APK 和临时部署归档已在 GitHub 对应发布页独立回读核对，指定的四个本机副本已清理。
