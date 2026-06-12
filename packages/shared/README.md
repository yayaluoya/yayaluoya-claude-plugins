# shared

内部工具包，供 hook 型插件在 esbuild 打包时引用。不发布到 npm（`private: true`）。

## 导出接口

入口：`@yayaluoya-claude-plugins/shared/llm`

### `createClient(opts?)`

创建 Anthropic SDK 客户端。认证信息来源（进程环境变量优先）：

- 环境变量 `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL`
- 或 `~/.claude/settings.json` 的 `env` 字段中的同名 key

两个来源逐字段兜底，任一来源提供即可。两者均未配置时抛错。

参数：
- `timeout`：请求超时（ms），默认 `8000`
- `maxRetries`：SDK 内置重试次数，默认 `0`（由调用方自行控制重试逻辑）

### `loadAuth()`

仅加载认证字段（`authToken`、`apiKey`、`baseURL`），不创建客户端，供需要手动初始化的场景使用。

### `oneShot(opts)`

单轮对话：发一条 system + user 消息，返回拼接后的文本字符串。

参数：
- `model`：模型 ID
- `system`：系统提示词（可选）
- `user`：用户消息
- `maxTokens`：最大输出 token，默认 `64`
- `timeout`：超时（ms），默认 `8000`

## 使用方式

在 hook 型插件的 `package.json` 中声明依赖：

```json
"dependencies": {
  "@yayaluoya-claude-plugins/shared": "workspace:^"
}
```

esbuild 打包时加 `--bundle`，`shared` 包会一并打入 `dist/` 的单文件产物。
