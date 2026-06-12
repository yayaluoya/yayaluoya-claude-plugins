# yayaluoya-claude-plugins

yayaluoya 的 Claude Code 插件市场。

## 现有插件

| 插件 | 类型 | 说明 |
| --- | --- | --- |
| [`auto-allow-bash-plugin`](packages/auto-allow-bash-plugin) | hook + command | 通过 `PreToolUse` hook 拦截 Bash 调用，本地正则 + Haiku 双重判定，只读命令直接放行，写操作仍需人工确认；附带 `/auto-allow-bash-config` 命令用于配置 LLM 判定提示词 |
| [`set-system-proxy-env-plugin`](packages/set-system-proxy-env-plugin) | command | 提供 `/set-system-proxy-env` 命令，读取系统代理配置并写入或清除 `~/.claude/settings.json` 的 `env` 字段 |
| [`git-plugin`](packages/git-plugin) | command | 提供 `/commit` 命令，按项目历史风格收集 diff、生成中文 commit 并安全提交 |

## 安装使用

```bash
# 添加市场（GitHub 远端）
/plugin marketplace add yayaluoya/yayaluoya-claude-plugins

# 安装插件
/plugin install auto-allow-bash-plugin@yayaluoya-claude-plugins
/plugin install set-system-proxy-env-plugin@yayaluoya-claude-plugins
/plugin install git-plugin@yayaluoya-claude-plugins
```
