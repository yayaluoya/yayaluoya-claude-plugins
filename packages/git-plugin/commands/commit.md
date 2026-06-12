---
description: 检查工作区改动并按项目历史风格生成中文 commit 提交
---

# 提交代码

按项目已有的 commit 风格生成一条新的中文提交。**只在用户明确触发时执行**——不要主动揽这件事。

## 执行流程

### 1. 并行收集上下文
同时跑：
- `git status`（不要 `-uall`）
- `git diff`（未暂存）
- `git diff --cached`（已暂存）
- `git log --oneline -10`

如果工作区干净（无未暂存且无已暂存），直接告诉用户"无可提交的改动"并停止，不要造空提交。

### 2. 阅读全部 diff
- 必读完整 diff，不能只看 stat。理解每个文件改了什么、为什么改。
- 遇到 `.env` / `credentials*` / `*.pem` / `id_rsa` 等可能含密钥的文件，**先警告用户再决定是否纳入**。
- 跨文件改动要识别它们是否构成同一个目的（一个特性 / 一个修复），如果是不同主题，告知用户并询问是否拆成多个 commit。

### 3. 写 commit message
- **语言**：中文
- **风格**：跟随 `git log --oneline` 中最近 10 条的实际格式
  - 如果历史风格是 Conventional Commits，沿用其前缀：`feat: ...` / `fix: ...` / `chore: ...` / `refactor: ...` / `docs: ...`
  - 第一行控制在 50 字符内，描述"为什么"或"做了什么"，不要罗列文件名
  - 类型选择：
    - `feat` — 新功能、新增字段/枚举/接口/页面
    - `fix` — 修 bug、修错文案、修条件判断
    - `chore` — 工程脚本、依赖、配置
    - `refactor` — 不改行为只改结构
    - `docs` — 仅文档
    - `style` — 仅格式/空白

### 4. 执行提交
- 用 HEREDOC 传 message 保证换行正确：
  ```bash
  git commit -m "$(cat <<'EOF'
  feat: 你的中文提交信息
  EOF
  )"
  ```
- **暂存**：优先 `git add <具体文件>`，不要 `git add .` / `git add -A`，避免误带未追踪敏感文件。
- **不要 amend**：默认创建新 commit。除非用户明确要 amend。
- **不要跳过 hook**：禁止 `--no-verify` / `--no-gpg-sign`，除非用户明确允许。
- **不要推送**：commit 后**不要** `git push`，除非用户明确要求。
- **commit 后跑一次 `git status`** 验证成功并展示给用户。

### 5. Pre-commit hook 失败的处理
- hook 失败时 commit **没有发生**，所以**不能用 `--amend` 修复**。
- 修好问题 → 重新 `git add` → **创建新 commit**。
- husky deprecated 的提示可以忽略（不是失败信号）。
- lint-staged 自动改动了文件：检查改动是否合理，再重新提交。

### 6. 输出
提交成功后，用一两句话告诉用户：
- 新 commit 的短 hash + message 第一行
- 当前分支相对 origin 的状态（领先/落后多少 commit）
- 是否要推送（不要主动推，让用户决定）

## 不要做的事

- 不要在用户没明说时帮忙提交
- 不要修改 git config
- 不要 `git push --force` 到 main/master
- 不要把多个无关主题塞进一个 commit
- 不要把 `claude` / `claude code` 等字样放进提交信息正文（用户没要求时）
- commit 信息里不要堆 emoji（除非用户要）
