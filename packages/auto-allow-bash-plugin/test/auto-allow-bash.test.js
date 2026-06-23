import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist/auto-allow-bash.mjs');

/**
 * 模拟 Claude Code 调用 hook：把 JSON 写入 stdin，收集 stdout 输出。
 * 不做断言，只把判定结果原样返回，交给调用方打印。
 * @param {object} toolInput
 * @param {string} [toolName] 工具名，默认 'Bash'。显式传 null 则不带该字段（测试缺失校验）。
 * @param {string} [permissionMode] 权限模式，缺省不带该字段
 * @param {string} [hookEventName] 事件名，默认 'PreToolUse'。显式传 null 则不带该字段（测试缺失校验）。
 * @returns {Promise<{ decision: string, reason: string, ms: number, error?: string }>}
 */
function callHook(toolInput, toolName = 'Bash', permissionMode, hookEventName = 'PreToolUse') {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn('node', [DIST], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      const ms = Date.now() - startedAt;
      // 退出码 0 且无 stdout：defer（不做决策，交回系统流程）——正常结果而非异常。
      if (code === 0 && stdout.trim() === '') {
        resolve({ decision: 'defer', reason: '交回系统默认流程', ms });
        return;
      }
      try {
        const hs = JSON.parse(stdout).hookSpecificOutput;
        resolve({ decision: hs.permissionDecision, reason: hs.permissionDecisionReason || '', ms });
      } catch {
        resolve({ decision: '?', reason: '', ms, error: `exit ${code} stdout=${stdout} stderr=${stderr}` });
      }
    });
    /** @type {Record<string, unknown>} */
    const payload = { tool_input: toolInput };
    if (toolName) payload.tool_name = toolName;
    if (permissionMode) payload.permission_mode = permissionMode;
    if (hookEventName) payload.hook_event_name = hookEventName;
    child.stdin.write(JSON.stringify(payload));
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
async function runGroup(title, cmds, toolName, permissionMode) {
  console.log(`\n===== ${title} =====`);
  for (const cmd of cmds) {
    const r = await callHook({ command: cmd }, toolName, permissionMode);
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

const PS_GROUPS = [
  ['PowerShell 本地只读规则（应快速 allow，不调 LLM）', [
    'Get-ChildItem',
    'Get-Process | Select-Object Name, CPU',
    'git status',
    'Test-Path package.json',
    'Get-Content README.md | Select-Object -First 20',
    'Get-ChildItem 2>$null',
  ]],
  ['PowerShell 写/危险命令（不走本地，交 LLM 或人工）', [
    'Remove-Item foo.txt',
    'Set-Content a.txt "x"',
    'echo x > a.txt',
    '[System.IO.File]::Delete("x")',
    'Invoke-WebRequest https://example.com',
  ]],
  ['PowerShell 旁路防御（不可本地放行，否则等于无人工确认放行写操作）', [
    'Get-ChildItem | ForEach-Object { Remove-Item $_.FullName }', // 脚本块内写操作
    'Get-Process | Where-Object { $_.CPU -gt 10 }',               // 脚本块本身不可信，整体不放行
    'Get-Content x 1> out.txt',                                   // 编号流重定向写文件
    'Get-Content x 3> w.txt',                                     // 警告流重定向写文件
    '& script.ps1',                                               // 调用操作符执行外部脚本
  ]],
];

for (const [title, cmds] of GROUPS) {
  await runGroup(title, cmds, 'Bash');
}
for (const [title, cmds] of PS_GROUPS) {
  await runGroup(title, cmds, 'PowerShell');
}

// 权限模式：免确认模式（bypassPermissions/auto/plan）应直接 defer，不调 LLM；
// 其余模式走完整分类。这里用一条本地未命中的只读命令，最能区分两种路径：
// - 免确认模式 → defer（毫秒级，无 LLM）
// - default/acceptEdits/dontAsk → 走 LLM 判定（allow）
console.log('\n===== 权限模式：免确认模式应直接 defer（不调 LLM） =====');
for (const mode of ['bypassPermissions', 'auto', 'plan']) {
  const r = await callHook({ command: 'grep -rn "TODO" src' }, 'Bash', mode);
  printResult(`[${mode}] grep -rn "TODO" src`, r);
}
console.log('\n===== 权限模式：需判定模式应走完整分类 =====');
for (const mode of ['default', 'acceptEdits', 'dontAsk']) {
  const r = await callHook({ command: 'ls -la' }, 'Bash', mode);
  printResult(`[${mode}] ls -la`, r);
}

// 防御性校验：非 PreToolUse 事件、或非 Bash/PowerShell 工具、或字段缺失时，
// 应直接 defer（毫秒级，不下决策、不调 LLM），绝不对未知工具放行。
console.log('\n===== 防御性校验：非预期调用应直接 defer =====');
const GUARD_CASES = [
  // [说明, toolInput, toolName, permissionMode, hookEventName]
  ['错误事件名 PostToolUse', { command: 'ls -la' }, 'Bash', undefined, 'PostToolUse'],
  ['缺失事件名', { command: 'ls -la' }, 'Bash', undefined, null],
  ['不支持的工具 Read', { file_path: 'a.txt' }, 'Read', undefined, 'PreToolUse'],
  ['不支持的工具 Edit', { file_path: 'a.txt' }, 'Edit', undefined, 'PreToolUse'],
  ['缺失工具名', { command: 'ls -la' }, null, undefined, 'PreToolUse'],
];
for (const [desc, toolInput, toolName, mode, eventName] of GUARD_CASES) {
  const r = await callHook(toolInput, toolName, mode, eventName);
  printResult(`[${desc}]`, r);
}
