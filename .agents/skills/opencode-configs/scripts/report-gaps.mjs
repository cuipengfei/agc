import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { diffSnapshots } from "./lib.mjs";

// Usage:
//   bun report-gaps.mjs --old cache/settings-prev.json [cache/settings.json]
//   bun report-gaps.mjs --out report.json cache/settings.json   （无基线时只出摘要）
// 升级前把旧 settings.json 留档为 settings-prev.json，升级后重跑 dump 再 diff。
const args = process.argv.slice(2);
function opt(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
}
const oldPath = opt("old");
const outPath = opt("out");
const newPath = args[args.length - 1] && !args[args.length - 1].startsWith("--")
  ? args[args.length - 1]
  : join(import.meta.dir, "../cache/settings.json");
if (args.includes("--old") && !oldPath) throw new Error("--old 需要路径参数");
if (!existsSync(newPath)) throw new Error(`找不到 ${newPath}，先跑 dump-settings.mjs`);

const fresh = JSON.parse(await readFile(newPath, "utf8"));

if (!oldPath || !existsSync(oldPath)) {
  const summary = {
    version: fresh.version,
    keys: fresh.counts,
    note: "无 --old 基线，只出摘要。升级前把当前 settings.json 复制为 settings-prev.json 即可获得 diff。",
  };
  const text = JSON.stringify(summary, null, 2);
  if (outPath) await writeFile(outPath, text);
  else console.log(text);
} else {
  const prev = JSON.parse(await readFile(oldPath, "utf8"));
  const report = diffSnapshots(prev, fresh);
  const text = JSON.stringify(report, null, 2);
  if (outPath) await writeFile(outPath, text);
  else console.log(text);
}
