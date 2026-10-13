// 版本化取证复查：对照目标 tag 重新计算 evidence.json 里每个来源文件的 SHA256，
// 列出 changedSources / missingSources / affectedKeys / unchangedKeys，供 LLM 复查后人工更新资产。
// 不修改 evidence.json 与 defaults.json；输出不含任何配置值。
//
// Usage: bun review-evidence.mjs --version VERSION [--out cache/evidence-review.json] [--source-dir DIR]
//   --version     目标版本（2.0.28 或 v2.0.28 均可；输出 version 归一化为不带 v，与引擎 info.version 对齐）
//   --out         复查结果输出路径（默认 ../cache/evidence-review.json，相对脚本目录）
//   --source-dir  本地源码 checkout 根目录；设置后离线读取 <source-dir>/<path>，不再调用 gh
//   --evidence/--defaults  覆盖默认资产路径（供测试夹具使用）
// 退出码：0=对比完成（含变化/缺失）；1=输入/网络/鉴权等硬错误。缺失源计入 missingSources，不视为硬错误。
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EVIDENCE = join(ROOT, "evidence.json");
const DEFAULTS = join(ROOT, "defaults.json");

const HEX64 = /^[0-9a-f]{64}$/;

export function loadEvidence(path = EVIDENCE, defaultsPath = DEFAULTS) {
  const evidence = JSON.parse(readFileSync(path, "utf8"));
  if (typeof evidence.repository !== "string" || !evidence.repository)
    throw new Error("evidence.json: repository 缺失或为空");
  if (typeof evidence.version !== "string" || !evidence.version)
    throw new Error("evidence.json: version 缺失或为空");
  const sources = evidence.sources ?? {};
  const keys = evidence.keys ?? {};
  for (const [path, entry] of Object.entries(sources)) {
    if (!entry || !HEX64.test(entry.sha256 ?? ""))
      throw new Error(`evidence.json: sources["${path}"].sha256 必须是完整 64 位十六进制`);
  }
  for (const [key, refs] of Object.entries(keys)) {
    if (!Array.isArray(refs) || refs.length === 0)
      throw new Error(`evidence.json: keys["${key}"] 必须引用至少一个 source`);
    for (const ref of refs)
      if (!sources[ref]) throw new Error(`evidence.json: keys["${key}"] 引用了不存在的 source "${ref}"`);
  }
  // 每个 defaults 键都必须有非空 source 引用
  const defaults = JSON.parse(readFileSync(defaultsPath, "utf8"));
  const missing = Object.keys(defaults).filter((k) => !keys[k] || keys[k].length === 0);
  if (missing.length) throw new Error(`evidence.json: defaults 键缺少 source 引用：${missing.join(", ")}`);
  return evidence;
}

// 默认取字节实现：gh api 原始字节（仅限 GitHub 源；鉴权/网络错误向上抛，404 返回 null）
function ghBytes(repository, ref, path) {
  const proc = spawnSync(
    "gh",
    ["api", `repos/${repository}/contents/${path}?ref=${ref}`, "-H", "Accept: application/vnd.github.raw"],
    { maxBuffer: 64 * 1024 * 1024, encoding: "buffer" },
  );
  if (proc.status === 0) return proc.stdout;
  const err = (proc.stderr ?? Buffer.alloc(0)).toString("utf8");
  if (/404|Not Found/i.test(err)) return null;
  throw new Error(`gh api 获取 ${path} 失败（非 404，按硬错误终止）：${err.trim()}`);
}

// 核心对比。fetchBytes(path) 返回 Buffer；源不存在返回 null；其他错误抛异常由调用方终止。
export function review(evidence, fetchBytes, version) {
  const { sources, keys } = evidence;
  const changed = [];
  const missing = [];
  const unchanged = [];

  for (const path of Object.keys(sources).sort()) {
    const bytes = fetchBytes(path);
    if (bytes === null) {
      missing.push(path);
      continue;
    }
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual === sources[path].sha256) unchanged.push(path);
    else changed.push({ path, expected: sources[path].sha256, actual });
  }

  const dirty = new Set([...changed.map((c) => c.path), ...missing]);
  const affectedKeys = Object.keys(keys)
    .filter((key) => keys[key].some((ref) => dirty.has(ref)))
    .sort();
  const unchangedKeys = Object.keys(keys)
    .filter((key) => !affectedKeys.includes(key))
    .sort();

  return {
    repository: evidence.repository,
    version,
    changedSources: changed,
    missingSources: missing,
    unchangedSources: unchanged,
    affectedKeys,
    unchangedKeys,
  };
}

function parseArgs(argv) {
  const args = { out: join(ROOT, "cache", "evidence-review.json") };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--version") args.version = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--source-dir") args.sourceDir = argv[++i];
    else if (arg === "--evidence") args.evidence = argv[++i];
    else if (arg === "--defaults") args.defaults = argv[++i];
    else throw new Error(`未知参数：${arg}`);
  }
  if (!args.version) throw new Error("缺少 --version VERSION");
  return args;
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const evidence = loadEvidence(args.evidence, args.defaults);
    // 归一化：输出与 evidence 约定 version 均不带 v（与引擎 info.version 对齐），tag 引用补 v
    const version = args.version.replace(/^v/, "");
    const ref = `v${version}`;
    let fetchBytes;
    if (args.sourceDir) {
      fetchBytes = (path) => {
        const full = join(args.sourceDir, path);
        return existsSync(full) ? readFileSync(full) : null;
      };
    } else {
      fetchBytes = (path) => ghBytes(evidence.repository, ref, path);
    }
    const result = review(evidence, fetchBytes, version);
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify(result, null, 2) + "\n");
    console.log(
      `wrote ${args.out}: changed=${result.changedSources.length} missing=${result.missingSources.length} ` +
        `unchanged=${result.unchangedSources.length} affectedKeys=${result.affectedKeys.length}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
