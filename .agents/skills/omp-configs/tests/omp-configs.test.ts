import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SKILL_ROOT = join(import.meta.dir, "..");
const SCRIPTS = join(SKILL_ROOT, "scripts");
const FIXTURES = join(import.meta.dir, "fixtures");
const MOCK_SRC = join(FIXTURES, "mock-src");
const TR_FULL = join(FIXTURES, "translations.json");

let tmp: string;

beforeAll(() => {
	tmp = mkdtempSync(join(tmpdir(), "omp-configs-test-"));
});

afterAll(() => {
	rmSync(tmp, { recursive: true, force: true });
});

function makeAgent(values: Record<string, unknown>): string {
	const dir = mkdtempSync(join(tmp, "agent-"));
	writeFileSync(join(dir, "values.json"), JSON.stringify(values));
	return dir;
}

function runScript(script: string, args: string[], env: Record<string, string>) {
	return Bun.spawnSync(["bun", join(SCRIPTS, script), ...args], {
		env: { ...process.env, OMP_SRC: MOCK_SRC, ...env },
		cwd: SCRIPTS,
	});
}

function dump(agentDir: string, outPath: string, src: string = MOCK_SRC) {
	const res = Bun.spawnSync(["bun", join(SCRIPTS, "dump-settings.mjs"), outPath], {
		env: { ...process.env, OMP_SRC: src, OMP_AGENT_DIR: agentDir, OMP_PROBE_CWD: tmp },
		cwd: SCRIPTS,
	});
	if (res.exitCode !== 0) {
		throw new Error(`dump-settings failed: ${res.stderr.toString()}`);
	}
	return JSON.parse(readFileSync(outPath, "utf8"));
}

function rowOf(data: { settings: { id: string }[] }, id: string) {
	const row = data.settings.find((s) => s.id === id);
	if (!row) throw new Error(`row ${id} missing`);
	return row as Record<string, unknown>;
}

describe("dump-settings", () => {
	test("exports items element rules and keeps default/enum/label metadata", () => {
		const out = join(tmp, "meta.json");
		const data = dump(makeAgent({}), out);
		expect(data.version).toBe("0.0.0-mock");
		expect(rowOf(data, "app.fruits").items).toEqual({
			values: ["apple", "pear"],
			label: "Fruit",
		});
		expect(rowOf(data, "app.title").default).toBe("Demo App");
		expect(rowOf(data, "app.title").label).toBe("App Title");
		expect(rowOf(data, "app.mode").enumValues).toEqual(["safe", "fast"]);
		expect(rowOf(data, "app.title").items).toBeNull();
		expect(rowOf(data, "app.title").validate).toContain("bad-title-v1");
		expect(rowOf(data, "app.trim").normalize).toContain("trim()");
		expect(rowOf(data, "app.mode").validate).toBeNull();
		expect(typeof rowOf(data, "app.title").fingerprint).toBe("string");
	});

	test("fingerprint flips when validate source changes, stays put otherwise", () => {
		const srcB = join(tmp, "mock-src-validate-b");
		cpSync(MOCK_SRC, srcB, { recursive: true });
		const regPath = join(srcB, "config/all-settings.ts");
		const srcText = readFileSync(regPath, "utf8");
		if (!srcText.includes("bad-title-v1")) throw new Error("fixture marker missing");
		writeFileSync(regPath, srcText.replace("bad-title-v1", "bad-title-v2"));

		const a = dump(makeAgent({}), join(tmp, "fp-a.json"));
		const b = dump(makeAgent({}), join(tmp, "fp-b.json"), srcB);
		expect(rowOf(b, "app.title").fingerprint).not.toBe(rowOf(a, "app.title").fingerprint);
		expect(rowOf(b, "app.mode").fingerprint).toBe(rowOf(a, "app.mode").fingerprint);
	});

	test("redacts nested remote URLs and unmarked secret literals, preserves the rest", () => {
		const agent = makeAgent({
			"app.profile": {
				baseUrl: "https://relay.internal.example.com/v1",
				local: "http://localhost:8080",
				helper: "plain text",
				revision: "0123456789abcdef0123456789abcdef01234567",
				empty: "",
				token: "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz",
				deep: [{ url: "https://nested.example.com" }],
			},
			"app.endpoint": "https://user-private.relay.example.com",
			"app.apiKey": "supersecretvalue123",
		});
		const data = dump(agent, join(tmp, "redact.json"));

		const profile = rowOf(data, "app.profile").effective as Record<string, unknown>;
		expect(profile.baseUrl).toBe("<redacted>");
		expect(profile.local).toBe("http://localhost:8080");
		expect(profile.helper).toBe("plain text");
		expect(profile.revision).toBe("0123456789abcdef0123456789abcdef01234567");
		expect(profile.empty).toBe("");
		expect(profile.token).toBe("<redacted>");
		expect((profile.deep as { url: string }[])[0].url).toBe("<redacted>");

		expect(rowOf(data, "app.endpoint").effective).toBe("<redacted>");
		// 默认值是源码常量里的公网 URL，不脱敏
		expect(rowOf(data, "app.endpoint").default).toBe("https://api.example.com");
		expect(rowOf(data, "app.apiKey").effective).toBe("<redacted>");
	});
});

describe("report-gaps", () => {
	let fresh: string;
	beforeAll(() => { fresh = join(tmp, "fresh.json"); });

	test("fails when --old points at a missing file", () => {
		dump(makeAgent({}), fresh);
		const res = runScript(
			"report-gaps.mjs",
			["--old", join(tmp, "does-not-exist.json"), fresh],
			{},
		);
		expect(res.exitCode).not.toBe(0);
		expect(res.stderr.toString()).toContain("--old");
	});

	test("without --old the version comparison is unknown, not fabricated", () => {
		dump(makeAgent({}), fresh);
		const res = runScript("report-gaps.mjs", [fresh], {});
		expect(res.exitCode).toBe(0);
		const report = JSON.parse(res.stdout.toString());
		expect(report.previousVersion).toBeNull();
		expect(report.versionComparison).toBe("unknown");
		expect(report.versionBumped).toBe(false);
	});

	test("with --old at the same version the comparison is unchanged", () => {
		dump(makeAgent({}), fresh);
		const res = runScript("report-gaps.mjs", ["--old", fresh, fresh], {});
		expect(res.exitCode).toBe(0);
		const report = JSON.parse(res.stdout.toString());
		expect(report.versionComparison).toBe("unchanged");
		expect(report.fingerprintChanged).toEqual([]);
	});

	test("version change identifies existing explanations needing review", () => {
		const snapshot = dump(makeAgent({}), fresh);
		const previous = join(tmp, "previous.json");
		const explanations = join(tmp, "explanations");
		mkdirSync(explanations, { recursive: true });
		writeFileSync(join(explanations, "app.title.md"), "Known behavior");
		writeFileSync(join(explanations, "removed.md"), "Old behavior");
		writeFileSync(previous, JSON.stringify({ ...snapshot, version: "0.0.0-previous" }));
		const res = runScript("report-gaps.mjs", ["--old", previous, "--expl", explanations, fresh], {});
		expect(res.exitCode).toBe(0);
		const report = JSON.parse(res.stdout.toString());
		expect(report.needsReviewOnVersionBump).toEqual(["app.title"]);
		expect(report.counts.needsReviewOnVersionBump).toBe(1);
	});
});

describe("render-html", () => {
	let settingsJson: string;
	beforeAll(() => { settingsJson = join(tmp, "html-src.json"); });

	function render(args: string[]) {
		return runScript("render-html.mjs", args, {});
	}

	test("aborts when a translation is missing, listing the gap", () => {
		dump(makeAgent({}), settingsJson);
		const partialTr = join(tmp, "translations-partial.json");
		writeFileSync(partialTr, JSON.stringify({ "app.title": { label: "标题", desc: "标题" } }));
		const res = render([settingsJson, join(tmp, "x.html"), "--tr", partialTr]);
		expect(res.exitCode).not.toBe(0);
		expect(res.stderr.toString()).toContain("app.mode");
		expect(existsSync(join(tmp, "x.html"))).toBe(false);
	});

	test("escapes </script> injection from settings values and translations", () => {
		const injection = '</script><script>alert(1)</script>';
		const agent = makeAgent({ "app.title": injection });
		dump(agent, settingsJson);
		const trPath = join(tmp, "tr-injection.json");
		writeFileSync(
			trPath,
			JSON.stringify({
				"app.title": { label: "标题", desc: injection },
				"app.mode": { label: "模式", desc: "模式" },
				"app.fruits": { label: "水果", desc: "水果" },
				"app.endpoint": { label: "端点", desc: "端点" },
				"app.profile": { label: "配置", desc: "配置" },
				"app.apiKey": { label: "密钥", desc: "密钥" },
				"app.trim": { label: "裁剪", desc: "裁剪" },
				_groups: { general: "常规", network: "网络" },
			}),
		);
		const outHtml = join(tmp, "injection.html");
		const res = render([settingsJson, outHtml, "--tr", trPath]);
		expect(res.exitCode).toBe(0);
		const html = readFileSync(outHtml, "utf8");
		expect(html).not.toContain("</script><script>alert(1)</script>");
		expect(html).toContain("\\u003c/script>");
	});

	test("HTML embeds the same snapshot as the JSON input", async () => {
		dump(makeAgent({ "app.title": "Snapshot App" }), settingsJson);
		const outHtml = join(tmp, "snapshot.html");
		const res = render([settingsJson, outHtml, "--tr", TR_FULL]);
		expect(res.exitCode).toBe(0);
		const data = JSON.parse(readFileSync(settingsJson, "utf8"));
		const html = readFileSync(outHtml, "utf8");
		let embedded = "";
		await new HTMLRewriter()
			.on("script#data", { text(chunk) { embedded += chunk.text; } })
			.transform(new Response(html)).text();
		expect(JSON.parse(embedded)).toEqual(data);
		expect(data.counts.total).toBe(7);
		expect(rowOf(data, "app.title").effective).toBe("Snapshot App");
	});
});
