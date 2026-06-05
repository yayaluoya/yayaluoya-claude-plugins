# auto-allow-bash

自动放行只读 Bash 命令的 Claude Code 插件。

## 工作原理

通过 `PreToolUse` hook 拦截所有 `Bash` 工具调用，双重判定：

1. **本地正则快速放行** — 对 `ls`、`cat`、`git status` 等显然只读的命令直接放行，零延迟。
2. **LLM 兜底判定** — 正则未命中时，调用 Haiku 模型判断命令是否只读。只读放行，否则交回人工确认。

非只读命令（写文件、安装包、git push 等）始终需要人工确认，不会被自动放行。

## 前置条件

`~/.claude/settings.json` 的 `env` 中需配置以下任一认证方式：

- `ANTHROPIC_AUTH_TOKEN`（优先）
- `ANTHROPIC_API_KEY`

可选：`ANTHROPIC_BASE_URL`（自定义 API 地址）

## 日志

每日判定日志写入插件目录下的 `log/auto-allow-YYYY-MM-DD.md`，包含命令内容、判定来源（local/llm）、耗时等。
