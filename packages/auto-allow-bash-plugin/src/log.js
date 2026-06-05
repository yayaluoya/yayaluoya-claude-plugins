import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.resolve(__dirname, '../log');

/**
 * @param {Date} [d]
 */
function getLogFile(d = new Date()) {
  /** @param {number} n */
  const p = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return path.join(LOG_DIR, `auto-allow-${date}.md`);
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
 * @param {string} s
 */
function fenceCode(s) {
  const m = String(s).match(/`{3,}/g);
  const max = m ? Math.max(...m.map((x) => x.length)) : 2;
  const fence = '`'.repeat(Math.max(3, max + 1));
  return `${fence}bash\n${s}\n${fence}`;
}

/**
 * 把字符串包成行内代码，转义内部反引号，供日志中展示 LLM 原始响应。
 * @param {unknown} s
 */
export function fenceInline(s) {
  const t = String(s ?? '').replace(/`/g, '​`');
  return `\`${t}\``;
}

/**
 * 追加一条判定日志到当日的 Markdown 文件。
 * @param {string} event 事件类型（recv/allow/ask/retry/error/fatal/skip）
 * @param {Record<string, any>} meta 元信息，cmd 字段会被渲染成代码块
 */
export function log(event, meta = {}) {
  const now = new Date();
  const lines = [`## ${event}`, '', `时间：${formatTs(now)}`];
  const order = ['来源', '判定', '模型', '耗时', '重试', '命令长度', 'LLM 响应', '详情'];
  for (const key of order) {
    if (meta[key] === undefined || meta[key] === null || meta[key] === '') continue;
    lines.push(`${key}：${meta[key]}`);
  }
  if (meta.cmd) {
    lines.push('', fenceCode(meta.cmd));
  }
  lines.push('', '');
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(getLogFile(now), lines.join('\n'));
}
