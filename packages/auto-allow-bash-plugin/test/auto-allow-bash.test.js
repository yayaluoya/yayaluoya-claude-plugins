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

/** 对齐打印一条命令的处理结果。 */
function printResult(cmd, r) {
  const label = cmd === '' ? '(空命令)' : cmd;
  const head = `[${r.decision.toUpperCase().padEnd(5)}] ${String(r.ms).padStart(5)}ms  ${label}`;
  console.log(head);
  if (r.error) console.log(`        ⚠ ${r.error}`);
  else if (r.reason) console.log(`        ↳ ${r.reason}`);
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
    'cat README.md',
    'pwd',
    'whoami',
    'git status',
    'git log --oneline -10',
    'git diff HEAD~1',
    'git show abc123',
    'git config --list',
    'pnpm list',
    'npm outdated',
    'tsc --noEmit',
    'node --version',
    'docker --help',
    'cat README.md | head -20',
    'git status && ls -la',
    'find . -name "*.js" | wc -l',
    'rg foo | head -5',
    'cat err.log 2>/dev/null',
  ]],
  ['含写/危险特征（不走本地，交 LLM 或人工）', [
    'echo foo > bar.txt',
    'cat file >> out.txt',
    'rm $(ls)',
    'echo `whoami`',
    'sudo ls',
    'ls && rm -rf tmp',
  ]],
  ['本地未命中但只读（期望 LLM allow）', [
    'grep -rn "TODO" src',
    'sort package.json',
    'uniq access.log',
    'diff a.txt b.txt',
    'sed -n "1,20p" src/index.js',
    'awk "{print \\$1}" access.log',
    'nl src/index.js',
    'cut -d, -f1 data.csv',
    'md5sum dist/auto-allow-bash.mjs',
    'basename /a/b/c.txt',
    'realpath .',
    'id',
    'groups',
    'uptime',
    'free -h',
    'ps aux',
    'docker ps',
    'docker images',
  ]],
  ['本地未命中的写/危险命令（期望 LLM ask）', [
    'rm -rf node_modules',
    'mkdir build',
    'cp a.txt b.txt',
    'mv a.txt b.txt',
    'git commit -m "x"',
    'git push origin main',
    'npm install',
    'chmod 777 file',
    'curl https://example.com',
    'unknown-cmd --do-something',
  ]],
  ['边界输入', [
    '',
    '   ',
    'ls; echo `id`',
  ]],
];

for (const [title, cmds] of GROUPS) {
  await runGroup(title, cmds);
}
