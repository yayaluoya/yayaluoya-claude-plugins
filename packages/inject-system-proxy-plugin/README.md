# inject-system-proxy-plugin

在 Claude Code 会话启动时，自动读取系统代理配置并注入到环境变量中。

## 工作原理

通过 `SessionStart` hook 在每次会话启动时执行，读取系统代理后将以下环境变量写入 `CLAUDE_ENV_FILE`：

- `HTTP_PROXY` / `http_proxy`
- `HTTPS_PROXY` / `https_proxy`
- `NO_PROXY` / `no_proxy`（来自代理绕过列表）

系统代理未启用或未配置时，插件静默退出，不写入任何内容。

## 支持平台

| 平台 | 读取方式 |
| --- | --- |
| Windows | 注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings` |
| macOS | `networksetup -getwebproxy` |
| Linux | `gsettings`（GNOME） |
