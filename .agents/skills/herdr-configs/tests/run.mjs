// Deterministic tests for herdr-configs scripts. No real herdr binary, no real
// user config, no network: a stub `herdr` on PATH serves --version and
// --default-config from fixtures; the reference JSON and config.toml are
// fixtures too. Run: bun .agents/skills/herdr-configs/tests/run.mjs
import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = join(import.meta.dir, "..");
const fx = join(root, "tests", "fixtures");
const BUN = process.execPath; // the bun binary running this test
const tmp = mkdtempSync(join(tmpdir(), "herdr-configs-test-"));
let passed = 0;

function ok(name) {
  passed++;
  console.log(`ok ${passed} - ${name}`);
}

function runDump(outName = "settings.json") {
  const binDir = join(tmp, "bin");
  mkdirSync(binDir, { recursive: true });
  const stub = join(binDir, "herdr");
  writeFileSync(
    stub,
    `#!/bin/sh\ncase "$1" in\n  --version) echo "herdr 0.9.5" ;;\n  --default-config) cat "${fx}/default-config.txt" ;;\nesac\n`,
  );
  chmodSync(stub, 0o755);
  const env = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
    HERDR_CONFIG_PATH: join(fx, "config.toml"),
    HERDR_REFERENCE_JSON: join(fx, "config-reference.json"),
  };
  execFileSync(BUN, [join(root, "scripts", "dump-settings.mjs"), join(tmp, outName)], { env, stdio: "pipe" });
  return JSON.parse(readFileSync(join(tmp, outName), "utf8"));
}

// 1. dump-settings: end-to-end against stub herdr + fixtures.
{
  const out = runDump();
  assert.equal(out.version, "0.9.5");
  assert.equal(out.counts.reference, 5);
  assert.equal(out.counts.localOnly, 1);
  assert.equal(out.counts.total, 6);
  const byId = new Map(out.settings.map((s) => [s.id, s]));
  // reference:unset default -> configured value reads customized
  assert.equal(byId.get("onboarding").status, "customized");
  assert.equal(byId.get("onboarding").defaultSource, "reference:unset");
  // template assignment wins over reference default -> default-explicit
  const cols = byId.get("server.headless_cols");
  assert.equal(cols.status, "default-explicit");
  assert.equal(cols.defaultSource, "default-config");
  assert.equal(cols.default, 120);
  // prose default -> undeterminable; configured value reads unknown
  const cursor = byId.get("ui.host_cursor");
  assert.equal(cursor.status, "unknown");
  assert.equal(cursor.defaultSource, "undeterminable");
  assert.equal(cursor.defaultUnknown, true);
  // plain JSON default, not configured -> unset
  const sort = byId.get("ui.agent_panel_sort");
  assert.equal(sort.status, "unset");
  assert.equal(sort.default, "spaces");
  assert.equal(sort.defaultSource, "reference");
  assert.equal(byId.get("terminal.shell_mode").status, "unset");
  // local extra: kept, localOnly, no fingerprint, secrets and remote URL redacted
  const extra = byId.get("keys.command");
  assert.equal(extra.localOnly, true);
  assert.equal(extra.fingerprint, null);
  assert.equal(extra.status, "customized");
  assert.equal(extra.effective[0].command, "<redacted>");
  assert.equal(extra.effective[0].repo_url, "<redacted>");
  // reference rows carry fingerprints, extras do not
  assert.match(byId.get("onboarding").fingerprint, /^[0-9a-f]{16}$/);
  ok("dump-settings: statuses, defaultSource, extras, redaction (stub herdr + fixtures)");
}
// 2. report-gaps: added / removed / fingerprint / status / version-bump review.
{
  const fresh = runDump("settings-for-diff.json");
  const prevSettings = fresh.settings
    .filter((s) => s.id !== "terminal.shell_mode")
    .map((s) => (s.id === "onboarding" ? { ...s, status: "unset" } : s));
  prevSettings.push({ ...fresh.settings[0], id: "ui.old_setting", status: "unset" });
  const prev = { ...fresh, version: "0.9.4", settings: prevSettings };
  const prevPath = join(tmp, "prev.json");
  writeFileSync(prevPath, JSON.stringify(prev));
  const text = execFileSync(
    BUN,
    [join(root, "scripts", "report-gaps.mjs"), "--old", prevPath, join(tmp, "settings-for-diff.json")],
    { stdio: "pipe" },
  ).toString();
  const report = JSON.parse(text);
  assert.equal(report.versionBumped, true);
  assert.deepEqual(report.added, ["terminal.shell_mode"]);
  assert.deepEqual(report.removed, ["ui.old_setting"]);
  assert.deepEqual(report.fingerprintChanged, []);
  assert.deepEqual(report.statusChanged, ["onboarding"]);
  assert.ok(report.needsReviewOnVersionBump.includes("onboarding"));
  ok("report-gaps: removed/statusChanged/versionBumped review list");
}

// 3. render-html: happy path renders; a translation gap aborts before writing.
{
  const htmlPath = join(tmp, "out.html");
  execFileSync(BUN, [join(root, "scripts", "render-html.mjs"), join(tmp, "settings.json"), htmlPath], {
    stdio: "pipe",
  });
  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /Herdr 0\.9\.5 配置总览/);
  assert.match(html, /keys\.command/);

  const broken = JSON.parse(readFileSync(join(tmp, "settings.json"), "utf8"));
  broken.settings[0] = { ...broken.settings[0], id: "totally.unknown_key" };
  const brokenPath = join(tmp, "broken.json");
  writeFileSync(brokenPath, JSON.stringify(broken));
  let failed = false;
  try {
    execFileSync(BUN, [join(root, "scripts", "render-html.mjs"), brokenPath, join(tmp, "broken.html")], {
      stdio: "pipe",
    });
  } catch {
    failed = true;
  }
  assert.ok(failed, "render-html must abort on translation gap");
  assert.equal(existsSync(join(tmp, "broken.html")), false);
  ok("render-html: renders snapshot, aborts on translation gap without writing");
}

console.log(`\n${passed} herdr-configs tests passed (workdir ${tmp})`);
