#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** @returns {{ enabled: boolean, server: string | null, bypass: string | null }} */
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

/** @returns {{ enabled: boolean, server: string | null, bypass: string | null }} */
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

/** @returns {{ enabled: boolean, server: string | null, bypass: string | null }} */
function readLinuxProxy() {
  try {
    const mode = execSync('gsettings get org.gnome.system.proxy mode', { encoding: 'utf8' }).trim().replace(/'/g, '');
    if (mode !== 'manual') return { enabled: false, server: null, bypass: null };
    const host = execSync('gsettings get org.gnome.system.proxy.http host', { encoding: 'utf8' }).trim().replace(/'/g, '');
    const port = execSync('gsettings get org.gnome.system.proxy.http port', { encoding: 'utf8' }).trim();
    const bypass = execSync('gsettings get org.gnome.system.proxy ignore-hosts', { encoding: 'utf8' }).trim();
    return {
      enabled: true,
      server: host && port ? `${host}:${port}` : null,
      bypass,
    };
  } catch {
    return { enabled: false, server: null, bypass: null };
  }
}

function readSystemProxy() {
  switch (process.platform) {
    case 'win32': return readWindowsProxy();
    case 'darwin': return readMacProxy();
    default: return readLinuxProxy();
  }
}

/**
 * @param {string} server
 * @returns {{ http?: string, https?: string }}
 */
function parseProxyServer(server) {
  if (!server) return {};
  if (server.includes('=')) {
    /** @type {Record<string, string>} */
    const result = {};
    for (const seg of server.split(';')) {
      const [proto, addr] = seg.split('=');
      if (proto && addr) result[proto.trim()] = `http://${addr.trim()}`;
    }
    return result;
  }
  const url = server.startsWith('http') ? server : `http://${server}`;
  return { http: url, https: url };
}

const PROXY_KEYS = ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'NO_PROXY', 'no_proxy'];

function main() {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  /** @type {Record<string, any>} */
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      console.error(`解析 ${settingsPath} 失败，请检查 JSON 格式`);
      process.exit(1);
    }
  }

  if (!settings.env || typeof settings.env !== 'object') {
    settings.env = {};
  }

  const { enabled, server, bypass } = readSystemProxy();

  if (!enabled || !server) {
    // 清除代理相关 env
    const removed = PROXY_KEYS.filter(k => k in settings.env);
    for (const k of PROXY_KEYS) delete settings.env[k];
    if (removed.length > 0) {
      console.log(`已清除代理环境变量：${removed.join(', ')}`);
    } else {
      console.log('系统代理未启用，env 中无代理配置，无需变更');
    }
  } else {
    const proxies = parseProxyServer(server);
    if (proxies.http) {
      settings.env['HTTP_PROXY'] = proxies.http;
      settings.env['http_proxy'] = proxies.http;
    }
    if (proxies.https) {
      settings.env['HTTPS_PROXY'] = proxies.https;
      settings.env['https_proxy'] = proxies.https;
    }
    if (bypass) {
      const noProxy = bypass.replace(/;/g, ',').replace(/<local>/gi, 'localhost,127.0.0.1');
      settings.env['NO_PROXY'] = noProxy;
      settings.env['no_proxy'] = noProxy;
    }
    console.log(`已写入代理配置：${proxies.http || proxies.https}`);
    if (bypass) console.log(`NO_PROXY：${settings.env['NO_PROXY']}`);
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

main();
