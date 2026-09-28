import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Usage: bun render-html.mjs [settings.json] [out.html]
// Self-contained viewer (no external resources): dump-settings.mjs inlines
// label/desc/value/default per field and redacts credentials, so the blob is
// safe for local file:// viewing.
const settingsPath = process.argv[2] ?? join(import.meta.dir, "../cache/settings.json");
const outPath = process.argv[3] ?? join(import.meta.dir, "../cache/settings.html");
const raw = await readFile(settingsPath, "utf8");
const src = JSON.parse(raw);

// Every field must carry a non-empty Chinese label and desc; a gap means the
// dump lost an explanation, so terminate rather than render blanks.
const gaps = [];
for (const f of [...src.senpi.fields, ...src.native.fields]) {
  if (!f.label) gaps.push(`${f.key}.label`);
  if (!f.desc) gaps.push(`${f.key}.desc`);
}
if (gaps.length) {
  throw new Error(`字段说明覆盖不全（${gaps.length} 项），已终止：\n${gaps.join("\n")}`);
}

// < breaks out of the script tag; \u003c is valid JSON and parses identically.
const data = raw.replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<title>OMO Native 配置总览</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;color:#e8e8e8;background:#000}
h1{font-size:20px} h2{font-size:16px;margin-top:24px} .meta{color:#9a9a9a;font-size:13px;margin-bottom:12px}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
input,select{padding:6px 8px;border:1px solid #444;border-radius:6px;font-size:13px;background:#1a1a1a;color:#e8e8e8}
table{border-collapse:collapse;width:100%;min-width:960px;font-size:13px;table-layout:fixed}
th,td{border-bottom:1px solid #2a2a2a;padding:6px 8px;text-align:left;vertical-align:top}
th{position:sticky;top:0;background:#000;cursor:pointer;user-select:none}
th[data-k="key"]{width:16%} th[data-k="label"]{width:13%} th[data-k="state"]{width:9%}
th:nth-child(4),th:nth-child(5){width:14%}
code{background:#1f1f1f;padding:1px 4px;border-radius:4px;font-size:12px;word-break:break-all;white-space:pre-wrap}
.badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;white-space:nowrap}
.b-unset{background:#2a2a55;color:#cdd6ff} .b-default-explicit{background:#5a4413;color:#ffd98a} .b-customized{background:#1e4620;color:#8affa1} .b-schema-only{background:#3a2a4a;color:#e0c8ff}
.desc{color:#a8a8a8;font-size:12px;line-height:1.5}
.unset-hint{color:#9a9a9a;font-style:italic} .dash{color:#555}
@media (max-width:1099px){
  body{margin:12px;overflow-x:auto}
  table{min-width:0}
  thead{display:none}
  table,tbody,tr,td{display:block;width:100%}
  tr{border:1px solid #2a2a2a;border-radius:8px;margin:0 0 10px;padding:6px 8px}
  td{border:none;padding:2px 0}
  td:first-child{font-weight:600}
  td:nth-child(2)::before{content:"标签　"}
  td:nth-child(3)::before{content:"状态　"}
  td:nth-child(4)::before{content:"默认值 "}
  td:nth-child(5)::before{content:"生效值 "}
}
</style>
</head>
<body>
<h1>OMO Native 配置总览</h1>
<div class="meta" id="meta"></div>
<div class="controls">
<input id="q" placeholder="搜索 key / label / 描述" size="28">
<select id="state"><option value="">全部状态</option><option value="unset">未设置</option><option value="default-explicit">显式默认</option><option value="customized">已修改</option><option value="schema-only">仅声明</option></select>
<select id="section"><option value="">全部来源</option><option value="senpi">Senpi 设置</option><option value="native">omo.jsonc [native]</option></select>
<span id="count" style="align-self:center;color:#555"></span>
</div>
<table id="t">
<thead><tr>
<th data-k="key">key</th><th data-k="label">label</th><th data-k="state">状态</th>
<th>默认值</th><th>生效值</th><th>说明</th>
</tr></thead>
<tbody></tbody>
</table>
<script id="data" type="application/json">${data}</script>
<script>
const D = JSON.parse(document.getElementById("data").textContent);
const ALL = [
  ...D.senpi.fields.map(f => ({...f, section: "senpi"})),
  ...D.native.fields.map(f => ({...f, section: "native"})),
];
document.getElementById("meta").textContent =
  "生成于 " + D.generatedAt + " · 共 " + D.counts.total + " 项 · 已修改 " + D.counts.customized +
  " · 显式默认 " + D.counts.defaultExplicit + " · 未设置 " + D.counts.unset + " · 来源 " + D.senpiSrc;
const labels = {unset:"未设置","default-explicit":"显式默认","customized":"已修改","schema-only":"仅声明"};
// A value cell answers "what do I get here". Quote empty/whitespace strings so
// they're visible; a bare null/undefined becomes a quiet dash via renderCell.
const fmt = v => typeof v === "string"
  ? (v === "" || v.trim() === "" ? JSON.stringify(v) : v)
  : JSON.stringify(v);
// Default column: show the real shipped default when present; otherwise show
// the "when unset" behavior so the user can decide whether to configure it.
function defaultCell(f){
  if (f.default !== null && f.default !== undefined) return '<code>'+esc(fmt(f.default))+'</code>';
  if (f.whenUnset) return '<span class="unset-hint">未配置即：'+esc(f.whenUnset)+'</span>';
  return '<span class="dash">—</span>';
}
function valueCell(f){
  if (f.value !== null && f.value !== undefined) return '<code>'+esc(fmt(f.value))+'</code>';
  return '<span class="dash">—</span>';
}
let sortK = "key", sortAsc = true;
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function render(){
  const q = document.getElementById("q").value.toLowerCase();
  const st = document.getElementById("state").value;
  const sec = document.getElementById("section").value;
  let rows = ALL.filter(f =>
    (!st || f.state === st) && (!sec || f.section === sec) &&
    (!q || (f.key+" "+f.label+" "+f.desc).toLowerCase().includes(q)));
  rows.sort((a,b)=>{const x=a[sortK]??"",y=b[sortK]??"";return (x<y?-1:x>y?1:0)*(sortAsc?1:-1)});
  document.getElementById("count").textContent = "显示 " + rows.length + " / " + ALL.length;
  document.querySelector("tbody").innerHTML = rows.map(f =>
    '<tr><td><code>'+esc(f.key)+'</code></td><td>'+esc(f.label)+'</td>'+
    '<td><span class="badge b-'+f.state+'">'+labels[f.state]+'</span></td>'+
    '<td>'+defaultCell(f)+'</td><td>'+valueCell(f)+'</td>'+
    '<td class="desc">'+esc(f.desc)+'</td></tr>').join("");
}
for (const el of ["q","state","section"]) document.getElementById(el).addEventListener("input", render);
document.querySelectorAll("th[data-k]").forEach(th => th.addEventListener("click", () => {
  const k = th.dataset.k; sortAsc = sortK === k ? !sortAsc : true; sortK = k; render();
}));
render();
</script>
</body>
</html>`;

await writeFile(outPath, html);
console.log(`wrote ${outPath} (${html.length} bytes)`);
