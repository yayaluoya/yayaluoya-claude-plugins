# yayaluoya-claude-plugins

yayaluoya 的 Claude Code 插件市场。pnpm + turbo monorepo：每个插件作为独立 npm 包发布，根目录 `.claude-plugin/marketplace.json` 通过 `source: npm` 指向已发布版本。

## 目录结构

```
.
├── .claude-plugin/
│   └── marketplace.json          # 市场清单，由脚本自动生成
├── .github/workflows/
│   └── ci-publish.yml            # 推到 master 触发：版本迭代 → 构建 → 发布到 npm → 打 tag
├── .node/
│   ├── iteration-version.js      # 拉取远端 tag 计算下一版本号，写回所有 package.json / plugin.json
│   └── update-marketplace.js     # 扫描 packages/ 重新生成 marketplace.json
├── packages/
│   ├── auto-allow-bash-plugin/       # 自动放行只读 Bash 命令的插件
│   ├── set-system-proxy-env-plugin/  # 手动同步系统代理配置到 env 的插件
│   └── shared/                       # 内部工具包（LLM 调用等），不发布
├── package.json                  # 根工程
├── pnpm-workspace.yaml
└── turbo.json
```

每个插件包的标准结构（hook 型）：

```
packages/<plugin>/
├── .claude-plugin/
│   └── plugin.json               # 插件清单（name / version / description / author）
├── hooks/
│   └── hooks.json                # PreToolUse / PostToolUse / SessionStart 等 hook 注册
├── src/                          # 源码
├── test/                         # node --test 单元测试
├── dist/                         # esbuild 产物（hooks.json 中通过 ${CLAUDE_PLUGIN_ROOT}/dist/... 引用）
├── package.json
└── tsconfig.json
```

命令型插件（无 hook，提供 slash command）：

```
packages/<plugin>/
├── .claude-plugin/
│   └── plugin.json               # 插件清单
├── commands/
│   └── <command>.md              # slash command 定义，Claude 按此执行
├── src/                          # 脚本源码（由 command 调用）
├── package.json
└── tsconfig.json
```

## 现有插件

| 插件 | 类型 | 说明 |
| --- | --- | --- |
| [`auto-allow-bash-plugin`](packages/auto-allow-bash-plugin) | hook | 通过 `PreToolUse` hook 拦截 Bash 调用，本地正则 + Haiku 双重判定，只读命令直接放行，写操作仍需人工确认 |
| [`set-system-proxy-env-plugin`](packages/set-system-proxy-env-plugin) | command | 提供 `/set-system-proxy-env` 命令，读取系统代理配置并写入或清除 `~/.claude/settings.json` 的 `env` 字段 |

## 常用命令

```bash
pnpm install            # 安装依赖
pnpm run typecheck      # turbo: 各包类型检查
pnpm run build          # turbo: esbuild 打包出 dist/
pnpm run test           # turbo: node --test 跑各包用例
```

## 安装使用（终端用户）

```bash
# 添加市场（GitHub 远端）
/plugin marketplace add yayaluoya/yayaluoya-claude-plugins

# 或本地路径用于开发调试
/plugin marketplace add <本仓库绝对路径>

# 安装插件
/plugin install auto-allow-bash-plugin@yayaluoya-claude-plugins
/plugin install set-system-proxy-env-plugin@yayaluoya-claude-plugins
```

## 新增一个插件

1. 在 `packages/` 下新建插件目录，包含 `.claude-plugin/plugin.json`、`package.json`、`hooks/` 或 `commands/` 等组件。
2. `package.json` 的 `name` 用 `@yayaluoya-claude-plugins/<plugin>` 命名空间；`version` 留任意值，CI 会统一改写。
3. 提交即可。`marketplace.json` 由 CI 调用 `update-marketplace.js` 自动重写，无需手动改。

## 发布流程

推到 `master` 自动触发 `ci-publish.yml`：

1. `pnpm install / typecheck / build / test`
2. `iteration-version.js` 从 GitHub tag 计算下一 patch 版本，写回根 `package.json`、各 `packages/*/package.json`、`packages/*/.claude-plugin/plugin.json`。主/次版本号由仓库变量 `MAJOR_VN` / `MINOR_VN` 控制。
3. `update-marketplace.js` 扫描 `packages/` 重写 `marketplace.json`。
4. 临时移除插件包的 `dependencies` / `devDependencies`（避免把 workspace 协议带到 npm），`pnpm publish -r --access public` 发布，发布后还原。
5. 提交版本变更并打 `vX.Y.Z` tag、创建 GitHub Release。
