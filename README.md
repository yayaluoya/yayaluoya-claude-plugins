# yayaluoya-claude-plugins

yayaluoya 的 Claude Code 插件市场。单仓 monorepo 架构：每个插件作为独立包放在 `packages/` 下自管，根目录 `.claude-plugin/marketplace.json` 直接指向各插件源码目录对外暴露，无需打包或复制。

## 目录结构

```
.
├── .claude-plugin/
│   └── marketplace.json     # 市场清单，source 直接指向 packages/ 下的插件
├── packages/                # 插件 monorepo，每个插件自管自己的内容
│   └── hello-world/         # 示例插件
├── package.json             # 根工程（turbo + pnpm）
├── pnpm-workspace.yaml
└── turbo.json
```

每个插件包的结构（以 `hello-world` 为例）：

```
packages/hello-world/
├── .claude-plugin/
│   └── plugin.json          # 插件清单
├── commands/                # 斜杠命令（.md，带 frontmatter）
│   └── hello.md
├── skills/                  # 技能
│   └── greet/
│       └── SKILL.md
└── package.json             # 仅用于 monorepo 工程管理
```

## 命令

```bash
pnpm install        # 安装依赖
pnpm run build      # turbo: 执行各插件的 build（纯 markdown 插件无需构建）
```

## 新增一个插件

1. 在 `packages/` 下新建插件目录，包含 `.claude-plugin/plugin.json` 和 `commands/`、`agents/`、`skills/` 等组件。
2. 在根 `.claude-plugin/marketplace.json` 的 `plugins` 数组里登记，`source` 指向 `./packages/<插件名>`。

## 安装使用（终端用户）

```bash
# 添加市场（本地路径用于开发测试，或填 github owner/repo）
/plugin marketplace add <本仓库路径或 github 地址>

# 安装插件
/plugin install hello-world@yayaluoya-claude-plugins
```

本地开发调试时，可直接把本仓库根目录作为 marketplace 源添加。
