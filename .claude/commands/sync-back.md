---
description: 把发布后 CI 在 master 上产生的提交回合到 dev 分支
---

# 回合同步

发布（`/publish`）后，CI 会在 master 上自动产生一个提交（写回版本号、生成 marketplace.json 等）并打 tag。此命令把 master 上这个新提交合并回 dev，保持两个分支同步。**只在用户明确触发时执行。**

## 执行流程

### 1. 检查工作区状态

运行 `git status`，若有未提交的改动，**停止并提示用户先提交或暂存**，不要自动处理。

### 2. 切换到 master 并拉取最新

```bash
git checkout master
git pull origin master
```

这一步拿到 CI 推上来的版本变更提交。

### 3. 确认 master 确实领先 dev

```bash
git log --oneline dev..master
```

- 若**没有任何提交**输出，说明 dev 已是最新（可能 CI 还没跑完，或已经同步过），**停止并告知用户无需回合**，切回 dev 分支。
- 若有提交输出，确认是 CI 的发布提交后再继续。

### 4. 切换到 dev 并拉取最新

```bash
git checkout dev
git pull origin dev
```

### 5. 把 master 合并回 dev

```bash
git merge --no-ff master
```

**必须使用 `--no-ff`**，保留清晰的合并记录，和 `/publish` 的风格保持一致。

若发生冲突，**停止并告知用户**，不要自动解决冲突。

### 6. 推送到远端

```bash
git push origin dev
```

### 7. 输出结果

告知用户：
- 回合的提交内容（第 3 步 `git log` 中的提交）
- 已推送到 origin/dev，dev 与 master 现已同步
- 当前停留在 dev 分支

## 注意事项

- 不要 `git push --force`
- 不要跳过任何 hook
- 合并冲突时必须停下来让用户处理，不要擅自解决
- 此命令不触发任何发布流程，只做分支同步
