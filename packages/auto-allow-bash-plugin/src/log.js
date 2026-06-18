import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOG_DIR = path.join(os.homedir(), '.claude', 'auto-allow-bash-plugin', 'log');

function getLogFile(d = new Date()) {
  /** @param {number} n */
  const p = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return path.join(LOG_DIR, `${date}.txt`);
}

/**
 * @param {Date} d
 */
function formatTs(d) {
  /** @param {number} n */
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 追加一条判定日志，每条记录一行。
 * 格式：2026-06-09 14:23:01 [event/source] (shell) cmd | detail
 * @param {string} event 事件类型（recv/allow/ask/retry/error/fatal/skip）
 * @param {{ cmd?: string, shell?: string, source?: string, detail?: string }} meta
 */
export function log(event, meta = {}) {
  const now = new Date();
  const ts = formatTs(now);
  const source = meta.source ? `/${meta.source}` : '';
  const tag = `[${event}${source}]`;
  const shell = meta.shell ? ` (${meta.shell})` : '';
  const cmd = meta.cmd ? ` ${meta.cmd.replace(/\n/g, ' ')}` : '';
  const extra = meta.detail ? ` | ${meta.detail}` : '';
  const line = `${ts} ${tag}${shell}${cmd}${extra}\n`;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(getLogFile(now), line);
}
