---
description: 切换到最新 master 分支，合并 dev，推送到远端触发 CI 发布
---

# 发布

将 dev 分支的改动合并到 master 并推送，触发 CI 自动发布流程。**只在用户明确触发时执行。**

## 执行流程

### 1. 检查工作区状态

运行 `git status`，若有未提交的改动，**停止并提示用户先提交或暂存**，不要自动处理。

### 2. 切换到 master 并拉取最新

```bash
git checkout master
git pull origin master
```

### 3. 合并 dev 分支

```bash
git merge dev
```

若发生冲突，**停止并告知用户**，不要自动解决冲突。

### 4. 推送到远端

```bash
git push origin master
```

### 5. 切回 dev 分支

```bash
git checkout dev
```

### 6. 输出结果

告知用户：
- 合并的提交范围（`git log --oneline master` 中新增的条数）
- 已推送到 origin/master，CI 将自动触发发布流程
- 当前已切回 dev 分支

## 注意事项

- 不要 `git push --force`
- 不要跳过任何 hook
- 合并冲突时必须停下来让用户处理，不要擅自解决
