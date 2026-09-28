import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Usage: bun report-gaps.mjs [--old prev.json] [--out report.json] [settings.json]
// Diffs two dump-settings.mjs snapshots. Because defaults come from the engine's
// own getters at dump time, a shipped-default change on a version bump shows up
// as defaultChanged here — no separate fingerprint needed.
const args = process.argv.slice(2);
function opt(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
}
const oldPath = opt("old");
const outPath = opt("out");
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--old" && args[i - 1] !== "--out");
const newPath = positional[positional.length - 1] ?? join(import.meta.dir, "../cache/settings.json");

function flatten(snap) {
  const map = new Map();
  for (const f of [...snap.senpi.fields, ...snap.native.fields]) map.set(f.key, f);
  return map;
}

const fresh = JSON.parse(await readFile(newPath, "utf8"));
const freshBy = flatten(fresh);

if (!oldPath || !existsSync(oldPath)) {
  const report = {
    baseline: null,
    note: "no --old snapshot; nothing to diff. Save this run as the baseline for next time.",
    counts: { freshKeys: freshBy.size },
  };
  const text = JSON.stringify(report, null, 2);
  if (outPath) await writeFile(outPath, text);
  else console.log(text);
} else {
  const prev = JSON.parse(await readFile(oldPath, "utf8"));
  const prevBy = flatten(prev);

  const added = [];
  const removed = [];
  const defaultChanged = [];
  const stateChanged = [];

  for (const [key, f] of freshBy) {
    const base = prevBy.get(key);
    if (!base) {
      added.push(key);
      continue;
    }
    if (JSON.stringify(base.default) !== JSON.stringify(f.default)) {
      defaultChanged.push({ key, from: base.default, to: f.default });
    }
    if (base.state !== f.state) {
      stateChanged.push({ key, from: base.state, to: f.state });
    }
  }
  for (const key of prevBy.keys()) {
    if (!freshBy.has(key)) removed.push(key);
  }

  const report = {
    baseline: oldPath,
    counts: {
      freshKeys: freshBy.size,
      baselineKeys: prevBy.size,
      added: added.length,
      removed: removed.length,
      defaultChanged: defaultChanged.length,
      stateChanged: stateChanged.length,
    },
    added: added.sort(),
    removed: removed.sort(),
    defaultChanged: defaultChanged.sort((a, b) => a.key.localeCompare(b.key)),
    stateChanged: stateChanged.sort((a, b) => a.key.localeCompare(b.key)),
  };
  const text = JSON.stringify(report, null, 2);
  if (outPath) await writeFile(outPath, text);
  else console.log(text);
}
