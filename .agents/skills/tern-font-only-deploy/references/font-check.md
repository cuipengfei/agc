# 按需字体检查

匹配的历史报告缺失、输入身份改变或结果为 `needs_investigation` 时，在用户授权的 Tern 浏览器检查范围内执行。快速检查用于新版本调查和候选修改验证；发布使用完整检查。

## 执行

从 AGC 仓库根目录运行：

```bash
export TERN_PLAYWRIGHT_MODULE='/path/to/Windows/playwright/index.mjs'
.agents/skills/tern-font-only-deploy/scripts/check-fonts.sh \
  --original /path/to/official \
  --profile tools/tern-maintain/profiles/font-registration-0.9.29-original.json --smoke
.agents/skills/tern-font-only-deploy/scripts/check-fonts.sh \
  --site /path/to/candidate-site \
  --profile tools/tern-maintain/profiles/font-registration-0.9.29-patched.json
```

`--original` 读取 `official.html`、`pkg/client.js` 和 `pkg/original.wasm`，将已校验的模块送入隔离原版页面，报告标记 `source: routed`。`--site` 校验并复制候选站点，由隔离服务投递实际资源，报告标记 `source: served`。profile 必须属于对应模块；每个新版本重新确认函数位置和局部参数。

启动器核对模块 SHA-256，自动准备私有 HOME/config/socket、随机端口、认证文件和中文 Markdown 窗格，保留本机 `XDG_DATA_HOME` 中的 Maple 字体。Windows Node 和 Chrome 使用本机默认位置，可通过 `TERN_WINDOWS_NODE`、`TERN_CHROME` 指定；Playwright 由 `TERN_PLAYWRIGHT_MODULE` 指定已安装的模块入口。`TERN_VERIFY_BINARY` 和 `TERN_TOOL_ROOT` 可指定待验证 binary 与维护工具目录。

`--smoke` 运行目标字体、内置字体和不存在字体三项，输出 `font-registration-smoke-check`。省略参数运行冷加载、暖加载及两项对照，输出 `font-registration-check`。目标字体到达后立即检查名称返回值；冷加载的字体响应等待具有超时。

## 判定

- `working`：目标阶段选中目标字体，两项对照正确；完整检查还要求冷暖两次均成功。
- `registration_missing`：目标字体完整投递，名称查询未匹配，两项对照正确。按 [新版分析顺序](new-version-analysis.md) 检查当前模块的登记流程。
- `needs_investigation`：保留报告与截图，查明身份、响应、查询或对照的失败阶段。

脚本打印独立实验目录。`evidence/font-check.json` 保存返回值、资源身份与响应 hash，旁边保存 Settings 截图、隔离进程检查和 `font-cleanup.txt`。即使检查失败，也保存脱敏 daemon、Web 和驱动日志。仅结束当前运行启动的进程；进程未退出时保存对应目录供调查。

发布用完整报告与对应 profile，通过 `TERN_FONT_REPORT`、`TERN_FONT_PROFILE` 传给 `verify-release.sh`。候选站点的成功标准为 `source: served`、模块身份一致、冷暖两次目标匹配成功、内置字体匹配成功、不存在字体返回空值和进程清理完成。中文、图标、字形与宽度由用户目视确认。
