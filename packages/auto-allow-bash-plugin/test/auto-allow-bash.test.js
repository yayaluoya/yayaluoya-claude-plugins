import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist/auto-allow-bash.mjs');

/**
 * 模拟 Claude Code 调用 hook：把 JSON 写入 stdin，收集 stdout 输出。
 * @param {object} toolInput
 * @returns {Promise<{ decision: string, reason: string }>}
 */
function callHook(toolInput) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [DIST], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      try {
        const out = JSON.parse(stdout);
        const hs = out.hookSpecificOutput;
        resolve({ decision: hs.permissionDecision, reason: hs.permissionDecisionReason });
      } catch {
        reject(new Error(`解析输出失败 (exit ${code}): stdout=${stdout} stderr=${stderr}`));
      }
    });
    child.stdin.write(JSON.stringify({ tool_input: toolInput }));
    child.stdin.end();
  });
}

describe('auto-allow-bash-plugin hook', () => {
  describe('本地放行（只读命令）', () => {
    const readonlyCmds = [
      'ls -la',
      'cat README.md',
      'git status',
      'git log --oneline -10',
      'git diff',
      'pnpm list',
      'node --version',
      'cat README.md | head -20',
      'git status && ls',
    ];

    for (const cmd of readonlyCmds) {
      it(`allow: ${cmd}`, async () => {
        const result = await callHook({ command: cmd });
        assert.equal(result.decision, 'allow');
      });
    }
  });

  describe('LLM 判定（非只读命令，走 LLM 后返回 ask）', () => {
    const nonReadonlyCmds = [
      'echo foo > bar.txt',
      'cat file >> out.txt',
      'rm $(ls)',
      'sudo ls',
    ];

    for (const cmd of nonReadonlyCmds) {
      it(`ask: ${cmd}`, async () => {
        const result = await callHook({ command: cmd });
        assert.equal(result.decision, 'ask');
      });
    }
  });

  it('ask: 空命令', async () => {
    const result = await callHook({ command: '' });
    assert.equal(result.decision, 'ask');
  });
});
