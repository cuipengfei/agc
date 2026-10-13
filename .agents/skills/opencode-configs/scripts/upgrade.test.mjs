import { describe, expect, test } from "bun:test";
import { buildRows, validateAssets, diffSnapshots, redact } from "./lib.mjs";

const version = "2.0.28";
const defaults = {
  warming: { known: true, value: false, evidence: "源码默认关闭" },
  "warming.interval": { known: true, value: "4 minutes", evidence: "源码间隔" },
  "enterprise.url": { inert: true, evidence: "源码功能未启用" },
  providers: { behavioral: "内置目录", evidence: "源码目录加载器" },
};
const evidence = {
  repository: "anomalyco/opencode", version,
  sources: { "src/config.ts": { sha256: "a".repeat(64) } },
  keys: Object.fromEntries(Object.keys(defaults).map((key) => [key, ["src/config.ts"]])),
};
const spec = { components: { schemas: { "Config.InfoEncoded": { properties: {
  warming: { anyOf: [{ type: "boolean" }, { type: "object", properties: { interval: { type: "string" } } }] },
  enterprise: { type: "object", properties: { url: { type: "string" } } },
  providers: { type: "object", additionalProperties: true },
} } } } };
const translations = Object.fromEntries(["warming", "warming.interval", "enterprise", "enterprise.url", "providers"].map((key) => [key, { desc: "配置行为说明" }]));
const rows = (info, table = defaults, asset = evidence) => buildRows(spec, [{ type: "document", path: "sample.json", info }], table, translations, asset, version);

describe("严格 URL 脱敏", () => {
  test.each(["https://localhost.example.com/path", "http://127.0.0.1.example.com", "https://localhost@public.example.com", "HTTP://public.example.com/x"])("公网地址必须遮蔽：%s", (value) => expect(redact(value)).toBe("<redacted>"));
  test.each(["http://localhost:3000/x", "http://127.0.0.1:8000/x", "http://[::1]:3000/x"])("本地地址保留：%s", (value) => expect(redact(value)).toBe(value));
  test("嵌入 IPv6 地址与公网地址分别处理", () => {
    expect(redact("本地 http://[::1]:3000/x 公网 https://localhost.example.com/x 说明")).toBe("本地 http://[::1]:3000/x 公网 <redacted> 说明");
  });
  test("本地地址含认证信息也遮蔽", () => expect(redact("http://user:password@localhost:3000")).toBe("<redacted>"));
});

describe("默认资产信任边界", () => {
  test.each([
    {}, { known: true }, { known: true, value: false, inert: true, evidence: "证据" },
    { inert: false, evidence: "证据" }, { behavioral: " ", evidence: "证据" },
    { known: true, value: false, evidence: " " },
  ])("未设置的字段也必须拒绝无效条目 %j", (def) => {
    expect(() => rows({}, { ...defaults, warming: def })).toThrow();
  });
  test("取证版本不匹配终止", () => expect(() => rows({}, defaults, { ...evidence, version: "2.0.27" })).toThrow());
  test("CLI 与服务版本不同终止", () => expect(() => validateAssets(defaults, evidence, version, "2.0.27")).toThrow());
  test("缺少文件关联终止", () => expect(() => rows({}, defaults, { ...evidence, keys: {} })).toThrow());
  test("非法哈希终止", () => expect(() => rows({}, defaults, { ...evidence, sources: { "src/config.ts": { sha256: "invalid" } } })).toThrow());
  test("新增叶字段必须补齐默认值", () => expect(() => rows({}, { warming: defaults.warming })).toThrow());
});

describe("配置文档到脱敏行的组合行为", () => {
  test("warming 布尔值比较自身默认，enterprise 声明状态向上传播", () => {
    const result = rows({ warming: true, enterprise: { url: "https://localhost.example.com" } });
    const byKey = Object.fromEntries(result.map((r) => [r.key, r]));
    expect(byKey.warming.state).toBe("customized");
    expect(byKey.warming.default).toBe(false);
    expect(byKey["warming.interval"].state).toBe("unset");
    expect(byKey.enterprise.state).toBe("declared");
    expect(byKey["enterprise.url"].effective).toBe("<redacted>");
  });
  test("warming 对象显式采用默认间隔", () => {
    expect(rows({ warming: { interval: "4 minutes" } }).find((r) => r.key === "warming").state).toBe("default-explicit");
  });
});

describe("完整默认语义比较", () => {
  const snapshot = (field) => ({ version, fields: [{ key: "x", state: "unset", fingerprint: "same", default: null, ...field }] });
  test("schema 不变时仍报告行为默认变化", () => {
    expect(diffSnapshots(snapshot({ behavioral: "allow" }), snapshot({ behavioral: "ask" })).defaultChanged).toEqual(["x"]);
  });
  test("声明字段变为生效字段也报告默认语义变化", () => {
    expect(diffSnapshots(snapshot({ inert: true }), snapshot({ defaultKnown: true })).defaultChanged).toEqual(["x"]);
  });
  test("仅证据变化独立报告，不误报默认变化", () => {
    const result = diffSnapshots(snapshot({ defaultEvidenceSources: [{ path: "a", sha256: "old" }] }), snapshot({ defaultEvidenceSources: [{ path: "a", sha256: "new" }] }));
    expect(result.evidenceChanged).toEqual(["x"]);
    expect(result.defaultChanged).toEqual([]);
  });
});
