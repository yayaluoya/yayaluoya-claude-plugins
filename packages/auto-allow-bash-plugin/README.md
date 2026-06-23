# auto-allow-bash-plugin

自动放行只读 Bash / PowerShell 命令的 Claude Code 插件。

## 工作原理

通过 `PreToolUse` hook 拦截所有 `Bash` 与 `PowerShell` 工具调用。

进入判定前先做防御性校验：只有 `hook_event_name` 为 `PreToolUse` 且 `tool_name` 为 `Bash` / `PowerShell` 时才参与判定，否则（事件名或工具名不符、字段缺失）直接放手（defer）交回系统，绝不对未知工具下决策。

接着按权限模式（permission mode）短路：在 `bypassPermissions`、`auto`、`plan` 这三种本就免人工确认的模式下，做命令分类毫无意义，hook 直接放手（defer，不输出决策），交回 Claude Code 默认权限流程，既不浪费 LLM 调用，也不会误弹确认框。其余模式（`default` / `acceptEdits` / `dontAsk`）及未知/缺失模式一律走完整分类（fail-safe）。

需要分类时执行双重判定：

1. **本地正则快速放行** — 对显然只读的命令直接放行，零延迟，零成本。Bash 覆盖 `ls`、`cat`、`git status|diff|log`、`npm ls` 等；PowerShell 覆盖 `Get-ChildItem`、`Get-Content`、`Get-Process`、`Test-Path`、`Select-Object`/`Where-Object` 等只读 cmdlet。检测到 `>` / `>>` 重定向等危险特征会立即跳过本地放行。
2. **LLM 兜底判定** — 正则未命中时调用 LLM 判断是否只读，默认模型 Haiku（`claude-haiku-4-5-20251001`），可通过配置覆盖，最多重试 3 次。只读放行，否则回退到人工确认。

非只读命令（写文件、安装包、`git push`、`git commit`、`Remove-Item`、`Set-Content`、`.NET` 静态调用如 `[System.IO.File]::Delete` 等）始终需要人工确认。

> PowerShell 与 Bash 各用独立规则集：PowerShell 正则大小写不敏感，且因其可调用任意 .NET（无限攻击面），本地只白名单放行已知只读 cmdlet，其余一律交给 LLM 判定。

## 命令

### `/auto-allow-bash-config`

查看或修改 LLM 判定时使用的系统提示词和模型，配置写入 `~/.claude/auto-allow-bash-plugin.md` 的 frontmatter：

```markdown
---
model: claude-haiku-4-5-20251001
system_prompt: |
  你的自定义提示词
---
```

未配置时分别使用内置默认值（模型 `claude-haiku-4-5-20251001`）。输出控制指令（只输出 `allow`/`ask`）由插件内部强制追加，不需要写进 `system_prompt`。

## 前置条件

认证信息按 **进程环境变量 → `~/.claude/settings.json` 的 `env`** 顺序读取，提供以下任一即可：

- `ANTHROPIC_AUTH_TOKEN`（优先于 `ANTHROPIC_API_KEY`）
- `ANTHROPIC_API_KEY`

可选：`ANTHROPIC_BASE_URL`（自定义 API 网关地址）。

未配置认证时插件不会崩溃，会以"判定异常"为由回退到人工确认。

## 日志

每次判定追加一行到 `~/.claude/auto-allow-bash-plugin/log/<YYYY-MM-DD>.txt`，格式为 `时间 [事件/来源] (shell) 命令 | 详情`，记录判定事件（`recv`/`allow`/`ask`/`retry`/`error`/`skip` 等，其中 `skip` 含权限模式短路与空命令）、判定来源（`local` / `llm`）、命令所属 shell（`Bash` / `PowerShell`）和命令内容，便于事后审计和规则调优。

## 安装

```bash
/plugin install auto-allow-bash-plugin@yayaluoya-claude-plugins
```
