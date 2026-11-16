// Evidence bookkeeping for [native] task/memory schema defaults (omo-configs skill).
//
// The 73 schemaDefault values inlined in dump-settings.mjs
// (NATIVE_NESTED_SETTINGS_FIELDS) were read from the PUBLIC source tag v5.0.1
// (code-yeongyu/oh-my-openagent, packages/omo-config-core/{task,memory}.ts),
// NOT from the currently installed omo-ai bundle. EVIDENCE_VERSION records
// that provenance; rows re-verified against a newer installed bundle are
// listed in RE_VERIFIED_5_1_72 and carry evidence "5.1.72". Everything else
// stays "5.0.1" evidence and MUST NOT be presented as verified against the
// installed version — dump-settings warns loudly on divergence.
//
// Re-verified against installed omo-ai 5.1.72 bundle
// (plugin/extensions/omo-task.js + plugin/CHANGELOG.md):
//   - task.residency_max_children: schema default "unlimited"
//     (CHANGELOG: defaults to "unlimited"; bundle: Nc="unlimited", zod union
//     int|"unlimited" with .default(Nc))
//   - task.global_concurrency: schema default 8 (zod .default(8)), while the
//     effective-when-unset formula is still max(8, 2×availableParallelism)
//     (bundle resolve fn: global_concurrency ?? Math.max(8, 2*t()))
// These two are exactly the keys where schema default and runtime formula
// differ or changed since 5.0.1; keep them distinct in the report.

export const EVIDENCE_VERSION = "5.0.1";

export const RE_VERIFIED_5_1_72 = [
  "task.global_concurrency",
  "task.residency_max_children",
];

// Runtime effective-when-unset formula for task.global_concurrency
// (omo-ai 5.1.72 resolveOmoTaskSettings: ?? Math.max(8, 2*availableParallelism())).
// This is NOT the schema default — the zod schema declares .default(8).
export function resolveGlobalConcurrency(parallelism) {
  return Math.max(8, 2 * parallelism);
}

// Schema default of task.residency_max_children since omo-ai 5.1.72.
export const RESIDENCY_MAX_CHILDREN_DEFAULT = "unlimited";

// Evidence tag attached to a dumped row, keyed by `parent.subKey`.
export function evidenceFor(fullKey) {
  return RE_VERIFIED_5_1_72.includes(fullKey)
    ? "5.1.72"
    : EVIDENCE_VERSION;
}

// Detect the installed omo-ai version from candidate package dirs.
// `reader` returns package.json text or throws; injectable for offline tests.
// Returns null when no candidate resolves (e.g. CI without an install).
export function detectOmoAiVersion(candidates, reader) {
  for (const dir of candidates) {
    try {
      const pkg = JSON.parse(reader(`${dir}/package.json`));
      if (typeof pkg.version === "string" && pkg.version) return pkg.version;
    } catch {
      // try next candidate
    }
  }
  return null;
}

// Warn whenever at least one stored row has a different or unknown version.
export function evidenceWarning(detectedVersion) {
  const verified = RE_VERIFIED_5_1_72.join("、");
  if (detectedVersion === EVIDENCE_VERSION) {
    return `安装版 omo-ai ${detectedVersion}：${verified} 使用 5.1.72 的证据，请复查这些键在当前版本中的默认值`;
  }
  if (detectedVersion == null) {
    return `无法检测本机 omo-ai 版本（无 OMO_AI_DIR、无全局安装）。` +
      `[native] task/memory 的证据分别来自 ${EVIDENCE_VERSION} 与 5.1.72；` +
      `引用默认值前先与当前安装源码核对`;
  }
  return `安装版 omo-ai ${detectedVersion} 与 schemaDefault 证据版本 ${EVIDENCE_VERSION} 不一致：` +
    `73 个默认值中仅 ${verified} 已对照 5.1.72 复核，其余仍是 ${EVIDENCE_VERSION} 旧证据，` +
    `未逐一复核前不要当作当前版本的可靠默认`;
}
