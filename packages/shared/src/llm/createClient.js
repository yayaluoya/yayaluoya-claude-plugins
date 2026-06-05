import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const USER_SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

/**
 * 从用户配置文件 ~/.claude/settings.json 的 env 中读取认证信息。
 * 文件不存在或解析失败时返回空对象（不视为错误，交由上层兜底）。
 * @returns {{ authToken?: string, apiKey?: string, baseURL?: string }}
 */
function loadFromSettings() {
  try {
    const c = JSON.parse(fs.readFileSync(USER_SETTINGS, 'utf8'));
    const env = (c && c.env) || {};
    return {
      authToken: env.ANTHROPIC_AUTH_TOKEN,
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: env.ANTHROPIC_BASE_URL,
    };
  } catch {
    return {};
  }
}

/**
 * 加载 Anthropic 认证信息。来源优先级：进程环境变量 > 用户配置文件。
 * 两个来源逐字段兜底，任一来源提供即可，提高容错率。
 * @returns {{ authToken?: string, apiKey?: string, baseURL?: string }}
 */
export function loadAuth() {
  const fromSettings = loadFromSettings();
  const env = process.env || {};
  return {
    authToken: env.ANTHROPIC_AUTH_TOKEN || fromSettings.authToken,
    apiKey: env.ANTHROPIC_API_KEY || fromSettings.apiKey,
    baseURL: env.ANTHROPIC_BASE_URL || fromSettings.baseURL,
  };
}

/**
 * 基于认证信息创建 Anthropic 客户端。
 * @param {{ timeout?: number, maxRetries?: number }} [opts]
 * @returns {Anthropic}
 */
export function createClient({ timeout = 8000, maxRetries = 0 } = {}) {
  const auth = loadAuth();
  if (!auth.authToken && !auth.apiKey) {
    throw new Error('未找到 Anthropic 认证信息：请在环境变量或 ~/.claude/settings.json 的 env 中配置 ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY');
  }
  return new Anthropic({
    ...(auth.authToken ? { authToken: auth.authToken } : { apiKey: auth.apiKey }),
    ...(auth.baseURL ? { baseURL: auth.baseURL } : {}),
    timeout,
    maxRetries,
  });
}
