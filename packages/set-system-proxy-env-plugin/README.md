# set-system-proxy-env-plugin

手动同步系统代理配置到 `~/.claude/settings.json` 的 `env` 字段。

这是一个**命令型插件**（无 hook），需要主动触发。

## 使用方式

在 Claude Code 中运行命令：

```
/set-system-proxy-env
```

- 系统代理**已启用**：将 `HTTP_PROXY`、`HTTPS_PROXY`、`NO_PROXY`（及小写变体）写入 `~/.claude/settings.json` 的 `env` 字段
- 系统代理**未启用或未配置**：从 `env` 字段中删除上述代理相关 key

## 支持平台

| 平台 | 读取方式 |
| --- | --- |
| Windows | 注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings` |
| macOS | `networksetup -getwebproxy Wi-Fi` |
| Linux | `gsettings`（GNOME） |

## 安装

```bash
/plugin install set-system-proxy-env-plugin@yayaluoya-claude-plugins
```
