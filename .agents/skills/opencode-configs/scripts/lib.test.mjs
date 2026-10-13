import { describe, expect, test } from "bun:test";
import {
  walkSchema,
  mergeDocs,
  getPath,
  triState,
  deriveParentState,
  redact,
  descGaps,
  diffSnapshots,
  fingerprint,
} from "./lib.mjs";

const SPEC = {
  components: {
    schemas: {
      "Config.InfoEncoded": {
        type: "object",
        properties: {
          update: { $ref: "#/components/schemas/Update" },
          compaction: {
            type: "object",
            properties: {
              auto: { type: "boolean" },
              keep: { type: "object", properties: { tokens: { type: "integer" } } },
            },
          },
          providers: { type: "object", additionalProperties: { type: "object" } },
          warming: {
            anyOf: [
              { type: "boolean" },
              { type: "object", properties: { interval: { type: "string" } } },
            ],
          },
          skills: { type: "array", items: { type: "string" } },
        },
      },
      Update: { type: "string", enum: ["disable", "notify", "auto"] },
    },
  },
};

describe("walkSchema", () => {
  test("顶层键全部成行，固定 properties 递归展开，anyOf 对象分支展开", () => {
    const keys = walkSchema(SPEC).map((r) => r.key);
    expect(keys).toContain("update");
    expect(keys).toContain("compaction");
    expect(keys).toContain("compaction.auto");
    expect(keys).toContain("compaction.keep.tokens");
    expect(keys).toContain("warming.interval");
    expect(keys).toContain("providers");
    expect(keys).toContain("skills");
  });
  test("record 与数组不展开子行", () => {
    const keys = walkSchema(SPEC).map((r) => r.key);
    expect(keys.some((k) => k.startsWith("providers."))).toBe(false);
    expect(keys.some((k) => k.startsWith("skills."))).toBe(false);
  });
  test("$ref 被解析，update 行带 enum", () => {
    const row = walkSchema(SPEC).find((r) => r.key === "update");
    expect(row.schema.enum).toEqual(["disable", "notify", "auto"]);
  });
  test("缺 Config.InfoEncoded 时抛错", () => {
    expect(() => walkSchema({ components: { schemas: {} } })).toThrow();
  });
});

describe("mergeDocs", () => {
  test("后者覆盖前者，对象深合并，数组整体替换", () => {
    const merged = mergeDocs([
      { update: "notify", compaction: { auto: true }, skills: ["a"] },
      { update: "auto", compaction: { buffer: 2000 }, skills: ["b", "c"] },
    ]);
    expect(merged.update).toBe("auto");
    expect(merged.compaction).toEqual({ auto: true, buffer: 2000 });
    expect(merged.skills).toEqual(["b", "c"]);
  });
});

describe("triState", () => {
  const def = { known: true, value: "notify" };
  test("未设置", () => expect(triState(false, undefined, def)).toBe("unset"));
  test("显式默认", () => expect(triState(true, "notify", def)).toBe("default-explicit"));
  test("已修改", () => expect(triState(true, "auto", def)).toBe("customized"));
  test("内置行为默认：配置即修改", () => expect(triState(true, ["x"], { behavioral: "内置规则" })).toBe("customized"));
  test("内置行为默认：未配置仍属未设置", () => expect(triState(false, undefined, { behavioral: "内置规则" })).toBe("unset"));
  test("接受但不生效", () => expect(triState(true, "manual", { inert: true })).toBe("declared"));
  test("inert 未设置仍属未设置", () => expect(triState(false, undefined, { inert: true })).toBe("unset"));
  test("def 形态缺失直接抛错", () => expect(() => triState(true, "x", {})).toThrow());
});

describe("deriveParentState", () => {
  test("未配置", () => expect(deriveParentState(false, undefined, null, ["unset"])).toBe("unset"));
  test("后代全部显式默认", () => expect(deriveParentState(true, { a: 1 }, null, ["default-explicit", "unset"])).toBe("default-explicit"));
  test("任一代已修改", () => expect(deriveParentState(true, { a: 1 }, null, ["default-explicit", "customized"])).toBe("customized"));
  test("仅声明后代向父行传播", () => expect(deriveParentState(true, { url: "x" }, null, ["declared"])).toBe("declared"));
  test("标量形态用自身默认比较：非默认", () =>
    expect(deriveParentState(true, true, { known: true, value: false }, ["unset", "unset"])).toBe("customized"));
  test("标量形态用自身默认比较：显式默认", () =>
    expect(deriveParentState(true, false, { known: true, value: false }, ["unset"])).toBe("default-explicit"));
  test("标量形态无自身条目按显式默认", () => expect(deriveParentState(true, {}, null, ["unset"])).toBe("default-explicit"));
});

describe("redact", () => {
  test("凭据键名整值遮蔽，含嵌套", () => {
    const out = redact({ providers: { x: { settings: { apiKey: "sk-live-123" } } } });
    expect(out.providers.x.settings.apiKey).toBe("<redacted>");
  });
  test("空凭据值不遮蔽", () => {
    expect(redact("", "apiKey")).toBe("");
  });
  test("非本机 URL 遮蔽，本机保留", () => {
    expect(redact("https://api.example.com/v1", "baseURL")).toBe("<redacted>");
    expect(redact("http://127.0.0.1:8000/v1", "baseURL")).toBe("http://127.0.0.1:8000/v1");
    expect(redact("http://localhost:3000", "baseURL")).toBe("http://localhost:3000");
  });
  test("字符串内嵌 URL 只替换 URL 子串", () => {
    expect(redact("代理 https://api.example.com/x 说明", "note")).toBe("代理 <redacted> 说明");
  });
  test("{file:…} 引用保留路径", () => {
    expect(redact("{file:~/.secrets/key}", "apiKey")).toBe("<redacted>"); // 凭据键名下仍遮蔽
    expect(redact("{file:./rules.md}", "instructions")).toBe("{file:./rules.md}");
  });
  test("tokens 计数键不误伤", () => {
    expect(redact(15000, "tokens")).toBe(15000);
    expect(redact("abc", "apiToken")).toBe("<redacted>");
  });
  test("数组逐元素处理", () => {
    expect(redact(["https://a.example.com", "http://localhost:1"])).toEqual([
      "<redacted>",
      "http://localhost:1",
    ]);
  });
});

describe("descGaps 门槛", () => {
  const rows = [{ key: "update" }, { key: "compaction.auto" }];
  test("缺整条与缺 desc 都报", () => {
    const gaps = descGaps(rows, { update: { desc: "更新策略" } });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toContain("compaction.auto");
  });
  test("空 desc 报缺", () => {
    expect(descGaps(rows, { update: { desc: "x" }, "compaction.auto": { desc: " " } })).toHaveLength(1);
  });
  test("全覆盖返回空", () => {
    expect(descGaps(rows, { update: { desc: "x" }, "compaction.auto": { desc: "y" } })).toHaveLength(0);
  });
});

describe("fingerprint 与 diffSnapshots", () => {
  test("指纹对键序不敏感、对结构变化敏感", () => {
    const a = fingerprint({ type: "object", properties: { x: { type: "string" } } });
    const b = fingerprint({ properties: { x: { type: "string" } }, type: "object" });
    const c = fingerprint({ type: "object", properties: { x: { type: "integer" } } });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
  test("diff 报新增、删除、指纹、默认值、状态变化", () => {
    const prev = {
      version: "2.0.27",
      fields: [
        { key: "a", fingerprint: "1", state: "unset", default: null },
        { key: "b", fingerprint: "2", state: "unset", default: { known: true, value: 1 } },
        { key: "c", fingerprint: "3", state: "unset", default: null },
      ],
    };
    const fresh = {
      version: "2.0.28",
      fields: [
        { key: "b", fingerprint: "9", state: "customized", default: { known: true, value: 2 } },
        { key: "d", fingerprint: "4", state: "unset", default: null },
      ],
    };
    const r = diffSnapshots(prev, fresh);
    expect(r.added).toEqual(["d"]);
    expect(r.removed).toEqual(["a", "c"]);
    expect(r.fingerprintChanged).toEqual(["b"]);
    expect(r.defaultChanged).toEqual(["b"]);
    expect(r.stateChanged).toEqual(["b"]);
    expect(r.versionBumped).toBe(true);
  });
});

describe("getPath", () => {
  test("点路径取值，缺失返回 undefined", () => {
    expect(getPath({ a: { b: 1 } }, "a.b")).toBe(1);
    expect(getPath({ a: {} }, "a.b")).toBeUndefined();
    expect(getPath(undefined, "a")).toBeUndefined();
  });
});
