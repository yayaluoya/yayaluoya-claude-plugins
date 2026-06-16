import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist/auto-allow-bash.mjs');

/**
 * 模拟 Claude Code 调用 hook：把 JSON 写入 stdin，收集 stdout 输出。
 * 不做断言，只把判定结果原样返回，交给调用方打印。
 * @param {object} toolInput
 * @returns {Promise<{ decision: string, reason: string, ms: number, error?: string }>}
 */
function callHook(toolInput) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn('node', [DIST], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      const ms = Date.now() - startedAt;
      try {
        const hs = JSON.parse(stdout).hookSpecificOutput;
        resolve({ decision: hs.permissionDecision, reason: hs.permissionDecisionReason || '', ms });
      } catch {
        resolve({ decision: '?', reason: '', ms, error: `exit ${code} stdout=${stdout} stderr=${stderr}` });
      }
    });
    child.stdin.write(JSON.stringify({ tool_input: toolInput }));
    child.stdin.end();
  });
}

/** 对齐打印一条命令的处理结果，每条一行。 */
function printResult(cmd, r) {
  const label = cmd === '' ? '(空命令)' : cmd;
  const head = `[${r.decision.toUpperCase().padEnd(5)}] ${String(r.ms).padStart(5)}ms  ${label}`;
  const extra = r.error ? `  ⚠ ${r.error}` : r.reason ? `  | ${r.reason}` : '';
  console.log(`${head}${extra}`);
}

/** 跑一组命令并逐条打印。 */
async function runGroup(title, cmds) {
  console.log(`\n===== ${title} =====`);
  for (const cmd of cmds) {
    const r = await callHook({ command: cmd });
    printResult(cmd, r);
  }
}

const GROUPS = [
  ['本地只读规则（应快速 allow，不调 LLM）', [
    'ls -la',
    'git status',
    'cat README.md | head -20',
    'git status && ls -la',
  ]],
  ['含写/危险特征（不走本地，交 LLM 或人工）', [
    'echo foo > bar.txt',
    'rm $(ls)',
    'sudo ls',
  ]],
  ['本地未命中但只读（期望 LLM allow）', [
    'grep -rn "TODO" src',
    'ps aux',
    'docker ps',
  ]],
  ['本地未命中的写/危险命令（期望 LLM ask）', [
    'rm -rf node_modules',
    'git push origin main',
    'npm install',
  ]],
  ['边界输入', [
    '',
    'ls; echo `id`',
  ]],
];

for (const [title, cmds] of GROUPS) {
  await runGroup(title, cmds);
}
