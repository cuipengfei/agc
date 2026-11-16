import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Resolve the installed OMP source root (holds config/all-settings.ts).
// Override with OMP_SRC when the global install lives elsewhere.
function resolveOmpSrc() {
	const candidates = [
		process.env.OMP_SRC,
		"/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src",
	].filter(Boolean);
	for (const c of candidates) {
		if (existsSync(join(c, "config/all-settings.ts"))) return c;
	}
	throw new Error(
		"Cannot locate OMP source. Set OMP_SRC to <global>/node_modules/@oh-my-pi/pi-coding-agent/src",
	);
}

const SRC = resolveOmpSrc();
const { orderedSettings } = await import(join(SRC, "config/all-settings.ts"));
const { settingValuesEqual } = await import(join(SRC, "config/registry.ts"));
const { Settings } = await import(join(SRC, "config/settings.ts"));

const agentDir = process.env.OMP_AGENT_DIR ?? "/home/cpf/.omp/agent";
const cwd = process.env.OMP_PROBE_CWD ?? "/tmp";
const settings = await Settings.loadReadOnly({ agentDir, cwd });

// Read OMP version from the package.json beside the source root.
let version = "unknown";
try {
	const pkg = await import(join(SRC, "../package.json"), { with: { type: "json" } });
	version = pkg.default?.version ?? pkg.version ?? "unknown";
} catch {}

// A key's explanation must be regenerated when anything the explanation
// depends on changes. The fingerprint covers the whole descriptor, including
// validate/normalize source — a normalize edit alone flips the hash.
// Limitation: behavior living in consuming code (not the descriptor) cannot
// be seen here; report-gaps flags descriptor-unchanged keys on version bumps.
function fingerprint(setting) {
	const def = setting.definition;
	const shape = {
		id: setting.id,
		type: setting.type,
		default: setting.default ?? null,
		enumValues: setting.enumValues ?? null,
		credential: setting.isCredential,
		ui: setting.ui
			? {
					tab: setting.ui.tab ?? null,
					group: setting.ui.group ?? null,
					label: setting.ui.label ?? null,
					description: setting.ui.description ?? null,
				}
			: null,
		pathScoped: def.pathScoped ?? null,
		items: def.items ?? null,
		normalize: def.normalize ? String(def.normalize) : null,
		validate: def.validate ? String(def.validate) : null,
	};
	return createHash("sha256").update(JSON.stringify(shape)).digest("hex").slice(0, 16);
}

function isRemoteUrl(value) {
	return (
		typeof value === "string" &&
		/^https?:\/\//i.test(value) &&
		!/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(value)
	);
}

function looksLikeSecret(value) {
	if (typeof value !== "string" || value.length < 20) return false;
	return (
 		/^(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|hf_[A-Za-z0-9]{16,})$/.test(value)
	);
}

// 只处理已配置的值：默认值是源码常量（公网 URL 等非机密保留），用户配置里的
// 嵌套远程 URL 与未标记 isCredential 的密钥形态字面值才是盲区。空串、localhost、
// 无凭据结构原样保留，只替换敏感叶子。
function redactLeaves(value) {
	if (typeof value === "string") {
		if (value.length === 0) return value;
		if (isRemoteUrl(value) || looksLikeSecret(value)) return "<redacted>";
		return value;
	}
	if (Array.isArray(value)) return value.map(redactLeaves);
	if (value && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactLeaves(v)]));
	}
	return value;
}

function redact(setting, value, configured = false) {
	if (setting.isCredential) {
		if (value == null) return value;
		if (typeof value === "string" && value.length === 0) return value;
		return "<redacted>";
	}
	if (!configured || value == null) return value;
	return redactLeaves(value);
}

const rows = [];
let effectiveDefault = 0;
for (const setting of orderedSettings()) {
	const def = setting.default;
	const effective = setting.get(settings);
	const isDefault = settingValuesEqual(effective, def);
	const configured = settings.isConfigured(setting);
	if (isDefault) effectiveDefault++;
	rows.push({
		id: setting.id,
		type: setting.type,
		group: setting.ui?.group ?? null,
		label: setting.ui?.label ?? null,
		description: setting.ui?.description ?? null,
		items: setting.definition.items ?? null,
		normalize: setting.definition.normalize ? String(setting.definition.normalize) : null,
		validate: setting.definition.validate ? String(setting.definition.validate) : null,
		default: redact(setting, def) ?? null,
		enumValues: setting.enumValues ?? null,
		credential: setting.isCredential,
		effective: redact(setting, effective, configured) ?? null,
		configured,
		isDefault,
		// unset = never set; default-explicit = set to the default; customized = differs
		status: isDefault ? (configured ? "default-explicit" : "unset") : "customized",
		fingerprint: fingerprint(setting),
	});
}

const out = {
	version,
	generatedAt: new Date().toISOString(),
	agentDir,
	counts: {
		total: rows.length,
		effectiveDefault,
		customized: rows.length - effectiveDefault,
		credentials: rows.filter((r) => r.credential).length,
	},
	settings: rows,
};

const outPath = process.argv[2] ?? join(import.meta.dir, "../cache/settings.json");
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(out, null, 2));
console.log(
	`wrote ${outPath}: version=${version} total=${out.counts.total} onDefault=${out.counts.effectiveDefault} customized=${out.counts.customized} credentials=${out.counts.credentials}`,
);
