# Android 外壳

最低Android8（API26），target35，包名chat.tangqichen.onepage。版本名和版本代码统一读取根目录package.json。安装包在GitHub最新Release；本机output/android仅保留最新APK。

```powershell
./android-app/build.ps1
```

可显式传入-VersionCode和-VersionName，但必须与package.json一致；清单注入失败会立即停止。原始签名必须完整存在，脚本不生成替代证书。原签名证书SHA256：638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26。签名与DPAPI文件不进入仓库。

前端资源随APK离线打包。Android、网页、本机服务的存储分别独立；覆盖升级保留应用数据，不先卸载。API使用使用者明确配置的公共HTTPS Chat Completions地址，默认443；拒绝私网、环回、链路本地、共享地址与DNS混合结果。TLS前检查实际连接目标仍在已验证地址集合中，保留系统证书和主机名验证，不跟随重定向，不记录密钥。最多两个并发原生AI请求。

原生能力通过只发给顶层应用来源的WebMessagePort提供，不使用暴露给所有frame的addJavascriptInterface。电子书iframe继续禁止脚本。文件导出仅使用系统保存窗口，异常恢复待保存状态；朗读仅用离线中文音色，进入后台停止，定时停止由原生Handler执行，并回报播放状态。

验证入口：npm test、npm run test:android。后者运行真实Java地址策略及连接目标检查，不是安卓替身。APK构建校验v2/v3原签名，资源须逐一比对dist。

未做安卓真机／模拟器验收，尤其新消息通道、不同WebView的blob/data资源、文件选择与保存、语音听感、后台行为和HTTPS传输集成仍需设备验证。不能把编译、浏览器模拟或宿主JVM测试称为真机通过。
