import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Usage: bun render-html.mjs [settings.json] [out.html]
// Renders a self-contained viewer (no external resources) that reads
// settings.json values inlined as JSON — safe for local file:// viewing
// because dump-settings already redacts credential values.
const settingsPath = process.argv[2] ?? join(import.meta.dir, "../cache/settings.json");
const outPath = process.argv[3] ?? join(import.meta.dir, "../cache/settings.html");
const raw = await readFile(settingsPath, "utf8");
const version = JSON.parse(raw).version;
// < breaks out of the script tag and of HTML parsing; \u003c is valid JSON
// and renders identically after JSON.parse, so inline the blob escaped.
const data = raw.replace(/</g, "\\u003c");
const trPath = join(import.meta.dir, "../cache/translations.json");
if (!existsSync(trPath)) throw new Error(`translations.json 缺失：${trPath}`);
const trRaw = await readFile(trPath, "utf8");
const trData = trRaw.replace(/</g, "\\u003c");

// 写 HTML 前校验翻译覆盖：每个键都必须有非空中文 label 与 desc（源里无文字的键也必须有解释），
// 任何分组缺译名都终止，不允许渲染出空格或英文。
const T = JSON.parse(trRaw);
const src = JSON.parse(raw);
const gaps = [];
for (const s of src.settings) {
	const t = T[s.id];
	if (!t) {
		gaps.push(s.id);
		continue;
	}
	if (s.label && !t.label) gaps.push(`${s.id}.label`);
	if (!t.desc) gaps.push(`${s.id}.desc`);
}
for (const g of new Set(src.settings.map((s) => s.group).filter(Boolean))) {
	if (!T._groups?.[g]) gaps.push(`group:${g}`);
}
if (gaps.length) {
	throw new Error(`translations.json 覆盖不全（${gaps.length} 项），已终止：\n${gaps.join("\n")}`);
}

const statusLabel = { unset: "未设置", "default-explicit": "显式默认", customized: "已修改" };

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<title>OMP ${escapeHtml(version)} 配置总览</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;color:#e8e8e8;background:#000}
h1{font-size:20px} .meta{color:#9a9a9a;font-size:13px;margin-bottom:12px}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
input,select{padding:6px 8px;border:1px solid #444;border-radius:6px;font-size:13px;background:#1a1a1a;color:#e8e8e8}
table{border-collapse:collapse;width:100%;min-width:1080px;font-size:13px;table-layout:fixed}
th,td{border-bottom:1px solid #2a2a2a;padding:6px 8px;text-align:left;vertical-align:top}
th{position:sticky;top:0;background:#000;cursor:pointer;user-select:none}
th[data-k="id"]{width:14%} th[data-k="label"]{width:11%} th[data-k="group"]{width:8%}
th[data-k="type"]{width:5%} th[data-k="status"]{width:8%}
th:nth-child(6),th:nth-child(7){width:12%}
code{background:#1f1f1f;padding:1px 4px;border-radius:4px;font-size:12px;word-break:break-all;white-space:pre-wrap}
.badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;white-space:nowrap}
.b-unset{background:#2a2a55;color:#cdd6ff} .b-default-explicit{background:#5a4413;color:#ffd98a} .b-customized{background:#1e4620;color:#8affa1}
tr.cred td:first-child::after{content:" 🔑"}
.desc{color:#a8a8a8;font-size:12px;word-break:normal;line-height:1.5}

/* 窄屏（<1100px）：key、label 挤、说明列中文硬折行，把说明列提到首列占满全宽，
   其余字段缩成两列 kv 排在该行下方；宽屏规则不受影响。 */
@media (max-width:1099px){
  body{margin:12px;overflow-x:auto}
  table{min-width:0}
  thead{display:none}
  table,tbody,tr,td{display:block;width:100%}
  tr{border:1px solid #2a2a2a;border-radius:8px;margin:0 0 10px;padding:6px 8px}
  td{border:none;padding:2px 0}
  td:first-child{font-weight:600}
  td:nth-child(2)::before{content:"标签　"}
  td:nth-child(3)::before{content:"分组　"}
  td:nth-child(4)::before{content:"类型　"}
  td:nth-child(5)::before{content:"状态　"}
  td:nth-child(6)::before{content:"默认值 "}
  td:nth-child(7)::before{content:"生效值 "}
  td:nth-child(-n+7){color:#777;font-size:12px}
  td:first-child,td:nth-child(8){color:#e8e8e8;font-size:13px}
  td:first-child::before,td:nth-child(8)::before{content:none}
  td .badge{font-size:11px}
}
</style>
</head>
<body>
<h1>OMP 配置总览 <span id="v"></span></h1>
<div class="meta" id="meta"></div>
<div class="controls">
<input id="q" placeholder="搜索 key / label / 描述" size="28">
<select id="status"><option value="">全部状态</option><option value="unset">未设置</option><option value="default-explicit">显式默认</option><option value="customized">已修改</option></select>
<select id="group"><option value="">全部分组</option></select>
<label><input type="checkbox" id="creds"> 只看凭据</label>
<span id="count" style="align-self:center;color:#555"></span>
</div>
<table id="t">
<thead><tr>
<th data-k="id">key</th><th data-k="label">label</th><th data-k="group">分组</th>
<th data-k="type">类型</th><th data-k="status">状态</th><th>默认值</th><th>生效值</th><th>说明</th>
</tr></thead>
<tbody></tbody>
</table>
<script id="data" type="application/json">${data}</script>
<script id="tr" type="application/json">${trData}</script>
<script>
const D = JSON.parse(document.getElementById("data").textContent);
const T = JSON.parse(document.getElementById("tr").textContent);
const labelOf = s => (T[s.id] && T[s.id].label) || s.id;
const descOf = s => (T[s.id] && T[s.id].desc) || "";
const groupOf = g => (g && T._groups[g]) || "";
document.getElementById("v").textContent = D.version;
document.getElementById("meta").textContent =
  "生成于 " + D.generatedAt + " · 共 " + D.counts.total + " 项 · 已修改 " + D.counts.customized + " · 凭据 " + D.counts.credentials;
const groups = [...new Set(D.settings.map(s => s.group).filter(Boolean))].sort();
const gsel = document.getElementById("group");
for (const g of groups) { const o = document.createElement("option"); o.value = g; o.textContent = groupOf(g); gsel.append(o); }
const labels = {unset:"${statusLabel.unset}","default-explicit":"${statusLabel["default-explicit"]}","customized":"${statusLabel.customized}"};
const fmt = v => v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
let sortK = "id", sortAsc = true;
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function render(){
  const q = document.getElementById("q").value.toLowerCase();
  const st = document.getElementById("status").value;
  const gr = document.getElementById("group").value;
  const cr = document.getElementById("creds").checked;
  let rows = D.settings.filter(s =>
    (!st || s.status === st) && (!gr || s.group === gr) && (!cr || s.credential) &&
    (!q || (s.id+" "+labelOf(s)+" "+descOf(s)).toLowerCase().includes(q)));
  rows.sort((a,b)=>{const f=s=>sortK==="label"?labelOf(s):sortK==="group"?groupOf(s.group??""):(s[sortK]??"");const x=f(a),y=f(b);return (x<y?-1:x>y?1:0)*(sortAsc?1:-1)});
  document.getElementById("count").textContent = "显示 " + rows.length + " / " + D.settings.length;
  document.querySelector("tbody").innerHTML = rows.map(s =>
    '<tr class="'+(s.credential?"cred":"")+'"><td><code>'+esc(s.id)+'</code></td><td>'+esc(labelOf(s))+'</td><td>'+esc(groupOf(s.group||""))+'</td><td>'+esc(s.type)+'</td>'+
    '<td><span class="badge b-'+s.status+'">'+labels[s.status]+'</span></td>'+
    '<td><code>'+esc(fmt(s.default))+'</code></td><td><code>'+esc(fmt(s.effective))+'</code></td>'+
    '<td class="desc">'+esc(descOf(s))+(s.enumValues?'<br><code>'+esc(JSON.stringify(s.enumValues))+'</code>':"")+'</td></tr>').join("");
}
for (const el of ["q","status","group","creds"]) document.getElementById(el).addEventListener("input", render);
document.querySelectorAll("th[data-k]").forEach(th => th.addEventListener("click", () => {
  const k = th.dataset.k; sortAsc = sortK === k ? !sortAsc : true; sortK = k; render();
}));
render();
</script>
</body>
</html>`;

function escapeHtml(s) {
	return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

await writeFile(outPath, html);
console.log(`wrote ${outPath} (${html.length} bytes)`);
