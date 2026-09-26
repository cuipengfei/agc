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
if (oldPath && existsSync(oldPath)) {
	const prev = JSON.parse(await readFile(oldPath, "utf8"));
	prevVersion = prev.version;
	prevById = new Map(prev.settings.map((s) => [s.id, s]));
}

const baseline = prevById ?? explIndex;
const baselineKind = prevById ? "previous snapshot" : "explanation index";

const added = [];
const removed = [];
const fingerprintChanged = [];
const descriptorChanged = [];

for (const [id, s] of freshById) {
	const base = baseline instanceof Map && baseline.get(id);
	if (!base) {
		added.push(id);
		continue;
	}
	if (prevById) {
		if (base.fingerprint !== s.fingerprint) fingerprintChanged.push(id);
	} else {
		// Explanation index carries no fingerprint; flag every explained key on a
		// version bump so a human can confirm the prose still matches the code.
		if (prevVersion && prevVersion !== fresh.version) descriptorChanged.push(id);
	}
}
for (const id of baseline instanceof Map ? baseline.keys() : []) {
	if (!freshById.has(id)) removed.push(id);
}

const versionBumped = prevVersion != null && prevVersion !== fresh.version;
const report = {
	newVersion: fresh.version,
	previousVersion: prevVersion ?? null,
	versionBumped,
	baselineKind,
	counts: {
		freshKeys: freshById.size,
		baselineKeys: baseline.size,
		added: added.length,
		removed: removed.length,
		fingerprintChanged: fingerprintChanged.length,
		needsReviewOnVersionBump: versionBumped ? descriptorChanged.length : 0,
	},
	added: added.sort(),
	removed: removed.sort(),
	fingerprintChanged: fingerprintChanged.sort(),
	// On a version bump with only the explanation index available, every key
	// with an explanation may be stale in prose even though its descriptor
	// hash is stable — the hash cannot see behavior living in consuming code.
	needsReviewOnVersionBump: versionBumped ? [...explIndex.keys()].sort() : [],
};

const text = JSON.stringify(report, null, 2);
if (outPath) await writeFile(outPath, text);
else console.log(text);
