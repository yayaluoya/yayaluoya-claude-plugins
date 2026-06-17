/**
 * 本地只读放行规则：命中即可秒放行，无需调用 LLM。
 * Bash 与 PowerShell 各有独立规则集——两者的语法、大小写敏感性、
 * 危险特征完全不同，不能共用。localClassify 按 shell 选对应规则集。
 */

/* ============================== Bash ============================== */

/**
 * Bash 只读命令段：一条命令按管道/逻辑运算符拆段后，所有段都安全才放行。
 */
const BASH_SAFE_PATTERNS = [
  /^ls(\s|$)/,
  /^cat(\s|$)/,
  /^head(\s|$)/,
  /^tail(\s|$)/,
  /^pwd$/,
  /^which(\s|$)/,
  /^where(\s|$)/,
  /^file(\s|$)/,
  /^stat(\s|$)/,
  /^wc(\s|$)/,
  /^du(\s|$)/,
  /^df(\s|$)/,
  /^find(\s|$)/,
  /^tree(\s|$)/,
  /^echo(\s|$)/,
  /^printf(\s|$)/,
  /^date(\s|$)/,
  /^whoami$/,
  /^hostname(\s|$)/,
  /^uname(\s|$)/,
  /^env$/,
  /^printenv(\s|$)/,
  /^true$/,
  /^false$/,
  /^jq(\s|$)/,
  /^yq(\s|$)/,
  /^rg(\s|$)/,
  /^fd(\s|$)/,
  /^bat(\s|$)/,
  /^git\s+(status|diff|log|show|branch|remote|tag|blame|rev-parse|ls-files|reflog|shortlog|describe|name-rev)(\s|$)/,
  /^git\s+stash\s+(list|show)(\s|$)/,
  /^git\s+config\s+(--get|--list|-l)(\s|$)/,
  /^(npm|pnpm|yarn)\s+(list|ls|why|outdated|view|info|show)(\s|$)/,
  /^(tsc|vue-tsc)\s+--noEmit(\s|$)/,
  /^[a-zA-Z][\w.-]*\s+(--version|--help|-v|-V|-h)$/,
];

/**
 * Bash 写/危险特征：出现则不走本地放行，交回上层（LLM 或人工）。
 */
const BASH_FORBIDDEN_PATTERNS = [
  /(^|[^>&])>(?!&)/,
  />>/,
  /\$\(/,
  /`/,
  /\bsudo\b/,
];

/** Bash 噪声剥离：去掉 stderr 重定向后再判定。 @param {string} cmd */
function stripBashNoise(cmd) {
  return cmd.replace(/2>\s*\/dev\/null/g, ' ').replace(/2>&1/g, ' ');
}

/* =========================== PowerShell =========================== */

/**
 * PowerShell 只读命令段（严格白名单）。
 * PS 能调任意 .NET（如 [System.IO.File]::Delete），黑名单堵不住无限攻击面，
 * 所以只白名单放行公认只读的 cmdlet/别名，其余一律交 LLM。
 * 全部大小写不敏感（/i）——PS 命令大小写不敏感，Get-ChildItem ≡ get-childitem。
 */
const PS_SAFE_PATTERNS = [
  /^(Get-ChildItem|gci|dir|ls)(\s|$)/i,
  /^(Get-Content|gc|cat|type)(\s|$)/i,
  /^Get-Item(\s|$)/i,
  /^Get-ItemProperty(\s|$)/i,
  /^Get-ItemPropertyValue(\s|$)/i,
  /^(Get-Process|ps|gps)(\s|$)/i,
  /^(Get-Service|gsv)(\s|$)/i,
  /^(Get-Location|pwd|gl)(\s|$)/i,
  /^Get-Date(\s|$)/i,
  /^(Get-Command|gcm)(\s|$)/i,
  /^Get-Member(\s|$)/i,
  /^Get-Help(\s|$)/i,
  /^Get-Variable(\s|$)/i,
  /^Get-Module(\s|$)/i,
  /^Get-Host(\s|$)/i,
  /^Get-Alias(\s|$)/i,
  /^(Test-Path|Resolve-Path)(\s|$)/i,
  /^(Select-Object|select)(\s|$)/i,
  /^(Where-Object|where|\?)(\s|$)/i,
  /^(ForEach-Object|foreach|%)(\s|$)/i,
  /^(Measure-Object|measure)(\s|$)/i,
  /^(Sort-Object|sort)(\s|$)/i,
  /^(Group-Object|group)(\s|$)/i,
  /^(Select-String|sls)(\s|$)/i,
  /^Compare-Object(\s|$)/i,
  /^Format-(Table|List|Wide|Custom)(\s|$)/i,
  /^(Out-String|Out-Host|Out-Default)(\s|$)/i,
  /^(Write-Output|echo|write)(\s|$)/i,
  /^Write-Host(\s|$)/i,
  /^(ConvertTo|ConvertFrom)-(Json|Csv|Xml|Html|StringData)(\s|$)/i,
  /^git\s+(status|diff|log|show|branch|remote|tag|blame|rev-parse|ls-files|reflog|shortlog|describe|name-rev)(\s|$)/i,
  /^git\s+stash\s+(list|show)(\s|$)/i,
  /^git\s+config\s+(--get|--list|-l)(\s|$)/i,
  /^(npm|pnpm|yarn)\s+(list|ls|why|outdated|view|info|show)(\s|$)/i,
  /^(tsc|vue-tsc)\s+--noEmit(\s|$)/i,
  /^[a-zA-Z][\w.-]*\s+(--version|--help|-v|-V|-h)$/i,
];

/**
 * PowerShell 写/危险特征。
 * 注意：不含 $( 和反引号——它们在 PS 里是子表达式和转义符，到处都是，
 * 拦了会让本地 fast-path 对几乎所有 PS 命令失效。
 * 脚本块 {} 内是不受白名单约束的任意代码（如 ForEach-Object { Remove-Item }），一律拦。
 */
const PS_FORBIDDEN_PATTERNS = [
  /(^|[^>&])>(?!&)/, // > 重定向（含 1>/3>..6> 等编号流重定向）；2>$null 已在剥离阶段去掉
  />>/,
  /\{/, // 脚本块：白名单只校验段首 cmdlet，块内代码不可信，一律不本地放行
  /\]\s*::/, // .NET 静态成员调用，如 [System.IO.File]::Delete
  /(^|[\s;|(])&/, // & 调用操作符执行外部脚本/命令
];

/** PowerShell 噪声剥离：去掉 stderr 重定向与静默错误开关后再判定。 @param {string} cmd */
function stripPsNoise(cmd) {
  return cmd
    .replace(/2>\s*\$null/gi, ' ')
    .replace(/2>&1/g, ' ')
    .replace(/-ErrorAction\s+SilentlyContinue/gi, ' ');
}

/* ============================ 分发 ============================ */

const RULESETS = {
  Bash: {
    safe: BASH_SAFE_PATTERNS,
    forbidden: BASH_FORBIDDEN_PATTERNS,
    strip: stripBashNoise,
  },
  PowerShell: {
    safe: PS_SAFE_PATTERNS,
    forbidden: PS_FORBIDDEN_PATTERNS,
    strip: stripPsNoise,
  },
};

/**
 * 本地规则判定。
 * @param {string} cmd 原始命令
 * @param {'Bash' | 'PowerShell'} [shell] 命令所属 shell，缺失/未知按 Bash 处理
 * @returns {'allow' | null} 命中全部只读规则返回 'allow'，否则 null（需进一步判定）
 */
export function localClassify(cmd, shell = 'Bash') {
  const trimmed = cmd.trim();
  if (!trimmed) return null;

  const { safe, forbidden, strip } = RULESETS[shell] || RULESETS.Bash;

  const stripped = strip(trimmed);
  if (forbidden.some((p) => p.test(stripped))) return null;

  const segments = stripped.split(/\s*(?:&&|\|\||;|\|)\s*/).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  const allSafe = segments.every((seg) => safe.some((rx) => rx.test(seg)));
  return allSafe ? 'allow' : null;
}
