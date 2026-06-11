import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist/inject-system-proxy.mjs');

const envFile = path.join(os.tmpdir(), `inject-proxy-test-${Date.now()}.txt`);

const result = spawnSync('node', [DIST], {
  env: { ...process.env, CLAUDE_ENV_FILE: envFile },
  encoding: 'utf8',
});

if (result.status !== 0) {
  console.error('脚本异常退出：', result.stderr);
  process.exit(1);
}

if (!fs.existsSync(envFile) || fs.readFileSync(envFile, 'utf8').trim() === '') {
  console.log('（系统代理未启用，未写入任何内容）');
} else {
  console.log(fs.readFileSync(envFile, 'utf8'));
}

fs.existsSync(envFile) && fs.unlinkSync(envFile);
