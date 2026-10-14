import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEvidence, review } from "./review-evidence.mjs";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

function fixtureEvidence() {
  const a = randomBytes(32);
  const b = randomBytes(32);
  return {
    repository: "anomalyco/opencode",
    version: "2.0.28",
    sources: {
      "a.ts": { sha256: sha(a) },
      "docs/b.md": { sha256: sha(b) },
      "gone.ts": { sha256: sha(randomBytes(8)) },
    },
    keys: {
      keyA: ["a.ts"],
      keyAB: ["a.ts", "docs/b.md"],
      keyGone: ["gone.ts"],
      keyClean: ["docs/b.md"],
    },
    _bytes: { "a.ts": a, "docs/b.md": b },
  };
}

describe("review 核心对比", () => {
  test("changed/missing/unchanged 与 affectedKeys/unchangedKeys 正确且排序确定", () => {
    const ev = fixtureEvidence();
    const fetchBytes = (path) => {
      if (path === "gone.ts") return null;
      if (path === "docs/b.md") return Buffer.from("tampered"); // 内容不符 → changed
      return ev._bytes[path];
    };
    const r1 = review(ev, fetchBytes, ev.version);
    const r2 = review(ev, fetchBytes, ev.version);

    expect(r1.unchangedSources).toEqual(["a.ts"]);
    expect(r1.changedSources.map((c) => c.path)).toEqual(["docs/b.md"]);
    expect(r1.changedSources[0].actual).toMatch(/^[0-9a-f]{64}$/);
    expect(r1.missingSources).toEqual(["gone.ts"]);
    expect(r1.affectedKeys).toEqual(["keyAB", "keyClean", "keyGone"]);
    expect(r1.unchangedKeys).toEqual(["keyA"]);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2)); // 确定性
  });

  test("取字节抛出非 404 错误时向上传播（网络/鉴权硬错误）", () => {
    const ev = fixtureEvidence();
    const fetchBytes = () => {
      throw new Error("gh api 获取 x 失败（非 404，按硬错误终止）：auth required");
    };
    expect(() => review(ev, fetchBytes, ev.version)).toThrow(/auth required/);
  });

  test("输出不含配置值", () => {
    const ev = fixtureEvidence();
    const r = review(ev, (path) => (path === "docs/b.md" ? randomBytes(16) : (ev._bytes[path] ?? null)), ev.version);
    const out = JSON.stringify(r);
    expect(Object.keys(r.changedSources[0])).toEqual(["path", "expected", "actual"]);
    expect(Object.keys(r)).toEqual([
      "repository",
      "version",
      "changedSources",
      "missingSources",
      "unchangedSources",
      "affectedKeys",
      "unchangedKeys",
    ]);
  });
});

describe("--source-dir 离线模式", () => {
  let dir;
  let ev;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "evidence-review-"));
    mkdirSync(join(dir, "docs"), { recursive: true });
    ev = fixtureEvidence();
    writeFileSync(join(dir, "a.ts"), ev._bytes["a.ts"]);
    writeFileSync(join(dir, "docs", "b.md"), Buffer.from("tampered")); // changed
    // gone.ts 不落盘 → missing
    writeFileSync(join(dir, "evidence.json"), JSON.stringify(ev));
    writeFileSync(join(dir, "defaults.json"), "{}");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test("从本地目录读取并检出变化", async () => {
    const { spawnSync } = await import("node:child_process");
    const out = join(dir, "out.json");
    const proc = spawnSync(
      process.execPath,
      [
        join(import.meta.dir, "review-evidence.mjs"),
        "--version",
        "2.0.28",
        "--evidence",
        join(dir, "evidence.json"),
        "--defaults",
        join(dir, "defaults.json"),
        "--source-dir",
        dir,
        "--out",
        out,
      ],
      { encoding: "utf8", env: { ...process.env, BUN_YOGA: "1" } },
    );
    expect([proc.status, proc.stderr]).toEqual([0, ""]);
    const result = JSON.parse(readFileSync(out, "utf8"));
    expect(result.changedSources.map((c) => c.path)).toEqual(["docs/b.md"]);
    expect(result.missingSources).toEqual(["gone.ts"]);
    expect(result.unchangedSources).toEqual(["a.ts"]);
    expect(result.affectedKeys).toEqual(["keyAB", "keyClean", "keyGone"]);
  });
});

describe("loadEvidence 校验", () => {
  let dir;
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "evidence-load-"))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const write = (evidence) => {
    const p = join(dir, "evidence.json");
    writeFileSync(p, JSON.stringify(evidence));
    return p;
  };

  test("拒绝非 64 位十六进制 sha256", () => {
    const p = write({ repository: "r", version: "1", sources: { "a.ts": { sha256: "deadbeef" } }, keys: {} });
    expect(() => loadEvidence(p)).toThrow(/64 位十六进制/);
  });

  test("拒绝空 source 引用与悬空引用", () => {
    const p = write({
      repository: "r",
      version: "1",
      sources: { "a.ts": { sha256: sha(randomBytes(4)) } },
      keys: { k: [] },
    });
    expect(() => loadEvidence(p)).toThrow(/至少一个 source/);
    const p2 = write({
      repository: "r",
      version: "1",
      sources: { "a.ts": { sha256: sha(randomBytes(4)) } },
      keys: { k: ["nope.ts"] },
    });
    expect(() => loadEvidence(p2)).toThrow(/不存在的 source/);
  });

  test("拒绝 defaults 键缺少 source 引用", () => {
    const p = write({ repository: "r", version: "1", sources: {}, keys: {} });
    expect(() => loadEvidence(p)).toThrow(/defaults 键缺少 source 引用/);
  });

  test("真实 evidence.json 通过全部结构校验", () => {
    const ev = loadEvidence();
    expect(ev.version).toBe("2.0.29");
    expect(Object.keys(ev.keys).length).toBeGreaterThanOrEqual(44);
  });
});
