# Raw: Snapcompact 活跃度与采用度取证（2026-10-01）

来源：本机 OMP 上游源码树 git 历史（HEAD 73a11421fe）；GitHub issue 搜索（can1357/oh-my-pi，经 gh 工具，2026-10-01 执行）。第三方 API 限当日有效。

## 包创建与版本节奏

- `git log --diff-filter=A -- packages/snapcompact/package.json` → `2026-06-10 08a941a14e feat: added standalone snapcompact package and model-specific frame shaping`；`git show -s` 确认 ad=cd=2026-06-10。
- packages/snapcompact/CHANGELOG.md 共 26 个 `## [x.y.z]` 条目；最早 `## [15.11.0] - 2026-06-10`，最新 `## [18.2.9] - 2026-09-22`。

## git 活跃度统计（author date 口径）

- `git log --format='%ad' --date=format:'%Y-%m' -- packages/snapcompact | sort | uniq -c`（含版本号提交，共 302 条）: 122 @2026-06, 73 @2026-07, 63 @2026-08, 44 @2026-09。
- 实质性改动（`git log --format='%ad %s' --grep='snapcompact' -i | grep -viE 'bump version|merge'`，全仓提交信息口径）: 78 @2026-06, 24 @2026-07, 22 @2026-08, 15 @2026-09（9 月统计至 9-23，即本地树 HEAD 日期）。
- `git log -- packages/snapcompact/src/snapcompact.ts`（剔除 bump 后最近几条）: `2026-09-21 fix(snapcompact): gate ¶think: legend on includeThinking (fixes #12683)`；`2026-09-13 fix(snapcompact): preserve mixed frame gap chronology`；`2026-08-30 perf(session): resolve snapcompact frames lazily on resume`；`2026-08-20 Merge PR #9061: fix: cap snapcompact frames at the provider image budget (@Thytu)`；`2026-08-20 fix(snapcompact): avoid quadratic data URL scans`；`2026-08-20 fix(snapcompact): heal legacy archive migration`。

## 本地 clone 排序假象记录（方法论教训）

- `git log -- packages/snapcompact | tail -3` 与 `git log --reverse | head -3` 均显示最早为 2026-08-26 版本号提交，与同一清单含 122 条 6 月提交（ad 与 cd 同为 6 月，`git log --format='%ad|%cd'` 逐条验证）矛盾。
- reflog 显示 HEAD 自 2026-09-23 起稳定于 73a11421fe，排除会话期间 HEAD 移动。
- 结论：该本地 clone 在 pathspec + 默认历史简化下的输出顺序不按时间排；`tail`/`--reverse|head` 不能作为最早时间证据；创建时间以 `--diff-filter=A` 为准。

## GitHub issue 搜索（snapcompact repo:can1357/oh-my-pi）

open 前 10（搜索返回上限 10，非全量）：

- #13101 (2026-09-24,  bot) "openai-codex: snapcompact image frames freeze the prompt cache on gpt-5.6-sol/luna and gpt-6-astra"
- #10655 (2026-09-03, @will-bogusz) "Active /goal does not auto-resume after compact (especially snapcompact)"
- #13100 (2026-09-24, bot) "Provider capability flag compat.promptCacheSpansImages"
- #13173 (2026-09-24, @docxology) "snapcompact toolResults imaging invalidates live provider cache; consider an age gate"
- #8488 (2026-08-14, @systemfsoftware-maker) "Non-vision models hardcode the context-full compaction fallback"
- #13393 (2026-09-26, @neilcawse) "snapcompact: custom-provider sessions get a 5-frame archive, so every user message after the first is dropped (natural repro of #8792)"
- #7455 (2026-08-03, @riicodespretty) "plan-approval 'Approve and compact context' should honor compaction.strategy (snapcompact) when model supports vision"
- #7898 (2026-08-07, @metaphorics) "Provider-native compaction is unreachable under the default snapcompact strategy"
- #12854 (2026-09-22, @esp3tek) "snapcompact: the archive preamble triggers Anthropic safeguard refusals on Opus 5 (apiRefusalCategory: reasoning_extraction)"
- #8792 (2026-08-17, @grapexy) "Snapcompact can silently drop user instructions when its frame archive overflows"

closed 前 10：

- #12683 (2026-09-21, @isac322) "snapcompact preamble still declares ¶think: after #6439 gated the body"
- #11937 (2026-09-13, @terriblegoodday) "Image-budget clamp invalidates vLLM prefix cache every turn"
- #9901 (2026-08-27, @xiyihan0) "persisted snapcompact frames are truncated into invalid base64 after restart"
- #10716 (2026-09-03, @hongyue0721) "Opaque reasoning replay bytes can bypass snapcompact's no-reduction guard"
- #11607 (2026-09-10, @bannert1337) "Snapcompact frame rescue duplicates the snap-compacted divider"
- #10734 (2026-09-03, @shussekaido) "docs(settings): project config example still uses legacy compaction.strategy"
- #12934 (2026-09-23, @AAhongQ) "/dump LLM request JSON should include the provider context actually sent"
- #13211 (2026-09-24, @rubybrowncoat) "compaction.midTurnEnabled: false also disables proactive compaction for every subagent"
- #10023 (2026-08-28, @fede-oss) "snapcompact increases tokens after manual compaction (72,706 → 79,680)"
- #5755 (2026-07-16, @a-lavis) "Allow snapcompact as a fallback when auto-compact policy is shake"

## 外部贡献者

- PR #9061（@Thytu）: cap snapcompact frames at the provider image budget（已合并，2026-08-20）。
- PR #10227（@lemonleks）: resolve persisted snapcompact frames lazily on resume（coding-agent CHANGELOG :373 记录，"Reduced resume memory use by resolving persisted snapcompact frames only when they are included in the rebuilt context"）。
