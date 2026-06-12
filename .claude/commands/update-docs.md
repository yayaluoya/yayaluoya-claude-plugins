---
description: 重新读取各包内容，更新根项目和所有子包的文档
---

# 更新文档

重新读取仓库中各包的实际代码和配置，按内容生成或更新文档。**每次执行都从文件重新读取，不依赖记忆或上下文缓存。**

## 执行流程

### 1. 读取根项目信息

读取以下文件，了解整体结构：
- `package.json`
- `turbo.json`
- `.github/workflows/ci-publish.yml`
- `.node/iteration-version.js`
- `.node/update-marketplace.js`

### 2. 扫描所有子包

遍历 `packages/` 目录，对每个子包读取：
- `package.json`
- `.claude-plugin/plugin.json`（若存在）
- `hooks/hooks.json`（若存在）
- `commands/*.md`（若存在）
- `src/` 下的所有源码文件
- 现有 `README.md`（若存在）

### 3. 更新各子包 README.md

根据读取到的实际内容，为每个子包生成或更新 `README.md`：

- **hook 型插件**：说明 hook 触发时机、判定逻辑、前置条件、日志等
- **command 型插件**：说明命令名称、执行流程、注意事项
- **工具包**（`private: true`）：说明对外导出的接口和用途

文档风格参考已有插件的 README，保持一致：简介一句话 + 分节说明。

### 4. 更新根项目 README.md

重新读取所有子包的信息，更新根目录 `README.md`：
- 插件列表表格（名称、类型、一句话说明）
- 安装命令（仅列出 `private: false` 的包）

根 README 只面向终端用户，不放开发说明。

### 5. 更新 CLAUDE.md

根据 CI 流程和项目结构，更新 `CLAUDE.md`：
- 常用命令
- 插件类型规则（不列具体包名）
- 新增插件步骤
- 发布流程

CLAUDE.md 只放开发规则，不放插件具体说明。

## 注意事项

- 每个文档都要**重新读取对应文件**后再写，不能凭印象生成
- 保持中文风格
- `shared` 包不发布，README 说明内部接口即可，不写安装命令
- 写完后列出更新了哪些文件
