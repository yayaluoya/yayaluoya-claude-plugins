#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * 读取 Windows 系统代理配置（注册表）
 * @returns {{ enabled: boolean, server: string | null, bypass: string | null }}
 */
function readWindowsProxy() {
  const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
  try {
    const out = execSync(`reg query "${key}"`, { encoding: 'utf8' });
    const get = (/** @type {string} */ name) => {
      const m = out.match(new RegExp(`${name}\\s+REG_\\w+\\s+(.+)`));
      return m ? m[1].trim() : null;
    };
    return {
      enabled: get('ProxyEnable') === '0x1' || get('ProxyEnable') === '1',
      server: get('ProxyServer'),
      bypass: get('ProxyOverride'),
    };
  } catch {
    return { enabled: false, server: null, bypass: null };
  }
}

/**
 * 读取 macOS 系统代理配置（networksetup）
 * @returns {{ enabled: boolean, server: string | null, bypass: string | null }}
 */
function readMacProxy() {
  try {
    const web = execSync('networksetup -getwebproxy Wi-Fi', { encoding: 'utf8' });
    const enabled = /Enabled:\s*Yes/i.test(web);
    const serverM = web.match(/Server:\s*(.+)/);
    const portM = web.match(/Port:\s*(\d+)/);
    const server = serverM && portM ? `${serverM[1].trim()}:${portM[1].trim()}` : null;
    return { enabled, server, bypass: null };
  } catch {
    return { enabled: false, server: null, bypass: null };
  }
}

/**
 * 读取 Linux 系统代理配置（gsettings）
 * @returns {{ enabled: boolean, server: string | null, bypass: string | null }}
 */
function readLinuxProxy() {
  try {
    const mode = execSync("gsettings get org.gnome.system.proxy mode", { encoding: 'utf8' }).trim().replace(/'/g, '');
    if (mode !== 'manual') return { enabled: false, server: null, bypass: null };
    const host = execSync("gsettings get org.gnome.system.proxy.http host", { encoding: 'utf8' }).trim().replace(/'/g, '');
    const port = execSync("gsettings get org.gnome.system.proxy.http port", { encoding: 'utf8' }).trim();
    const bypass = execSync("gsettings get org.gnome.system.proxy ignore-hosts", { encoding: 'utf8' }).trim();
    return {
      enabled: true,
      server: host && port ? `${host}:${port}` : null,
      bypass,
    };
  } catch {
    return { enabled: false, server: null, bypass: null };
  }
}

/**
 * 根据平台读取系统代理
 */
function readSystemProxy() {
  switch (process.platform) {
    case 'win32': return readWindowsProxy();
    case 'darwin': return readMacProxy();
    default: return readLinuxProxy();
  }
}

/**
 * 把 server 字符串（host:port 或 http=host:port;https=host:port）
 * 解析成各协议的完整 URL。
 * @param {string} server
 * @returns {{ http?: string, https?: string }}
 */
function parseProxyServer(server) {
  if (!server) return {};
  // 协议分段格式：http=host:port;https=host:port
  if (server.includes('=')) {
    /** @type {Record<string, string>} */
    const result = {};
    for (const seg of server.split(';')) {
      const [proto, addr] = seg.split('=');
      if (proto && addr) result[proto.trim()] = `http://${addr.trim()}`;
    }
    return result;
  }
  // 简单 host:port 格式，同时用于 http 和 https
  const url = server.startsWith('http') ? server : `http://${server}`;
  return { http: url, https: url };
}

function main() {
  const envFile = process.env.CLAUDE_ENV_FILE;
  if (!envFile) {
    // 不在 Claude Code 环境中，静默退出
    process.exit(0);
  }

  const { enabled, server, bypass } = readSystemProxy();
  if (!enabled || !server) process.exit(0);

  const proxies = parseProxyServer(server);
  const lines = [];

  if (proxies.http) {
    lines.push(`export HTTP_PROXY=${proxies.http}`);
    lines.push(`export http_proxy=${proxies.http}`);
  }
  if (proxies.https) {
    lines.push(`export HTTPS_PROXY=${proxies.https}`);
    lines.push(`export https_proxy=${proxies.https}`);
  }
  if (bypass) {
    const noProxy = bypass.replace(/;/g, ',').replace(/<local>/gi, 'localhost,127.0.0.1');
    lines.push(`export NO_PROXY=${noProxy}`);
    lines.push(`export no_proxy=${noProxy}`);
  }

  if (lines.length > 0) {
    fs.appendFileSync(envFile, lines.join('\n') + '\n');
  }
}

main();
