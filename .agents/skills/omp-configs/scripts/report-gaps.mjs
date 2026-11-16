import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

// Usage:
//   bun report-gaps.mjs [--old prev-settings.json] [--expl explanations-dir] [--out report.json] settings.json
// Without --old, "removed" is computed against the explanation index instead.
const args = process.argv.slice(2);
function opt(name) {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : null;
}
const oldPath = opt("old");
const explDir = opt("expl") ?? join(import.meta.dir, "../explanations");
const outPath = opt("out");
const newPath = args[args.length - 1];
if (!newPath || newPath.startsWith("--")) {
	throw new Error("usage: report-gaps.mjs [--old prev.json] [--expl dir] [--out r.json] settings.json");
}

const fresh = JSON.parse(await readFile(newPath, "utf8"));
const freshById = new Map(fresh.settings.map((s) => [s.id, s]));

const explIndex = new Map();
if (existsSync(explDir)) {
	for (const f of await readdir(explDir)) {
		if (f.endsWith(".md")) explIndex.set(basename(f, ".md"), join(explDir, f));
	}
}

let prevById = null;
let prevVersion = null;
if (oldPath) {
	if (!existsSync(oldPath)) {
		throw new Error(`--old 指定的旧版本快照不存在：${oldPath}（没有旧版本就不要传 --old，基于证据版本 review 或标记 unknown）`);
	}
	const prev = JSON.parse(await readFile(oldPath, "utf8"));
	prevVersion = prev.version;
	prevById = new Map(prev.settings.map((s) => [s.id, s]));
}
const baseline = prevById ?? explIndex;
const baselineKind = prevById
	? "previous snapshot"
	: explIndex.size
		? "explanation index"
		: "none";

const added = [];
const removed = [];
const fingerprintChanged = [];
for (const [id, s] of freshById) {
	const base = baseline instanceof Map && baseline.get(id);
	if (!base) {
		added.push(id);
		continue;
	}
	if (prevById && base.fingerprint !== s.fingerprint) fingerprintChanged.push(id);
}
for (const id of baseline instanceof Map ? baseline.keys() : []) {
	if (!freshById.has(id)) removed.push(id);
}

const versionBumped = prevVersion != null && prevVersion !== fresh.version;
const needsReviewOnVersionBump = versionBumped
	? [...explIndex.keys()].filter((id) => freshById.has(id)).sort()
	: [];
// 没有旧快照时没有任何版本证据，明确标 unknown，不虚构升级比较。
const versionComparison = prevVersion
	? versionBumped
		? "upgraded"
		: "unchanged"
	: "unknown";
const report = {
	newVersion: fresh.version,
	previousVersion: prevVersion ?? null,
	versionBumped,
	versionComparison,
	baselineKind,
	counts: {
		freshKeys: freshById.size,
		baselineKeys: baseline.size,
		added: added.length,
		removed: removed.length,
		fingerprintChanged: fingerprintChanged.length,
		needsReviewOnVersionBump: needsReviewOnVersionBump.length,
	},
	added: added.sort(),
	removed: removed.sort(),
	fingerprintChanged: fingerprintChanged.sort(),
	needsReviewOnVersionBump,
};

const text = JSON.stringify(report, null, 2);
if (outPath) await writeFile(outPath, text);
else console.log(text);
