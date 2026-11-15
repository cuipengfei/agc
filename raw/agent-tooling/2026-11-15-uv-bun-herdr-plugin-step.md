# uv-bun 新增 Herdr 插件检查与升级步骤

> Source: 本机 `/home/cpf/.local/bin/uv-bun`（596 行）；`herdr plugin list --json` 实测输出
> Collected: 2026-11-15
> Published: Unknown

`uv-bun` 是本机维护脚本，不在 agc 仓库的 `manifest.json` 内，也不同步到仓库。

## 改动位置

- `header()` 的步数计数由 `[${number}/9]` 改为 `[${number}/10]`（脚本第 62 行）。
- 新增 `herdrPlugins()`，位于第 524–571 行。
- 主流程末尾在第 595 行调用 `herdrPlugins()`，位于 `ompPlugins()` 之后、`== done ==` 输出之前。

## `herdrPlugins()` 行为

```js
function herdrPlugins() {
  header(10, "Herdr plugins");
  if (!available("herdr")) return console.log("  herdr not found, skip");
  console.log("checking installed Herdr plugin versions...");
  const list = run("herdr", ["plugin", "list", "--json"]);
  if (list.code) {
    status(list, "herdr plugin list --json");
    lines(list.output);
    return;
  }
  const before = JSON.parse(list.stdout).result?.plugins ?? [];
  function versions(plugins, label) {
    console.log(`  ${label} versions:`);
    for (const plugin of [...plugins].sort((a, b) => (a.plugin_id ?? "").localeCompare(b.plugin_id ?? ""))) {
      const id = plugin.plugin_id ?? "(unknown)";
      const ver = plugin.version || "(no version)";
      const src = plugin.source?.kind === "github"
        ? ` (${plugin.source.owner}/${plugin.source.repo}@${(plugin.source.resolved_commit ?? "").slice(0, 12)})`
        : "";
      console.log(`    ${id}: ${ver}${src}`);
    }
    if (!plugins.length) console.log("    none");
  }
  versions(before, "before");
  console.log("  upgrade: herdr plugin update -y");
  if (!upgrading) return;
  console.log("  upgrading Herdr plugins...");
  const update = run("herdr", ["plugin", "update", "-y"]);
  lines(update.output);
  status(update, "herdr plugin update -y");
  if (update.code) return;
  const afterList = run("herdr", ["plugin", "list", "--json"]);
  if (afterList.code) {
    status(afterList, "herdr plugin list after upgrade");
    lines(afterList.output);
    return;
  }
  const after = JSON.parse(afterList.stdout).result?.plugins ?? [];
  versions(after, "after");
  const fmt = (plugin) => `${plugin.version || "(no version)"}${plugin.source?.resolved_commit ? `@${plugin.source.resolved_commit.slice(0, 12)}` : ""}`;
  const previous = new Map(before.map((plugin) => [plugin.plugin_id, fmt(plugin)]));
  const current = new Map(after.map((plugin) => [plugin.plugin_id, fmt(plugin)]));
  console.log("  version changes:");
  const changes = [...new Set([...previous.keys(), ...current.keys()])].sort()
    .filter((id) => previous.get(id) !== current.get(id))
    .map((id) => `    ${id}: ${previous.get(id) ?? "-"} -> ${current.get(id) ?? "-"}`);
  lines(changes.length ? changes.join("\n") : "none", changes.length ? "" : "    ");
}
```

- `--check` 模式：只读 `herdr plugin list --json`，打印每个插件的 `plugin_id`、版本、GitHub 来源与 commit 前 12 位，并提示升级命令。
- `--up` 模式：先打印 before，再执行 `herdr plugin update -y`，随后重新读取并打印 after 与逐项版本变化。
- 复用脚本已有的 `header`、`available`、`run`、`status`、`lines` 辅助函数与 `codegenPlugins()`/`ompPlugins()` 的前后对比写法。

## 实测输出（`--check` 路径，2026-11-15）

以 `bun -e` 直接调用该函数、`upgrading = false` 时：

```
== [10/10] Herdr plugins ==
checking installed Herdr plugin versions...
  before versions:
    annotate: 0.9.10 (plannotator/herdr-annotate@29643fb42fcd)
  upgrade: herdr plugin update -y
```

## 依赖的数据结构

`herdr plugin list --json` 返回顶层对象含 `result.plugins[]`；记录中与本步骤相关字段为 `plugin_id`、`version`、`source.kind`、`source.owner`、`source.repo`、`source.resolved_commit`。字段名以本机实际输出为准，未查阅 Herdr 官方 schema。

## 未验证项

- `--up` 分支未在本次触发实际联网升级（插件刚手动升到 0.9.10）。
- 非 GitHub 来源插件（如本地 link 安装）的显示分支未实测。
