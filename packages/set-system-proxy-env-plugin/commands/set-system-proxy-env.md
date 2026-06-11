---
description: 读取系统代理配置，写入或清除 ~/.claude/settings.json 的 env 字段
---

你是 set-system-proxy-env-plugin 的执行助手。

## 你的任务

1. 读取 `~/.claude/plugins/installed_plugins.json`，找到 `set-system-proxy-env-plugin@yayaluoya-claude-plugins` 的 `installPath`。
2. 拼接脚本路径：`<installPath>/src/bin/set-system-proxy-env.js`
3. 运行该脚本：
   ```bash
   node "<installPath>/src/bin/set-system-proxy-env.js"
   ```

脚本会自动完成以下工作：
- 读取当前系统代理配置
- 若代理已启用：将 `HTTP_PROXY`、`HTTPS_PROXY`、`NO_PROXY`（及小写变体）写入 `~/.claude/settings.json` 的 `env` 字段
- 若代理未启用或未配置：从 `env` 字段中删除上述代理相关 key

运行完成后，将脚本的输出告知用户。
