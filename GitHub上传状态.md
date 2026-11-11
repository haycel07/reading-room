# GitHub 上传状态（2026-11-11）

用户已授权将阅读器项目完整上传到 GitHub。目标账号已通过连接器确认是 haycel07，但项目当前没有 GitHub 远端，也没有同名仓库。

当前未上传：连接器不提供创建仓库功能；Git Credential Manager 没有 github.com 凭据；Chrome 打开 GitHub 创建仓库页后进入登录页。没有向其他无关仓库上传，也没有修改已有仓库权限。GitHub 登录页已打开，后续需要用户完成登录，或提供已建立的目标仓库及可用推送登录。

待上传包：output/github/reading-room-github-ready.zip。内容包括当前完整源码快照、运行必需的本机服务/启动器、交接文档及归档、测试、第三方许可、全部现有自研安卓 APK 和构建校验文件、共享动效预览。具体路径和 SHA256 见包内 UPLOAD-MANIFEST.json。

不包含真实书籍、浏览器数据库、对话/笔记、API 密钥、安卓签名私钥、DPAPI 文件、companion-work、构建缓存、Anx 官方研究 APK 或研究原始包。本机所有原文件仍保留。压缩包是源码快照，不含 .git 历史。

目标仓库应默认私有。创建后优先上传可读源码并为 APK 创建 Release；不能只把 ZIP 上传后宣称源码已完整入库。当前包只是准备材料，不能视为上传成功。

克隆后运行：安装 Node.js，先在项目根创建空 companion-work 目录，再运行 node companion-server.cjs，访问 http://127.0.0.1:38749/。网页/安卓的用户 API 模式不需要电脑 Codex；电脑本机 Codex 模式还需要本机已安装并登录 Codex。

原 .gitignore 为此前静态站点发布而排除 companion-server.cjs/启动伴读服务.cmd。上传包中的 .gitignore 已去掉这两条排除，确保这两个运行源码文件在新仓库可被提交；项目原 .gitignore 未改。源码中的其他本机路径需要在新环境核对，不包含自动迁移的密钥或签名。
