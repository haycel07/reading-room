# GitHub 上传及旧版本清理（2026-11-12）

本轮按用户要求更新当前公开源码并归档本机旧版本：上传、回读SHA256核对后再删除本地副本。当前开发目录 `reading-room/dist` 与最新 `output/android/一页之间-1.7.1.apk` 保留；签名、服务、真实书籍和浏览器数据不清理。

- 当前源码：https://github.com/haycel07/reading-room/tree/main/dist
- 当前安卓发布：https://github.com/haycel07/reading-room/releases/tag/v1.7.1
- 历史版本与文件校验清单：https://github.com/haycel07/reading-room/releases/tag/history-2026-11-12
- 本轮完整审计：`output/version-cleanup-20261112/`（本机忽略目录，不含凭据；完成后会记录独立下载和逐文件删除结果）。

本轮涉及68个旧包／发布附件，约117MiB；另在推送核对完成后删除临时GitHub源码检出。GitHub已有历史不删、不改写；后续发版遵守同一规则，避免本机重新积累旧版本。当前源码与Sites源码分别维护，不能把Sites推送当作GitHub同步。旧记录如下，仅作为历史。

---

# GitHub 上传状态（2026-11-11）

已成功创建公开、独立仓库：https://github.com/haycel07/reading-room 。源码、README、测试、第三方许可、交接文档及归档、启动脚本、各版自研 APK 和动效预览已提交到 main。

Android 1.4.0 Release：https://github.com/haycel07/reading-room/releases/tag/v1.4.0 ，包含 APK、SHA256 及安装说明。APK SHA256：66f3842e19494f5afce3ebf614a1bc1e0db4343074c5324133a48e6e93146b91。

GitHub 源码提交以独立仓库 output/github/repository 为准；最初导入基于原项目 a507f699c52e8097f8afacc9803a3b1c129d0b3d，保留原项目的 Sites 发布历史，没有改写它。GitHub main 与原项目 Sites 提交 SHA 不同。后续更新需在该独立仓库提交/推送，或在新环境直接克隆 GitHub 仓库；仅修改原项目目录不会自动同步到它。

使用官方 GitHub CLI 完成授权、建仓与推送，网络使用本机系统代理。授权已保存在系统凭据管理器，不包含在仓库或上传包中。用户最终决定公开，并禁止浏览器操作；这次使用命令行完成。

不含真实书籍、浏览器数据库、个人阅读记录/笔记/对话、API 密钥、签名私钥、DPAPI 文件、companion-work、构建缓存或 Anx 官方研究 APK。原数据与签名仍留在本机。

网页与 APK 功能、运行方法、第三方许可和验证限制见 README 与交接文档。此前设备码过期、网络失败、尚未上传的描述只代表历史；压缩包也是准备阶段快照，GitHub main 才是当前发布源码。
