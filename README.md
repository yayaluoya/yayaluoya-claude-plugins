# yayaluoya-claude-plugins

yayaluoya 的 Claude Code 插件市场。单仓 monorepo 架构：插件源码放在 `packages/`，构建后打包输出到产品目录 `marketplace/`，由根目录 `.claude-plugin/marketplace.json` 对外暴露。

## 目录结构

```
.
├── .claude-plugin/
│   └── marketplace.json     # 市场清单，Claude Code 据此识别可安装插件
├── marketplace/             # 产品目录（构建产物，打包输出，不入库）
│   └── <plugin>/            # 例如 hello-world/
├── packages/                # 源码 monorepo
│   ├── hello-world/         # 示例插件源码
│   └── scripts/             # 打包脚本（提供 `package` 命令）
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
└── package.json             # 仅用于 monorepo 构建，打包时会被排除
```

## 命令

```bash
pnpm install        # 安装依赖
pnpm run build      # turbo: 构建所有插件并打包到 marketplace/
```

`build` 会对每个插件依次执行 `build`（如有构建步骤）和 `package`（把插件文件拷贝到 `marketplace/<name>/`，并排除 `package.json`、`node_modules` 等工程文件）。

## 新增一个插件

1. 在 `packages/` 下新建插件目录，包含 `.claude-plugin/plugin.json` 和 `commands/`、`agents/`、`skills/` 等组件。
2. 在该插件的 `package.json` 里加上 `"package": "package . <插件名>"` 脚本，并把 `@yayaluoya-claude-plugins/scripts` 加入 devDependencies。
3. 在根 `.claude-plugin/marketplace.json` 的 `plugins` 数组里登记，`source` 指向 `./marketplace/<插件名>`。
4. 运行 `pnpm run build`。

## 安装使用（终端用户）

```bash
# 添加市场（本地路径用于开发测试，或填 github owner/repo）
/plugin marketplace add <本仓库路径或 github 地址>

# 安装插件
/plugin install hello-world@yayaluoya-claude-plugins
```

本地开发调试时，可直接把本仓库根目录作为 marketplace 源添加。
