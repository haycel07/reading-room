# API 服务商预设与移动端适配（2026-11-10）

本轮继续使用 frontend-design 技能；OpenAI 预设通过 OpenAI Docs 技能查阅官方文档。以下地址/模型为查阅当天的预设，不代表所有账户都有权限、免费额度或已经真实请求成功。所有预设均可修改；保留兼容服务的自定义地址和模型输入。

## 预设依据

| 服务商 | 基础地址 | 预设模型 | 官方资料 |
| --- | --- | --- | --- |
| DeepSeek | https://api.deepseek.com | deepseek-flash、deepseek-v4-pro | https://api-docs.deepseek.com/ |
| 通义千问·中国内地 | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen3.7-plus、qwen3.8-max | https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope |
| 硅基流动 | https://api.siliconflow.cn/v1 | deepseek-ai/DeepSeek-V4-Flash、moonshotai/Kimi-K2.7-Code | https://docs.siliconflow.cn/docs/api/chat-completions-post |
| 智谱 GLM | https://open.bigmodel.cn/api/paas/v4 | glm-5.3 | https://docs.bigmodel.cn/cn/guide/develop/openai/introduction |
| Kimi·中国内地 | https://api.moonshot.cn/v1 | kimi-k3.1-pro、kimi-k3.1-pro-highspeed | https://platform.kimi.com/docs/get-api-key 及 https://platform.kimi.com/docs/models |
| OpenAI | https://api.openai.com/v1 | gpt-5.4-mini、gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-mini 及 https://developers.openai.com/api/docs/changelog |

通义地域密钥需与地域一致，官方已推荐空间专属域名，但说明表中通用旧域名仍可用；可以直接修改为自己的空间地址。硅基流动的模型名称与原厂不同，使用其自身接口示例，不把原厂模型ID直接拼过去。没有加入已下线的 deepseek-chat、moonshot-v1、kimi-k2.5 等旧预设。

## 密钥输入与配置兼容

- 改用普通 text 输入框，关闭自动大写、拼写检查与自动纠正，默认用CSS遮住显示；不设置password输入类型，避免主动触发部分输入法的密码安全键盘。显示/隐藏按钮不切换输入类型。
- 独立“粘贴”按钮：Android调用受信页面上的原生剪贴板接口，仅按钮点击时读一次；网页使用浏览器剪贴板权限。读取失败时提示长按粘贴，不自动读取剪贴板、不记录密钥。
- 切换服务商时，地址、模型、密钥各自保存在当前页面的独立草稿中；切换到未填的新服务商时不带走旧密钥。点保存才修改已有存储。旧自定义地址/模型与凭据保留；密钥仍默认会话存储，用户选择后才保存此设备；不进入备份。
- 安卓和线上网页不显示电脑Codex选项、链接或启动器提示，旧local模式在这两个入口以API界面处理。只有本机127.0.0.1且不是原生桥接页面才保留电脑本机入口。
- 网页直接访问用户配置的HTTPS服务，仍受服务商CORS许可限制；Android使用已有HTTPS原生接口，直接请求用户填写的服务。没有加入新的第三方密钥代理，未以用户真实密钥验证连通。

## 屏幕与键盘

Android API30及以上主动启用edge-to-edge，用原生FrameLayout父容器处理systemBars、displayCutout与ime的最大安全留白，并消费insets一次。WebView获得实际可用尺寸，不再仅给WebView自身加padding。键盘升降监听insets动画；全屏使用WindowInsetsController，支持手势临时唤出系统栏。API26–29保留旧版system UI与adjustResize兼容路径。

网页使用viewport-fit=cover、safe-area-inset与VisualViewport。设置内容区独立滚动，标题/关闭按钮留在面板上方，键盘出现时按可用高度重排；表单在手机使用16px字号。阅读区域按真实顶部控件和底部导航高度计算，横屏使用紧凑控件与目录抽屉；平板收窄侧栏。伴读聊天继续置于正文之后，不覆盖正文。

官方依据：https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets 及 https://developer.android.com/about/versions/15/behavior-changes-15 。没有将CSS安全区与原生留白重复叠加。

## 打开书本与数据保护

网页与安卓共用封面移入、沿书脊展开的短过渡；加载失败、切书、返回或打开设置时取消，不留下白色遮罩。关闭动效或系统减少动态时跳过。动画不修改正文/阅读锚点。

阅读位置恢复完成前标记aria-busy并禁用进度滑条；恢复后开放，避免用户的早期跳读被迟到的初始化覆盖。原数据库和书籍内容不迁移；改字号后立刻返回并切书的回归仍验证旧书进度与新书开头。

## 验证边界

`tests/mobile-platform.cjs` 在独立浏览器上下文使用虚构密钥与原文，覆盖网页/原生桥接替身、六服务商与自定义、模型联动、草稿隔离、普通遮罩输入、两种剪贴板路径、旧配置、320/360/412/844横屏/768/1280、安全区和键盘可用高度、动效取消与减少动态。原生桥接替身不等于Android设备实测。相关旧阅读、注释、备份、后段恢复与格式回归继续运行。

Android APK完成编译和签名校验，仍没有实机/模拟器验收；尤其厂商输入法、不同版本WebView与原生系统栏表现需要保留这一验证边界。没有清空或修改用户真实书库、笔记、对话和密钥。
