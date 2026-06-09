# auto-allow-bash-plugin

自动放行只读 Bash 命令的 Claude Code 插件。

## 工作原理

通过 `PreToolUse` hook 拦截所有 `Bash` 工具调用，双重判定：

1. **本地正则快速放行** — 对 `ls`、`cat`、`git status|diff|log`、`npm ls` 等显然只读的命令直接放行，零延迟，零成本。检测到 `>` / `>>` 重定向、命令替换、`sudo` 等危险特征会立即跳过本地放行。
2. **LLM 兜底判定** — 正则未命中时调用 Haiku（`claude-haiku-4-5-20251001`）判断是否只读，最多重试 3 次。只读放行，否则回退到人工确认。

非只读命令（写文件、安装包、`git push`、`git commit` 等）始终需要人工确认。

## 前置条件

认证信息按 **进程环境变量 → `~/.claude/settings.json` 的 `env`** 顺序读取，提供以下任一即可：

- `ANTHROPIC_AUTH_TOKEN`（优先于 `ANTHROPIC_API_KEY`）
- `ANTHROPIC_API_KEY`

可选：`ANTHROPIC_BASE_URL`（自定义 API 网关地址）。

未配置认证时插件不会崩溃，会以"判定异常"为由回退到人工确认。

## 日志

每日判定日志写入插件目录下的 `log/auto-allow-YYYY-MM-DD.md`，记录命令内容、判定来源（`local` / `llm`）、模型、耗时、重试次数等，便于事后审计和规则调优。
