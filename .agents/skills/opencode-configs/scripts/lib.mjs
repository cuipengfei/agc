// 纯函数库：schema 遍历、合并、四态、脱敏、资产校验与快照比较。
import { createHash } from "node:crypto";

// 深度优先解析 $ref，返回 components.schemas 里的真实节点
export function resolveRef(node, schemas) {
  let n = node;
  const seen = new Set();
  while (n && typeof n === "object" && n.$ref) {
    const name = n.$ref.split("/").pop();
    if (seen.has(name)) return {};
    seen.add(name);
    n = schemas[name] ?? {};
  }
  return n && typeof n === "object" ? n : {};
}

// 在 anyOf 分支里找带固定 properties 的对象分支（如 warming: boolean | {prompt,...}）
function objectBranches(node, schemas) {
  const branches = node.anyOf ?? node.oneOf ?? null;
  if (!branches) return [];
  return branches
    .map((b) => resolveRef(b, schemas))
    .filter((b) => b.type === "object" && b.properties);
}

// 遍历 Config.InfoEncoded，产出行清单：
// - 顶层 28 键各一行
// - 有固定 properties 的对象（含 anyOf 里的对象分支）递归展开子行，子行 key 用点路径
// - record（additionalProperties）、数组、标量不再展开
export function walkSchema(spec) {
  const schemas = spec.components?.schemas ?? {};
  const info = resolveRef(schemas["Config.InfoEncoded"], schemas);
  if (!info.properties) throw new Error("openapi.json 中找不到 Config.InfoEncoded.properties");
  const rows = [];
  const visit = (key, path, node) => {
    const resolved = resolveRef(node, schemas);
    rows.push({ key, path, schema: resolved, fingerprint: fingerprint(resolved) });
    const expand = (objNode) => {
      for (const [sub, subNode] of Object.entries(objNode.properties)) {
        visit(`${key}.${sub}`, `${path}.${sub}`, subNode);
      }
    };
    if (resolved.type === "object" && resolved.properties) expand(resolved);
    else for (const b of objectBranches(resolved, schemas)) expand(b);
  };
  for (const [key, node] of Object.entries(info.properties)) visit(key, key, node);
  return rows;
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export function fingerprint(schemaNode) {
  return createHash("sha256").update(canonical(schemaNode)).digest("hex").slice(0, 16);
}

// 深合并文档列表（后者优先）。数组整体替换，对象递归合并。
export function mergeDocs(infos) {
  const merge = (a, b) => {
    if (Array.isArray(b)) return b;
    if (b && typeof b === "object" && a && typeof a === "object" && !Array.isArray(a)) {
      const out = { ...a };
      for (const [k, v] of Object.entries(b)) out[k] = merge(a[k], v);
      return out;
    }
    return b === undefined ? a : b;
  };
  return infos.reduce((acc, info) => merge(acc, info), {});
}

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// def 三种形态：{known, value} 精确默认 / {inert} 仅声明 / {behavioral: 描述} 内置行为默认。
// behavioral 键一经配置即视为对内置行为的修改。def 缺失由 dump 的覆盖门槛拦截，此处直接抛错。
export function triState(present, value, def) {
  if (!present) return "unset";
  if (def.inert) return "declared";
  if (def.behavioral) return "customized";
  if (!def.known) throw new Error("triState: def 形态未知");
  return valuesEqual(value, def.value) ? "default-explicit" : "customized";
}

// 父行（存在 key+"." 前缀后代的行）状态推导：
// - 有配置后代：customized > declared > 全显式默认（叶级默认值精确，以叶为准）
// - 后代全未配置：标量形态（如 warming: true），有自身 defaults 条目按自身比较，否则 default-explicit
// 调用方须先算完非父行，再按 key 深度从深到浅推导父行。
export function deriveParentState(present, value, def, descendantStates) {
  if (!present) return "unset";
  if (descendantStates.some((s) => s !== "unset")) {
    if (descendantStates.includes("customized")) return "customized";
    if (descendantStates.includes("declared")) return "declared";
    return "default-explicit";
  }
  return def ? triState(true, value, def) : "default-explicit";
}

export function valuesEqual(a, b) {
  return canonical(a) === canonical(b);
}

const CREDENTIAL_KEY = /api[-_]?key|secret|token(?!s)|password|credential|authorization/i;

function isLocalURL(value) {
  const url = new URL(value);
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password;
}

// 递归脱敏。规则：
// - 键名命中凭据词表 -> 整个值替换 <redacted>
// - 字符串值是非本机 http(s) URL -> <redacted>（本机地址保留）
// - 字符串值内嵌非本机 URL（如带 key 的查询串）-> 替换该 URL 子串
// - {file:…} 引用保留路径、绝不读取目标
// 返回新值，不改原对象。
export function redact(value, keyName = "") {
  if (CREDENTIAL_KEY.test(keyName)) {
    return value === undefined || value === null || value === "" ? value : "<redacted>";
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (/^https?:\/\/\S+$/i.test(t)) return isLocalURL(t) ? value : "<redacted>";
    return value.replace(/https?:\/\/[^\s"']+/gi, (m) => (isLocalURL(m) ? m : "<redacted>"));
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, ""));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, k);
    return out;
  }
  return value;
}

// 完整性门槛：每行必须有非空 desc；缺则返回缺项清单（调用方决定抛错）
export function descGaps(rows, translations) {
  const gaps = [];
  for (const r of rows) {
    const t = translations[r.key];
    if (!t) gaps.push(`${r.key} (整条缺失)`);
    else if (!t.desc || String(t.desc).trim() === "") gaps.push(`${r.key}.desc`);
  }
  return gaps;
}

// 快照 diff：added/removed/fingerprintChanged/defaultChanged/stateChanged
export function diffSnapshots(prev, fresh) {
  const prevBy = new Map(prev.fields.map((f) => [f.key, f]));
  const freshBy = new Map(fresh.fields.map((f) => [f.key, f]));
  const added = [];
  const removed = [];
  const fingerprintChanged = [];
  const defaultChanged = [];
  const stateChanged = [];
  const evidenceChanged = [];
  for (const [key, f] of freshBy) {
    const p = prevBy.get(key);
    if (!p) {
      added.push(key);
      continue;
    }
    if (p.fingerprint !== f.fingerprint) fingerprintChanged.push(key);
    const semantics = (r) => ({ value: r.default ?? null, known: Boolean(r.defaultKnown), inert: Boolean(r.inert), behavioral: r.behavioral ?? null });
    if (!valuesEqual(semantics(p), semantics(f))) defaultChanged.push(key);
    if (!valuesEqual([p.defaultEvidence, p.defaultEvidenceSources], [f.defaultEvidence, f.defaultEvidenceSources])) evidenceChanged.push(key);
    if (p.state !== f.state) stateChanged.push(key);
  }
  for (const key of prevBy.keys()) if (!freshBy.has(key)) removed.push(key);
  return {
    newVersion: fresh.version,
    previousVersion: prev.version ?? null,
    versionBumped: prev.version != null && prev.version !== fresh.version,
    counts: {
      freshKeys: freshBy.size,
      baselineKeys: prevBy.size,
      added: added.length,
      removed: removed.length,
      fingerprintChanged: fingerprintChanged.length,
      defaultChanged: defaultChanged.length,
      stateChanged: stateChanged.length,
      evidenceChanged: evidenceChanged.length,
    },
    added: added.sort(),
    removed: removed.sort(),
    fingerprintChanged: fingerprintChanged.sort(),
    defaultChanged: defaultChanged.sort(),
    stateChanged: stateChanged.sort(),
    evidenceChanged: evidenceChanged.sort(),
  };
}

export function validateAssets(defaults, evidence, version, cliVersion = version) {
  if (version !== cliVersion) throw new Error("CLI 与后台服务版本不一致");
  if (evidence.version !== version) throw new Error("默认值取证版本不匹配，请运行 review-evidence 并审核资产");
  if (evidence.repository !== "anomalyco/opencode") throw new Error("取证仓库无效");
  for (const [path, source] of Object.entries(evidence.sources ?? {})) {
    if (!path || path.startsWith("/") || path.split("/").includes("..") || !/^[a-f0-9]{64}$/.test(source.sha256 ?? ""))
      throw new Error(`源码证据无效：${path}`);
  }
  for (const [key, def] of Object.entries(defaults)) {
    if (!def || typeof def !== "object" || Array.isArray(def)) throw new Error(`默认值条目无效：${key}`);
    const shapes = [Object.hasOwn(def, "known"), Object.hasOwn(def, "inert"), Object.hasOwn(def, "behavioral")];
    if (shapes.filter(Boolean).length !== 1 || (shapes[0] && (def.known !== true || !Object.hasOwn(def, "value"))) ||
        (shapes[1] && def.inert !== true) || (shapes[2] && (typeof def.behavioral !== "string" || !def.behavioral.trim())))
      throw new Error(`默认值形态无效：${key}`);
    if (typeof def.evidence !== "string" || !def.evidence.trim()) throw new Error(`默认值证据缺失：${key}`);
    const paths = evidence.keys?.[key];
    if (!Array.isArray(paths) || !paths.length || paths.some((path) => !Object.hasOwn(evidence.sources ?? {}, path)))
      throw new Error(`源码证据关联缺失：${key}`);
  }
}

// dump 与隔离样本共用同一路径，任何校验失败都发生在产物写入之前。
export function buildRows(spec, docs, defaults, translations, evidence, version, cliVersion = version) {
  validateAssets(defaults, evidence, version, cliVersion);
  const schemaRows = walkSchema(spec);
  const keys = schemaRows.map((r) => r.key);
  const isParent = (key) => keys.some((k) => k.startsWith(key + "."));
  const missing = schemaRows.filter((r) => !isParent(r.key) && !Object.hasOwn(defaults, r.key)).map((r) => r.key);
  if (missing.length) throw new Error(`defaults.json 覆盖不全：${missing.join(", ")}`);
  const gaps = descGaps(schemaRows, translations);
  if (gaps.length) throw new Error(`translations.json 覆盖不全：${gaps.join(", ")}`);
  const merged = mergeDocs(docs.filter((d) => d.type === "document" && d.info).map((d) => d.info));
  const rows = schemaRows.map(({ key, path, fingerprint }) => {
    const raw = getPath(merged, path);
    const present = raw !== undefined;
    const def = defaults[key];
    const parent = isParent(key);
    return {
      key, parent, present, state: parent ? null : triState(present, raw, def),
      effective: present ? redact(raw, key.split(".").pop()) : null,
      default: def?.known ? redact(def.value, key.split(".").pop()) : null,
      defaultKnown: Boolean(def?.known), inert: Boolean(def?.inert), behavioral: def?.behavioral ?? null,
      defaultEvidence: def?.evidence ?? null,
      defaultEvidenceSources: (evidence.keys[key] ?? []).map((path) => ({ path, sha256: evidence.sources[path].sha256 })),
      sources: docs.filter((d) => d.type === "document" && getPath(d.info, path) !== undefined).map((d) => d.path ?? "(inline)"),
      fingerprint, label: translations[key].label ?? null, desc: translations[key].desc,
    };
  });
  for (const p of rows.filter((r) => r.parent).sort((a, b) => b.key.split(".").length - a.key.split(".").length)) {
    p.state = deriveParentState(p.present, getPath(merged, p.key), defaults[p.key], rows.filter((r) => r.key.startsWith(p.key + ".")).map((r) => r.state));
  }
  return rows;
}
