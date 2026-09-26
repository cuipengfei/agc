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

function redact(setting, value, configured = false) {
	if (!setting.isCredential && !(configured && isRemoteUrl(value))) return value;
	if (value == null) return value;
	if (typeof value === "string" && value.length === 0) return value;
	return "<redacted>";
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
