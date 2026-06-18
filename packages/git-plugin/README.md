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

### `/new-branch`

根据用户提供的名字，侦测项目现有分支的命名规范，转成合规的英文分支名后创建并切换。

**执行流程：**

1. 并行运行 `git branch -a`、`git branch --show-current`、`git status` 收集分支与工作区上下文
2. 扫描所有分支名侦测命名规范（如 `feat/xxx` 斜杠前缀、`feature-xxx` 短横线、Jira issue 号等），分支太少时回退到默认 `<type>/<name>`
3. 把名字转成英文 slug：英文直接规范化；中文优先简洁意译；专有名词 / 产品名用拼音；过长则用拼音首字母缩写
4. 推断类型前缀（`feat` / `fix` / `docs` / `refactor` / `chore`），也支持在参数里显式指定
5. 校验分支名合法性后用 `git checkout -b` 创建并切换

**注意事项：**

- 名字可含中文，用了拼音 / 首字母时会在输出里附中文原意
- 名字为空或含义不清时先询问，不硬造
- 工作区有未提交改动时会先提醒（不自动 stash / commit）
- 与现有分支重名时提示加区分，不覆盖已有分支
- 不会主动 `git push`，由用户决定是否推送

## 安装

```bash
/plugin install git-plugin@yayaluoya-claude-plugins
```
