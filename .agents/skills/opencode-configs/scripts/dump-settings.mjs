import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildRows, validateAssets } from "./lib.mjs";

// Usage: bun dump-settings.mjs [out.json]
// 配置值仅在进程内处理；产物写入前完成校验与脱敏。
const ROOT = join(import.meta.dir, "..");
const OUT = process.argv[2] ?? join(ROOT, "cache/settings.json");
function run(args) {
  const proc = Bun.spawnSync(["opencode", ...args], { stdout: "pipe", stderr: "pipe", timeout: 90_000 });
  if (proc.exitCode !== 0) throw new Error(`opencode 调用失败（exit ${proc.exitCode}）`);
  return proc.stdout.toString();
}
const apiJson = (path) => JSON.parse(run(["api", "GET", path]));
const cliVersion = run(["--version"]).trim().replace(/^opencode\s+v?/, "");
const info = apiJson("/api/info");
const defaults = await Bun.file(join(ROOT, "defaults.json")).json();
const translations = await Bun.file(join(ROOT, "translations.json")).json();
const evidence = await Bun.file(join(ROOT, "evidence.json")).json();
validateAssets(defaults, evidence, info.version, cliVersion);
const spec = apiJson("/openapi.json");
const docs = apiJson("/api/config");
const rows = buildRows(spec, docs, defaults, translations, evidence, info.version, cliVersion);
const topKeys = new Set(rows.filter((r) => !r.key.includes(".")).map((r) => r.key));
const trTop = new Set(Object.keys(translations).filter((k) => !k.includes(".") && !k.startsWith("_")));
const schemaMissing = [...topKeys].filter((k) => !trTop.has(k)).sort();
const schemaExtra = [...trTop].filter((k) => !topKeys.has(k)).sort();
const counts = { total: rows.length, unset: 0, "default-explicit": 0, customized: 0, declared: 0 };
for (const r of rows) counts[r.state] += 1;
const out = {
  version: info.version, generatedAt: new Date().toISOString(),
  documents: docs.filter((d) => d.type === "document").map((d) => d.path ?? "(inline)"),
  counts, schemaMissing, schemaExtra, fields: rows,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${OUT}: total=${counts.total} unset=${counts.unset} defaultExplicit=${counts["default-explicit"]} customized=${counts.customized} declared=${counts.declared} schemaMissing=${schemaMissing.length} schemaExtra=${schemaExtra.length}`);
if (schemaExtra.length) console.error(`translations 有而 schema 没有：${schemaExtra.join(", ")}`);
