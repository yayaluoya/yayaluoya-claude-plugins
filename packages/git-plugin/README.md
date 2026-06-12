# git-plugin

提供 Git 工作流相关的 Claude Code 命令插件。

## 命令

### `/commit`

检查工作区改动，按项目已有的 commit 风格生成一条中文提交。

**执行流程：**

1. 并行运行 `git status`、`git diff`、`git diff --cached`、`git log --oneline -10` 收集上下文
2. 读取完整 diff，识别改动目的，检测敏感文件
3. 跟随 `git log` 历史风格（Conventional Commits 前缀 `feat` / `fix` / `chore` / `refactor` / `docs` / `style`），生成中文 commit message
4. 用 `git add <具体文件>` 暂存，创建新 commit，不推送

**注意事项：**

- 工作区干净时直接提示"无可提交的改动"，不造空提交
- 遇到 `.env` / `*.pem` 等可能含密钥的文件会先警告
- 跨主题改动会询问是否拆成多个 commit
- 不跳过 pre-commit hook；hook 失败后修好再创建新 commit，不用 `--amend`
- 不会主动 `git push`，由用户决定是否推送

## 安装

```bash
/plugin install git-plugin@yayaluoya-claude-plugins
```
