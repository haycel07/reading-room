# API连接测试与真实验收（2026-11-11）

新增设置中的“测试连接”，使用当前未保存的输入，仅发送一句短测试文字，不含书籍或对话，不写入密钥存储。保存配置与实测成功是不同状态。支持取消、30秒超时，以及修改地址/模型/密钥/服务商时立即撤销旧测试结果。

三条传输路径共用验证：网页版直接HTTPS、本机受限HTTPS转发、Android原生HTTPS桥接。认证/权限/余额/模型/限流/服务异常分别显示401/403/402/404/429/5xx，空回复不算成功；不回显服务商可能含密钥的原始错误正文。

真实DeepSeek验收：官方GET /models HTTP200，账户模型deepseek-flash与deepseek-v4-pro；官方POST /chat/completions HTTP200，短测试返回“连接成功”。本轮实际前端代码通过隔离的HTTPS页面来源直连两个模型，分别约0.7—0.9秒；修正后的本机转发也通过，约0.73秒。请求只用虚构连接测试文字；密钥经进程内存/stdin传入，未写入项目、日志、截图或Git。

实测发现并修复原转发器的Node DNS错误：autoSelectFamily请求lookup(all:true)，旧实现返回单地址而触发ERR_INVALID_IP_ADDRESS；现在返回全部已验证的公共地址数组，保留单地址兼容路径及私网拒绝。新增回归覆盖此约定。

独立回归：tests/api-connection.cjs覆盖网页/本机/原生桥接替身的草稿测试、不存储、六类HTTP错误、空回复、改配置抛弃旧结果、取消、超时；tests/mobile-platform.cjs与tests/data-api.cjs通过。

真实调用入口tests/api-connection-real.cjs必须显式--real并通过stdin提供密钥，默认不运行。采用隔离测试会话和本地最新资源，能验证实际HTTPS与CORS/原生替身以外的本机请求；不等同于生产网页加载验收或Android实机验收。READER_TEST_URL可指定验证服务端口。

没有其他五家服务商的真实密钥，仍未进行它们的真实生成验收。没有Android实机/模拟器。自动伴读内容质量未因连接测试而获得新的验收结论。DeepSeek官方接口依据：https://api-docs.deepseek.com/api/create-chat-completion/ 。

本机原38749服务尚保留旧转发模块缓存；本轮在独立38750验证服务加载最终修复，未迁移或清理原来源数据。原服务需正常重启才能载入转发修复。网页静态资源与安卓内置资源不受该旧进程缓存影响。
