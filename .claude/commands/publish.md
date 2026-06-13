---
description: 切换到最新 master 分支，合并 dev，推送到远端触发 CI 发布
---

# 发布

将 dev 分支的改动合并到 master 并推送，触发 CI 自动发布流程。**只在用户明确触发时执行。**

## 执行流程

### 1. 检查工作区状态

运行 `git status`，若有未提交的改动，**停止并提示用户先提交或暂存**，不要自动处理。

### 2. 本地校验（typecheck / build / test 全部跑通）

依次运行以下命令，**任一命令失败都立即停止**，告知用户失败详情，不要继续后续合并和推送：

```bash
pnpm run typecheck
pnpm run build
pnpm run test
```

只有三个命令全部通过，才进入下一步。

### 3. 切换到 master 并拉取最新

```bash
git checkout master
git pull origin master
```

### 4. 合并 dev 分支

```bash
git merge --no-ff dev
```

**必须使用 `--no-ff`**，即使可以快进也要创建一个新的合并提交，保留清晰的合并记录。

若发生冲突，**停止并告知用户**，不要自动解决冲突。

### 5. 推送到远端

```bash
git push origin master
```

### 6. 切回 dev 分支

```bash
git checkout dev
```

### 7. 输出结果

告知用户：
- 合并的提交范围（`git log --oneline master` 中新增的条数）
- 已推送到 origin/master，CI 将自动触发发布流程
- 当前已切回 dev 分支

## 注意事项

- 不要 `git push --force`
- 不要跳过任何 hook
- 合并冲突时必须停下来让用户处理，不要擅自解决
