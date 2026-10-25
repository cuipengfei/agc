import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

// Usage:
//   bun report-gaps.mjs [--old prev-settings.json] [--out report.json] settings.json
//
// With --old: exact diff against a previous snapshot (added / removed /
// fingerprint changed). Without --old: on a version bump every translated key
// is listed for prose review, because a fingerprint can only see the
// reference entry, never behaviour that lives in consuming code.
const args = process.argv.slice(2);
function opt(name) {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : null;
}
const oldPath = opt("old");
const outPath = opt("out");
const newPath = args[args.length - 1];
if (!newPath || newPath.startsWith("--")) {
	throw new Error("usage: report-gaps.mjs [--old prev.json] [--out r.json] settings.json");
}

const fresh = JSON.parse(await readFile(newPath, "utf8"));
const freshById = new Map(fresh.settings.map((s) => [s.id, s]));

let prevById = null;
let prevVersion = null;
if (oldPath && existsSync(oldPath)) {
	const prev = JSON.parse(await readFile(oldPath, "utf8"));
	prevVersion = prev.version;
	prevById = new Map(prev.settings.map((s) => [s.id, s]));
}

const added = [];
const removed = [];
const fingerprintChanged = [];
const statusChanged = [];

for (const [id, s] of freshById) {
	const base = prevById?.get(id);
	if (prevById && !base) {
		added.push(id);
		continue;
	}
	if (base && base.fingerprint !== s.fingerprint) fingerprintChanged.push(id);
	if (base && base.status !== s.status) statusChanged.push(id);
}
for (const id of prevById?.keys() ?? []) {
	if (!freshById.has(id)) removed.push(id);
}

const versionBumped = prevVersion != null && prevVersion !== fresh.version;
const report = {
	tool: "herdr",
	newVersion: fresh.version,
	previousVersion: prevVersion ?? null,
	versionBumped,
	baselineKind: prevById ? "previous snapshot" : "none",
	counts: {
		freshKeys: freshById.size,
		baselineKeys: prevById?.size ?? 0,
		added: added.length,
		removed: removed.length,
		fingerprintChanged: fingerprintChanged.length,
		statusChanged: statusChanged.length,
	},
	added: added.sort(),
	removed: removed.sort(),
	fingerprintChanged: fingerprintChanged.sort(),
	statusChanged: statusChanged.sort(),
	// Only meaningful with --old: on a version bump every existing key may be
	// stale in prose even when its fingerprint is stable.
	needsReviewOnVersionBump: versionBumped ? [...freshById.keys()].sort() : [],
};

const text = JSON.stringify(report, null, 2);
if (outPath) await writeFile(outPath, text);
else console.log(text);
