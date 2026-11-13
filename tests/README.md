# 验证入口

Node.js 22或更新版本（CI使用24）。从项目根目录运行：

```sh
npm ci
npx playwright install chromium
npm test
npm run test:android
```

`npm test` 的明确列表在 `tools/run-tests.cjs`，包括纯逻辑与隔离浏览器回归。运行器自行启动127.0.0.1随机空闲端口的静态服务，结束即关闭；没有AI转发、没有Codex执行，不依赖38749已有服务。浏览器测试使用新建上下文、原创虚构书与替身API。可用 `ONEPAGE_TEST_BROWSER` 指定浏览器，否则探测本机Chrome/Edge，最后使用Playwright下载的Chromium。

- `npm run test:unit`：纯逻辑、协议与模拟服务测试。
- `npm run test:browser`：当前阅读界面、设置、数据、边界与安全回归。
- `npm run test:all`：再加长文概括、恢复、偏好与附加功能测试。
- `npm run test:android`：宿主JVM编译并运行真实Java地址策略与TLS连接目标检查。需要JDK17或更新版本；这不等于安卓设备验收。

单个浏览器测试可用 `READER_TEST_URL` 指向手动启动的 `npm start`（默认38751），然后 `node tests/某套件.cjs`。API测试的虚拟域名由测试拦截，不实际调用服务商。

阅读导航回归包含常驻伴读入口的可见性、触控尺寸和点击进入聊天；气泡回归包含1440/390/320与横竖平板尺寸，确认工具隐藏期间新短评仍弹出、已有短评不随工具开关隐藏，回退依然收紧短评范围。

## 伴读性能与调度

`reading-performance.cjs`校验精确可见边界与测量复杂度，覆盖回退、改宽、结构化文本、关闭设置恢复和延迟完成无额外滚动弹出，防止隐藏书架重建及对话库重复读取。`preparation-scheduling.cjs`覆盖慢请求跨区取消、概述让路和合法预备不被误取消。`preparation-lag.cjs`、`preparation-resume.cjs`为本轮附加回归。

## 阅读配色与新手流程

默认24套中，配色／引导包括`reading-appearance.cjs`和`onboarding.cjs`。使用1440、390、320宽度隔离上下文，覆盖旧偏好迁移、快捷／完整面板同步、系统／手动主题、自定义对比度及备份恢复、EPUB原字体和PDF非反转；首次试读零自动AI、同名原书保护、多文件导入取消／部分失败／直接打开，以及跳过／重开指南。`style-position.cjs`还验证连续改字号后立即返回和切书不破坏原书的进度及精确锚点。

## 真实调用不在默认测试中

`*real*.cjs`、`model-latency.cjs`、`content-request-sample.cjs` 等为人工诊断工具，可能调用真实本机Codex或服务商、消耗额度、生成结果文件。执行前必须确认当前任务授权、端点与账户，使用虚构书；密钥只从stdin输入，不写入文件或日志。`npm run test:live` 会主动拒绝自动执行。不能用文件名通配符批量运行所有测试。

## 历史入口

`material-ui.cjs`、`reader-shell.cjs` 转到当前Anx主旅程；`mobile.cjs` 转到当前阅读导航；`shared-motion.cjs` 已更新为当前壳的真实Motion调用与减少动态验证。旧的 `reader-v2.cjs`、`marker.cjs` 等保留为历史源码，没有列入当前验收。不要为通过旧外观断言恢复手动已读标记或隐藏常驻返回/设置。

截图、编译输出与诊断保存在忽略的 `output/`，不上传真实书籍、账户配置或密钥。测试通过只证明对应环境；浏览器尺寸模拟、原生编译、Java策略测试和Android真机操作须分别报告。
