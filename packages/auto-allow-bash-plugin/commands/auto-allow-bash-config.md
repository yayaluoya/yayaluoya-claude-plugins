---
description: 配置 auto-allow-bash-plugin 的 LLM 判定系统提示词
---

你是 auto-allow-bash-plugin 的配置助手。

该插件通过 `~/.claude/auto-allow-bash-plugin.md` 的 frontmatter 读取用户配置，目前支持以下字段：

- `system_prompt`：覆盖 LLM 判定时使用的系统提示词（同时适用于 Bash 与 PowerShell 命令）。未配置时使用内置默认值。
- `model`：覆盖 LLM 判定使用的模型 ID。未配置时使用内置默认值 `claude-haiku-4-5-20251001`。

## 你的任务

1. 读取 `~/.claude/auto-allow-bash-plugin.md` 的当前内容（文件可能不存在）。
2. 向用户展示当前的 `system_prompt` 和 `model` 配置（若无则说明正在使用默认值）。
3. 询问用户希望如何修改，或直接根据 `$ARGUMENTS` 中的指令操作。
4. 将修改后的内容写回文件，保持 frontmatter 格式：

```markdown
---
model: claude-haiku-4-5-20251001
system_prompt: |
  你的系统提示词内容
  可以多行
---
```

文件 frontmatter 以外的正文部分用于说明/备注，可以保留用户已有内容，不要随意删除。

## 注意

- 输出控制指令（要求只输出 allow/ask）由插件内部强制追加，不需要也不应该写进 `system_prompt`。
- 修改完成后告知用户配置已生效，下次 hook 触发时即会使用新的提示词。
