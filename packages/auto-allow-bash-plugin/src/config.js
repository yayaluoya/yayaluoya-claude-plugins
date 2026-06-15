import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';

const CONFIG_FILE = path.join(os.homedir(), '.claude', 'auto-allow-bash-plugin.md');

/**
 * 从 ~/.claude/auto-allow-bash-plugin.md 的 frontmatter 读取用户配置。
 * 文件不存在或字段缺失时返回空对象，调用方自行使用默认值。
 * @returns {{ systemPrompt?: string, model?: string }}
 */
export function loadConfig() {
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const fm = /** @type {Record<string, unknown>} */ (yaml.load(match[1]) ?? {});
    return {
      ...(typeof fm.system_prompt === 'string' ? { systemPrompt: fm.system_prompt } : {}),
      ...(typeof fm.model === 'string' && fm.model.trim() ? { model: fm.model.trim() } : {}),
    };
  } catch {
    return {};
  }
}
