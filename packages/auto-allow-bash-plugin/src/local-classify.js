/**
 * 本地只读放行规则：命中即可秒放行，无需调用 LLM。
 * 每个 SAFE_SEGMENT_PATTERN 描述一个公认只读的命令段；
 * 一条命令按管道/逻辑运算符拆段后，所有段都安全才放行。
 */
const SAFE_SEGMENT_PATTERNS = [
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
 * 出现这些写/危险特征则不走本地放行，交回上层（LLM 或人工）。
 */
const FORBIDDEN_PATTERNS = [
  /(^|[^>&])>(?!&)/,
  />>/,
  /\$\(/,
  /`/,
  /\bsudo\b/,
];

/**
 * 本地规则判定。
 * @param {string} cmd 原始命令
 * @returns {'allow' | null} 命中全部只读规则返回 'allow'，否则 null（需进一步判定）
 */
export function localClassify(cmd) {
  const trimmed = cmd.trim();
  if (!trimmed) return null;

  const stripped = trimmed.replace(/2>\s*\/dev\/null/g, ' ').replace(/2>&1/g, ' ');
  if (FORBIDDEN_PATTERNS.some((p) => p.test(stripped))) return null;

  const segments = stripped.split(/\s*(?:&&|\|\||;|\|)\s*/).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  const allSafe = segments.every((seg) => SAFE_SEGMENT_PATTERNS.some((rx) => rx.test(seg)));
  return allSafe ? 'allow' : null;
}
