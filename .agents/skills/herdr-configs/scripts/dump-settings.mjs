import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Enumerate every Herdr config key from the official machine-readable
// reference for the installed version, then classify each against what the
// local config.toml actually contains.
//
// Defaults come from two first-hand sources, in this order:
//   1. `herdr --default-config` — the shipped template. Its assignments are
//      mostly commented out, so they are scanned line by line; a line whose
//      right-hand side is not a standalone TOML value is prose and is skipped.
//   2. The reference entry's `default`, but only when it parses as one JSON
//      value. Entries carrying prose (e.g. a per-platform default) are marked
//      undeterminable rather than guessed at.
// The effective value is the config file's value; environment overrides and
// runtime-only changes are not resolved here.
//
// Version and reference resolution fail loudly: a snapshot labelled with the
// wrong version would silently mislabel every default, so no fallback.

const cacheDir = join(import.meta.dir, "../cache");
const configPath =
	process.env.HERDR_CONFIG_PATH ?? join(homedir(), ".config/herdr/config.toml");

function runHerdr(args) {
	const proc = Bun.spawnSync(["herdr", ...args]);
	const stdout = proc.stdout.toString();
	const stderr = proc.stderr.toString().trim();
	if (proc.exitCode !== 0) {
		throw new Error(`herdr ${args.join(" ")} failed (exit ${proc.exitCode}): ${stderr}`);
	}
	return stdout;
}

function herdrVersion() {
	const text = runHerdr(["--version"]).trim();
	const match = text.match(/^herdr\s+(\d+\.\d+\.\d+)/);
	if (!match) throw new Error(`unexpected herdr --version output: ${JSON.stringify(text)}`);
	return match[1];
}

function loadDefaultConfig() {
	const values = new Map();
	let section = [];
	for (const raw of runHerdr(["--default-config"]).split("\n")) {
		const line = raw.replace(/\s+$/, "");
		if (/^\s*\[\[/.test(line)) continue;
		const header = line.match(/^\s*\[([^\]]+)\]\s*$/);
		if (header) {
			section = header[1].split(".");
			continue;
		}
		const assignment = line.match(/^\s*#?\s*([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(.+?)\s*$/);
		if (!assignment) continue;
		// The template interleaves prose with assignments; only a right-hand
		// side that parses on its own is a default value.
		let parsed;
		try {
			parsed = Bun.TOML.parse(`x = ${assignment[2]}`).x;
		} catch {
			continue;
		}
		values.set([...section, assignment[1]].join("."), parsed);
	}
	return values;
}

async function loadReference(version) {
	const explicit = process.env.HERDR_REFERENCE_JSON;
	if (explicit) {
		if (!existsSync(explicit)) throw new Error(`HERDR_REFERENCE_JSON not found: ${explicit}`);
		return { source: explicit, data: JSON.parse(await readFile(explicit, "utf8")) };
	}
	const cached = join(cacheDir, `config-reference-${version}.json`);
	if (existsSync(cached)) {
		return { source: cached, data: JSON.parse(await readFile(cached, "utf8")) };
	}
	const url = `https://raw.githubusercontent.com/herdrdev/herdr/v${version}/docs/next/website/src/data/config-reference.json`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`cannot fetch config reference for Herdr ${version}: HTTP ${res.status} ${url}`);
	}
	const text = await res.text();
	await mkdir(cacheDir, { recursive: true });
	await writeFile(cached, text);
	return { source: cached, data: JSON.parse(text) };
}

function flatten(value, prefix = "", out = new Map()) {
	for (const [key, child] of Object.entries(value)) {
		const path = prefix ? `${prefix}.${key}` : key;
		const isTable =
			child !== null && typeof child === "object" && !Array.isArray(child);
		if (isTable) flatten(child, path, out);
		else out.set(path, child);
	}
	return out;
}

function resolveDefault(entry, templateValues) {
	if (entry.default === "unset" || entry.default === null || entry.default === undefined) {
		return { source: "reference:unset" };
	}
	if (templateValues.has(entry.key)) {
		return { value: templateValues.get(entry.key), source: "default-config" };
	}
	try {
		return { value: JSON.parse(entry.default), source: "reference" };
	} catch {
		return { unknown: true, source: "undeterminable" };
	}
}

function stable(value) {
	if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
	if (value !== null && typeof value === "object") {
		return `{${Object.keys(value)
			.sort()
			.map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value ?? null);
}

const SECRET_KEY = /(token|secret|password|passwd|credential|api[_-]?key|authorization|cookie)/i;
const SECRET_LITERAL =
	/(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._~+/-]{16,})/;
const LOCAL_URL = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i;

function redact(value, keyPath, configured) {
	if (value === null || value === undefined) return value;
	if (SECRET_KEY.test(keyPath)) {
		if (typeof value === "string" && value.length === 0) return value;
		return "<redacted>";
	}
	if (typeof value === "string") {
		if (configured && /^https?:\/\//i.test(value) && !LOCAL_URL.test(value)) {
			return "<redacted>";
		}
		if (SECRET_LITERAL.test(value)) return value.replace(new RegExp(SECRET_LITERAL, "g"), "<redacted>");
		return value;
	}
	if (Array.isArray(value)) return value.map((v) => redact(v, keyPath, configured));
	if (typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, redact(v, `${keyPath}.${k}`, configured)]),
		);
	}
	return value;
}

function fingerprint(entry) {
	const shape = {
		key: entry.key,
		type: entry.type,
		default: entry.default ?? null,
		description: entry.description ?? null,
		values: entry.values ?? null,
	};
	return createHash("sha256").update(JSON.stringify(shape)).digest("hex").slice(0, 16);
}

const version = herdrVersion();
const templateValues = loadDefaultConfig();
const { source: referenceSource, data: reference } = await loadReference(version);

const referenceRows = [];
for (const section of reference.sections) {
	for (const entry of section.keys) {
		referenceRows.push({ ...entry, group: section.title });
	}
}

if (!existsSync(configPath)) {
	throw new Error(`config not found: ${configPath}`);
}
const local = flatten(Bun.TOML.parse(await readFile(configPath, "utf8")));
const referenceKeys = new Set(referenceRows.map((r) => r.key));

// A key counts as configured when it is present directly, or when any of its
// descendants is present (e.g. rows_by_agent.omp under rows_by_agent).
function localValue(key) {
	if (local.has(key)) return { present: true, value: local.get(key) };
	const prefix = `${key}.`;
	const subtree = {};
	let found = false;
	for (const [path, value] of local) {
		if (path.startsWith(prefix)) {
			subtree[path.slice(prefix.length)] = value;
			found = true;
		}
	}
	return found ? { present: true, value: subtree } : { present: false, value: undefined };
}

const rows = [];
const counts = { unset: 0, "default-explicit": 0, customized: 0, unknown: 0 };
for (const entry of referenceRows) {
	const resolved = resolveDefault(entry, templateValues);
	const { present, value } = localValue(entry.key);
	let status;
	if (!present) status = "unset";
	else if (resolved.source === "undeterminable") status = "unknown";
	else if (resolved.source === "reference:unset") status = "customized";
	else status = stable(value) === stable(resolved.value) ? "default-explicit" : "customized";
	counts[status]++;
	rows.push({
		id: entry.key,
		type: entry.type ?? null,
		group: entry.group,
		label: null,
		description: entry.description ?? null,
		default: resolved.value === undefined ? null : redact(resolved.value, entry.key, false),
		defaultUnset: resolved.source === "reference:unset",
		defaultUnknown: resolved.source === "undeterminable",
		defaultSource: resolved.source,
		enumValues: entry.values ?? null,
		effective: present ? redact(value, entry.key, true) : null,
		configured: present,
		status,
		localOnly: false,
		fingerprint: fingerprint(entry),
	});
}

// Local keys the reference does not describe, e.g. [[keys.command]] custom
// commands or plugin-specific tables. They are kept so nothing silently
// disappears from the viewer.
const extras = [];
for (const [path, value] of local) {
	if (referenceKeys.has(path)) continue;
	let underReference = false;
	for (const key of referenceKeys) {
		if (path.startsWith(`${key}.`)) {
			underReference = true;
			break;
		}
	}
	if (underReference) continue;
	extras.push({
		id: path,
		type: "local-only",
		group: "Local extras",
		label: null,
		description: "官方参考中不存在的本地键，可能来自插件或自定义命令。",
		default: null,
		defaultUnset: false,
		defaultUnknown: true,
		defaultSource: "no-reference",
		enumValues: null,
		effective: redact(value, path, true),
		configured: true,
		status: "customized",
		localOnly: true,
		fingerprint: null,
	});
}

const all = [...rows, ...extras];
const out = {
	tool: "herdr",
	version,
	generatedAt: new Date().toISOString(),
	configPath,
	referenceSource,
	counts: {
		total: all.length,
		reference: rows.length,
		unset: counts.unset,
		defaultExplicit: counts["default-explicit"],
		customized: counts.customized,
		unknown: counts.unknown,
		localOnly: extras.length,
	},
	settings: all,
};

const outPath = process.argv[2] ?? join(cacheDir, "settings.json");
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(out, null, 2));
console.log(
	`wrote ${outPath}: version=${version} total=${out.counts.total} reference=${out.counts.reference} unset=${out.counts.unset} defaultExplicit=${out.counts.defaultExplicit} customized=${out.counts.customized} unknown=${out.counts.unknown} localOnly=${out.counts.localOnly}`,
);
