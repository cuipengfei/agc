import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Usage: bun render-html.mjs [settings.json] [out.html]
// 渲染自包含 HTML（无外部资源，file:// 可开）。数据来自 dump-settings 的
// 脱敏产物；此处仍做 < 转义防止 JSON 内容顶破 script 标签。
const ROOT = join(import.meta.dir, "..");
const settingsPath = process.argv[2] ?? join(ROOT, "cache/settings.json");
const outPath = process.argv[3] ?? join(ROOT, "cache/settings.html");

const raw = await readFile(settingsPath, "utf8");
const data = raw.replace(/</g, "\\u003c");
const trPath = join(ROOT, "translations.json");
if (!existsSync(trPath)) throw new Error(`translations.json 缺失：${trPath}`);

const statusLabel = {
  unset: "未设置",
  "default-explicit": "显式默认",
  customized: "已修改",
  declared: "仅声明",
};

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>OpenCode V2 配置清单</title>
<style>
:root { color-scheme: dark; }
body { background: #0d1117; color: #e6edf3; font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0; padding: 16px; }
h1 { font-size: 18px; margin: 0 0 4px; }
.meta { color: #8b949e; margin-bottom: 12px; }
.controls { margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
input, select { background: #161b22; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px; padding: 6px 10px; font: inherit; }
input { width: 320px; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; }
th, td { border: 1px solid #30363d; padding: 6px 8px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #161b22; position: sticky; top: 0; }
tr:hover td { background: #161b22; }
.st { white-space: nowrap; }
.st-unset { color: #8b949e; }
.st-default-explicit { color: #d29922; }
.st-customized { color: #58a6ff; }
.st-declared { color: #d2a8ff; }
td.v { font-size: 12px; color: #a5d6ff; }
td.d { font-size: 12px; color: #8b949e; }
.k { color: #7ee787; }
summary { cursor: pointer; color: #8b949e; }
</style>
</head>
<body>
<h1>OpenCode V2 配置清单</h1>
<div class="meta" id="meta"></div>
<div class="controls">
<input id="q" placeholder="按键名或说明筛选…">
<select id="state">
<option value="">全部状态</option>
${Object.entries(statusLabel).map(([value, label]) => `<option value="${value}">${label}</option>`).join("\n")}
</select>
</div>
<table>
<thead><tr>
<th style="width:220px">键</th><th style="width:130px">状态</th>
<th style="width:220px">生效值</th><th style="width:160px">默认值</th><th>说明</th>
</tr></thead>
<tbody id="tb"></tbody>
</table>
<script id="data" type="application/json">${data}</script>
<script>
const STATUS = ${JSON.stringify(statusLabel)};
const D = JSON.parse(document.getElementById("data").textContent);
document.getElementById("meta").textContent =
  "版本 " + D.version + " · 生成于 " + D.generatedAt + " · 共 " + D.counts.total +
  " 行（未设置 " + D.counts.unset + " / 显式默认 " + D.counts["default-explicit"] +
  " / 已修改 " + D.counts.customized + " / 仅声明 " + D.counts.declared + "）";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (v) => v === null || v === undefined ? "—" : esc(JSON.stringify(v));
const tb = document.getElementById("tb");
function render() {
  const q = document.getElementById("q").value.toLowerCase();
  const st = document.getElementById("state").value;
  tb.innerHTML = "";
  for (const f of D.fields) {
    if (st && f.state !== st) continue;
    if (q && !(f.key.toLowerCase().includes(q) || (f.desc ?? "").toLowerCase().includes(q))) continue;
    const tr = document.createElement("tr");
    const def = f.inert ? "<span title='引擎接受但不生效'>不生效</span>"
      : f.defaultKnown ? fmt(f.default)
      : f.parent ? "<span title='无独立默认值，状态由子字段推导'>见子字段</span>"
      : "<span title='" + esc(f.defaultEvidence ?? "") + "'>" + esc(f.behavioral ?? "—") + "</span>";
    tr.innerHTML =
      "<td class='k'>" + esc(f.key) + "</td>" +
      "<td class='st st-" + f.state + "'>" + (STATUS[f.state] ?? f.state) + "</td>" +
      "<td class='v'>" + fmt(f.effective) + "</td>" +
      "<td class='d'>" + def + (f.defaultEvidence ? "<br><span title='" + esc(f.defaultEvidence) + "'>📎</span>" : "") + "</td>" +
      "<td>" + esc(f.desc ?? "") + "</td>";
    tb.appendChild(tr);
  }
}
document.getElementById("q").addEventListener("input", render);
document.getElementById("state").addEventListener("change", render);
render();
</script>
</body>
</html>`;

await writeFile(outPath, html);
console.log(`wrote ${outPath} (${html.length} bytes)`);
