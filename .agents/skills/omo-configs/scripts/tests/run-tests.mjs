// Isolated, offline tests for omo-configs. Two layers, neither needs an
// OMO/Senpi/omo-ai install:
//   1. unit tests for omo-evidence bookkeeping (reader-injected)
//   2. real-CLI behavior tests: spawn dump-settings.mjs as a subprocess against
//      a fake SENPI_SRC fixture (SettingsManager + Settings d.ts + sibling
//      omo-ai package.json) and a credential-free temp OMO_HOME, then assert
//      on the produced JSON and stderr. The CLI core logic is exercised
//      end-to-end; nothing is reimplemented here.
// Runs anywhere — bun or node:
//   bun .agents/skills/omo-configs/scripts/tests/run-tests.mjs
//   node .agents/skills/omo-configs/scripts/tests/run-tests.mjs
import { deepStrictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir, availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVIDENCE_VERSION,
  RE_VERIFIED_5_1_72,
  RESIDENCY_MAX_CHILDREN_DEFAULT,
  resolveGlobalConcurrency,
  detectOmoAiVersion,
  evidenceFor,
  evidenceWarning,
} from "../omo-evidence.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dumpPath = join(here, "../dump-settings.mjs");

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ---------- layer 1: evidence bookkeeping units ----------

// --- version detection (offline: injected reader) ---
const pkg = (version) => () => JSON.stringify({ name: "omo-ai", version });

test("detectOmoAiVersion reads first resolvable candidate", () => {
  assertEqual(
    detectOmoAiVersion(["/a", "/b"], (p) => {
      if (p === "/b/package.json") return pkg("5.1.72")();
      throw new Error("ENOENT");
    }),
    "5.1.72",
    "should skip unreadable candidate"
  );
});

test("detectOmoAiVersion returns null when no candidate resolves", () => {
  assertEqual(
    detectOmoAiVersion(["/nope"], () => {
      throw new Error("ENOENT");
    }),
    null,
    "undetectable install must yield null, not throw"
  );
});

test("detectOmoAiVersion ignores package.json without a string version", () => {
  assertEqual(
    detectOmoAiVersion(["/bad", "/good"], (p) => {
      if (p === "/bad/package.json") return "{}";
      return pkg("5.0.1")();
    }),
    "5.0.1",
    "malformed package.json must be skipped"
  );
});

// --- version warning matrix ---
test("evidenceWarning identifies newer evidence on an older install", () => {
  const warning = evidenceWarning(EVIDENCE_VERSION);
  assert(warning && warning.includes("5.1.72"), "newer evidence must be flagged");
});

test("evidenceWarning flags divergence with both versions and verified keys", () => {
  const w = evidenceWarning("5.1.72");
  assert(w !== null, "divergence must warn");
  assert(w.includes("5.1.72") && w.includes(EVIDENCE_VERSION), "must name both versions");
  for (const k of RE_VERIFIED_5_1_72) assert(w.includes(k), `must list verified key ${k}`);
  assert(w.includes("旧证据"), "must mark unverified defaults as stale evidence");
});

test("evidenceWarning flags undetectable install instead of staying silent", () => {
  const w = evidenceWarning(null);
  assert(w !== null, "undetectable version must warn");
  assert(w.includes("无法检测"), "must say the version could not be detected");
});

// --- corrected defaults (5.1.72 evidence) ---
test("task.global_concurrency: schema default 8 is distinct from runtime formula", () => {
  assertEqual(resolveGlobalConcurrency(2), 8, "max(8,2*2)");
  assertEqual(resolveGlobalConcurrency(4), 8, "max(8,2*4)");
  assertEqual(resolveGlobalConcurrency(8), 16, "max(8,2*8)");
  // schema default and formula result must differ somewhere, else the
  // distinction this row exists to express has collapsed
  assert(resolveGlobalConcurrency(8) !== 8, "formula must not equal schema default for all PAR");
});

test("task.residency_max_children: schema default is 'unlimited'", () => {
  assertEqual(RESIDENCY_MAX_CHILDREN_DEFAULT, "unlimited", "5.1.72 schema default");
});

test("evidence tags distinguish re-verified from stale rows", () => {
  assertEqual(evidenceFor("task.global_concurrency"), "5.1.72", "re-verified tag");
  assertEqual(evidenceFor("task.residency_max_children"), "5.1.72", "re-verified tag");
  assertEqual(evidenceFor("memory.enabled"), EVIDENCE_VERSION, "original evidence version");
});

// ---------- layer 2: real-CLI behavior tests against a fake SENPI_SRC ----------

// Fixture SettingsManager: a Proxy synthesizes every getter, so the CLI's
// callGetter path is exercised exactly as with the real engine. Current vs
// defaults instances return different values where the scenario needs it;
// raw scopes are controlled objects, so unset/default-explicit/customized
// classification is deterministic.
const FIXTURE_MANAGER = `const GLOBAL_RAW = { defaultProvider: "fixture-provider", transport: "auto" };
const PROJECT_RAW = { quietStartup: true };
const SHARED = {
  getTransport: "auto",
  getSmoothStreaming: true,
  getPromptCacheGoalBackstopMaxSeconds: 300,
  getPromptCacheKeepAliveSettings: { enabled: false, maxRequestsPerSession: 5, maxCostUsdPerSession: 0.5, marginSeconds: 30 },
  getCodeBlockIndent: "  ",
  getMermaidRenderingMode: "final",
  getImageAutoResize: true,
  getBlockImages: false,
  getMaxHistoricalImages: 20,
  getTodoFirstTurnPlan: "remind",
  getTodoTurnEndBackstop: true,
};
const CURRENT = { ...SHARED, getDefaultProvider: "fixture-provider", getQuietStartup: true };
const DEFAULTS = { ...SHARED, getDefaultProvider: null, getQuietStartup: false };
function mk(values) {
  const target = {
    getGlobalSettings: () => GLOBAL_RAW,
    getProjectSettings: () => PROJECT_RAW,
    getSelectedSettingsSources: () => [],
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop !== "string") return undefined;
      const v = values[prop];
      return () => (v === undefined ? null : v);
    },
  });
}
export class SettingsManager {
  static create() { return mk(CURRENT); }
  static inMemory() { return mk(DEFAULTS); }
}
// The fixture omo.jsonc is pure JSON (no comments), so JSON.parse matches
// what the engine's comment-stripping parser would return for it.
export function parseSettingsJson(text) { return JSON.parse(text); }
`;

// Deliberately INCOMPLETE Settings interface: most table keys are absent and
// one fixture-only key is present, so schema parity must NOT claim coverage.
const FIXTURE_DTS = `export interface Settings {
    defaultProvider?: string;
    defaultModel?: string;
    transport?: string;
    fixtureOnlyKey?: string;
}
`;

const root = mkdtempSync(join(tmpdir(), "omo-configs-test-"));
const SRC = join(root, "lib/node_modules/@code-yeongyu/senpi/dist");
const SIBLING_OMO_AI = join(root, "lib/node_modules/omo-ai");
const OMO_HOME = join(root, "omo-home");
try {
  mkdirSync(join(SRC, "core"), { recursive: true });
  mkdirSync(SIBLING_OMO_AI, { recursive: true });
  mkdirSync(OMO_HOME, { recursive: true });
  writeFileSync(join(SRC, "core/settings-manager.js"), FIXTURE_MANAGER);
  writeFileSync(join(SRC, "core/settings-manager.d.ts"), FIXTURE_DTS);
  writeFileSync(
    join(OMO_HOME, "omo.jsonc"),
    JSON.stringify({ "[native]": { model_profile: "fast", task: { default_concurrency: 3 } } })
  );
  writeFileSync(join(SIBLING_OMO_AI, "package.json"), JSON.stringify({ name: "omo-ai", version: "5.1.72" }));

  // Run the real dump-settings CLI against the fixture. Returns parsed JSON
  // plus captured stdout/stderr and the exit status.
  function runDump(name, { omoAiDir, siblingVersion } = {}) {
    writeFileSync(
      join(SIBLING_OMO_AI, "package.json"),
      JSON.stringify({ name: "omo-ai", version: siblingVersion ?? "5.1.72" })
    );
    const out = join(root, `${name}.json`);
    const env = {
      ...process.env,
      HOME: root,
      SENPI_SRC: SRC,
      OMO_HOME,
      OMO_AGENT_DIR: join(root, "agent-dir"),
      OMO_PROBE_CWD: root,
    };
    if (omoAiDir) env.OMO_AI_DIR = omoAiDir;
    else delete env.OMO_AI_DIR;
    const res = spawnSync(process.execPath, [dumpPath, out], { env, encoding: "utf8" });
    return { res, out, json: JSON.parse(readFileSync(out, "utf8")) };
  }
  const byKey = (json, key) => {
    const row = [...json.senpi.fields, ...json.native.fields].find((f) => f.key === key);
    assert(row, `row ${key} missing from dump output`);
    return row;
  };

  // --- scenario A: sibling install detected as 5.1.72 → divergence warning ---
  const A = runDump("a-sibling-5_1_72");
  test("A: CLI exits 0 and writes the product", () => {
    assertEqual(A.res.status, 0, `dump failed: ${A.res.stderr}`);
    assert(A.json.counts.total > 0, "product must contain rows");
  });
  test("A: current omo-ai version comes from install metadata, with evidence source", () => {
    assertEqual(A.json.evidence.omoAiVersion, "5.1.72", "sibling package.json version");
    assertEqual(A.json.evidence.evidenceVersion, EVIDENCE_VERSION, "evidence provenance recorded");
    assert(A.json.evidence.staleWarning !== null, "5.1.72 vs 5.0.1 evidence must warn");
    assert(A.res.stderr.includes("EVIDENCE WARNING"), "warning must be prominent on stderr");
  });
  test("A: re-verified rows carry 5.1.72 evidence; others carry stale 5.0.1 evidence", () => {
    for (const k of RE_VERIFIED_5_1_72) {
      assertEqual(byKey(A.json, k).evidence, "5.1.72", `${k} evidence tag`);
    }
    assertEqual(byKey(A.json, "memory.enabled").evidence, EVIDENCE_VERSION, "original evidence version");
  });
  test("A: corrected 5.1.72 defaults surface with loading behavior", () => {
    const par = availableParallelism();
    const gc = byKey(A.json, "task.global_concurrency");
    assertEqual(gc.default, 8, "schema default 8");
    assertEqual(gc.value, Math.max(8, 2 * par), "effective formula max(8,2×PAR)");
    assertEqual(gc.state, "unset", "unset in fixture omo.jsonc");
    const rm = byKey(A.json, "task.residency_max_children");
    assertEqual(rm.default, "unlimited", "5.1.72 schema default");
    assertEqual(rm.value, "unlimited", "effective when unset");
  });
  test("A: [native] values load from omo.jsonc with three-state classification", () => {
    const mp = byKey(A.json, "model_profile");
    assertEqual(mp.value, "fast", "value loaded from [native]");
    assertEqual(mp.state, "customized", "explicit value is customized");
    const dc = byKey(A.json, "task.default_concurrency");
    assertEqual(dc.value, 3, "task block value loaded");
    assertEqual(dc.state, "customized", "3 != schema default 5");
    const dag = byKey(A.json, "task.dag.max_nodes_per_run");
    assertEqual(dag.state, "schema-only", "dag block absent → inactive");
    assertEqual(dag.value, null, "no effective value without the block");
  });
  test("A: senpi getter rows classify via raw presence + default comparison", () => {
    assertEqual(byKey(A.json, "defaultProvider").state, "customized", "value differs from default");
    assertEqual(byKey(A.json, "transport").state, "default-explicit", "equals default, key present");
    assertEqual(byKey(A.json, "quietStartup").state, "customized", "project raw true vs default false");
    assertEqual(byKey(A.json, "smoothStreaming").state, "unset", "key absent, runs at default");
    assertEqual(byKey(A.json, "markdown.codeBlockIndent").state, "unset", "nested raw key absent");
    assertEqual(byKey(A.json, "promptCache.safetyBufferSeconds").default, 30, "schema-declared default");
    assertEqual(byKey(A.json, "promptCache.cacheAwareTimeouts").state, "schema-only", "no engine getter");
  });
  test("A: manifest coverage — 73 unique native rows, all labeled and evidenced", () => {
    const rows = A.json.nativeNested.fields;
    assertEqual(rows.length, 73, "native schemaDefault row count");
    const keys = rows.map((r) => r.key);
    assertEqual(new Set(keys).size, keys.length, "duplicate manifest keys");
    for (const r of rows) {
      assert(r.label && String(r.label).trim() !== "", `${r.key} missing label`);
      assert(r.desc && String(r.desc).trim() !== "", `${r.key} missing desc`);
      assert(typeof r.evidence === "string" && r.evidence.length > 0, `${r.key} missing evidence`);
    }
  });
  test("A: incomplete schema must NOT be reported as full coverage", () => {
    deepStrictEqual(A.json.schemaParity.missingFromTable, ["fixtureOnlyKey"], "schema-only key surfaced");
    assert(A.json.schemaParity.extraInTable.length > 0, "table keys absent from schema must be listed");
    assert(A.json.counts.schemaExtra > 0, "schemaExtra count must be non-zero");
    assert(A.res.stderr.includes("absent from the Settings interface"), "extra warning on stderr");
    assert(A.res.stderr.includes("fixtureOnlyKey"), "missing key named on stderr");
  });

  // --- scenario B: OMO_AI_DIR override wins and newer evidence is flagged ---
  const overrideDir = join(root, "override-omo-ai");
  mkdirSync(overrideDir, { recursive: true });
  writeFileSync(join(overrideDir, "package.json"), JSON.stringify({ name: "omo-ai", version: "5.0.1" }));
  const B = runDump("b-override-5_0_1", { omoAiDir: overrideDir });
  test("B: explicit OMO_AI_DIR overrides the sibling candidate", () => {
    assertEqual(B.res.status, 0, `dump failed: ${B.res.stderr}`);
    assertEqual(B.json.evidence.omoAiVersion, "5.0.1", "override dir wins over sibling 5.1.72");
  });
  test("B: older install warns about newer evidence", () => {
    assert(B.json.evidence.staleWarning?.includes("5.1.72"), "newer evidence must be flagged");
    assert(B.res.stderr.includes("EVIDENCE WARNING"), "warning on stderr");
  });

  // --- scenario C: a different installed version must not be passed off as verified ---
  const C = runDump("c-sibling-6_0_0", { siblingVersion: "6.0.0" });
  test("C: version divergence names both versions and never upgrades evidence claims", () => {
    assertEqual(C.res.status, 0, `dump failed: ${C.res.stderr}`);
    assertEqual(C.json.evidence.omoAiVersion, "6.0.0", "detected install version");
    const w = C.json.evidence.staleWarning;
    assert(w !== null && w.includes("6.0.0") && w.includes(EVIDENCE_VERSION), "warning names both versions");
    for (const r of C.json.nativeNested.fields) {
      assert(r.evidence !== "6.0.0", `row ${r.key} must not claim 6.0.0 evidence it never had`);
    }
    for (const k of RE_VERIFIED_5_1_72) {
      assertEqual(byKey(C.json, k).evidence, "5.1.72", `${k} stays tagged as 5.1.72-verified, not 6.0.0`);
    }
    assertEqual(byKey(C.json, "memory.enabled").evidence, EVIDENCE_VERSION, "original evidence version");
  });
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log(`omo-configs tests: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.error(`FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
