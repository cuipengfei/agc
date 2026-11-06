# Repository Guidelines

## 项目概览

AGC（AGent Configs）仓库有两个用途：

1. **配置管理**：保存 Codex、OpenCode、OMO、OMP、Prime Agent 五套核心 Agent 工具的可审查配置、hook、plugin 与扩展副本。其他工具配置、技能锁与工具清单的实际同步范围以 `manifest.json` 为准。同步是单向的：来源 -> 仓库，由显式脚本完成；仓库不使用 symlink。要改配置就在来源处改，再 pull 进仓库并提交，仓库只作版本化备份与变更历史。
2. **学习记录**：以 Karpathy LLM Wiki 模式存储 agent 配置的学习、实验与研究成果。`raw/` 放原始材料摘录（已核实错误可直接更正），`experiments/` 放结构化实验记录，`wiki/` 放可复用结论。

## 架构与数据流

### 配置同步

`manifest.json` 是同步范围的唯一权威清单，声明每个条目的来源路径、仓库路径、是否受保护、是否为目录及 `include`/`exclude` 过滤规则。条目总数、protected 与 directory 的实际数量以 `manifest.json` 为准，不在本文重复声明。

```text
pull.sh / sync.py pull
  -> cli.main -> pull.run
  -> manifest.load_entries（未直接传入 entries）
  -> manifest.iter_pull_files（source→repo）
  -> sync_plan.prepare_pull -> policy.redact（仅 protected）
  -> transfer.same_bytes -> transfer.write_atomic（非 dry-run）
```

- 同步只有 pull 一个方向。仓库副本不会写回来源，因此仓库里不需要、也不应出现真实凭据。
- `pull` 对受保护内容写入 `<REDACTED>`。
- 文件比较按 bytes 进行；写入使用同目录临时文件、`fsync` 和 `os.replace`，避免半写文件。
- `status` 与 `diff` 复用 manifest、同步计划及文件遍历逻辑，只读报告 pull 方向的状态或脱敏 unified diff。

### 学习记录

> 本仓库规则优先于 skill：`raw/` 可直接更正已核实错误，包括已提交的文件；`wiki/` 随时可改，但新事实必须先存新 raw（同 topic 多 raw 用 `Raw:` 分号并列）。

```text
调查/实验（experiments/ 或 /tmp 草稿，可反复改）
  -> raw/<topic>/（保存可核对摘录，已核实错误可直接更正）
  -> wiki/<topic>/（可复用结论，随时演进）
```

- 格式与流程以 `karpathy-llm-wiki` skill 为准（raw/wiki 布局、index/log 条目格式与取值、Grounding Invariant、lint 流程、相对路径规则）。本节只记该 skill 没有的 agc 特有约束，避免 skill 升级后两处漂移。
- `raw/` 只放必要摘录，不放完整 transcript；每次写入前必须脱敏。
- 有可核对依据的抄录、事实或归纳错误可以在原 `raw/` 文件中直接更正，包括已提交的文件；更正须保留准确来源、归因与原意，并同步受影响的 `wiki/`。新增材料或后续研究结论另存新 raw。
- `experiments/` 固定字段：Hypothesis / Baseline / Change / Context / Steps / Observations / Evidence / Verdict / Follow-up。
- 文章元数据（`Sources`、`Raw`、`Updated`）必须紧跟 H1 放在连续 blockquote 里；写在正文末尾会被证据校验器判为「无 Raw 字段」并连带把对应 raw 报成 unreferenced。

## 关键目录

| 目录            | 用途                                             |
| --------------- | ------------------------------------------------ |
| `src/agc_sync/` | 同步实现                                         |
| `tests/`        | 标准库 `unittest` 测试                           |
| `codex/`        | Codex 配置与 hooks                               |
| `opencode/`     | OpenCode 配置与 plugins                          |
| `omo/`          | OMO 配置                                         |
| `omp/agent/`    | OMP 配置、模型、MCP、WATCHDOG、extensions、hooks |
| `omp/plugins/`  | OMP 插件包与锁定文件                             |
| `prime/`        | Prime Agent 配置（settings、models）             |
| `herdr/`、`tuios/`、`dsh/`、`plannotator/`、`starship/` | 其他工具配置副本 |
| `agents/`、`bun/`、`uv/` | 技能锁、Bun 全局包清单与指定的 `uv-receipt.toml` 文件 |
| `tools/tern-maintain/` | 独立 Tern 维护工具与验收入口 |
| `tools/wiki-check/` | Wiki 字面证据检查器 |
| `raw/`          | 学习记录原始材料（repo-owned，不同步）           |
| `experiments/`  | 结构化实验记录（repo-owned，不同步）             |
| `wiki/`         | 编译后的知识文章（repo-owned，不同步）           |

## 开发命令

同步命令从仓库根目录执行。

```bash
./pull.sh --dry-run       # 预览来源 -> 仓库（等价 ./sync.py pull --dry-run）
./pull.sh                 # 来源 -> 仓库
./sync.py status          # 只读状态（pull 方向）
./sync.py diff            # 只读脱敏差异（pull 方向）
```

`--dry-run` 仅适用于 `pull`；用在 `status`/`diff` 会走 `parser.error` 并以 2 退出。`pull.sh` 只是 `exec python3 sync.py pull "$@"` 的薄包装。

清点同步范围（数量以 `manifest.json` 为准）：

```bash
python3 -c "import json;e=json.load(open('manifest.json'))['entries'];print(len(e),sum(1 for x in e if x.get('protected')),sum(1 for x in e if x.get('directory')))"
```

## 代码约定与常见模式

- Python 模块按职责划分，优先通过 `manifest` 驱动，不在调用方硬编码同步范围。内部 helper 使用 `_` 前缀。
- `policy.py` 集中处理敏感槽位识别与脱敏；不要在其他模块重复实现凭据逻辑。`_slots_for_line` 收集 query、CLI 参数、Authorization 和敏感赋值四类候选，按位置、跨度与类别优先级仲裁重叠项；`_is_actual_secret` 保留安全占位符、环境变量名、布尔与数字，命中 `SECRET_LITERAL` 时仍判为密钥；`redact` 还逐行处理 `EXCLUDED_USER_PATH`、已知密钥或私钥字面量及 URL 内嵌凭据。修改这里时，必须检查环境变量名是否会被误脱敏。
- `manifest.py` 的 `iter_pull_files` 枚举来源到仓库的文件对。目录条目的 `include` 非空时按 glob 直接枚举，否则递归枚举；两路都跳过 symlink、`IGNORED_NAMES`、`IGNORED_SUFFIXES` 和条目 `exclude`。单文件条目直接产生文件对，不经过目录遍历过滤。目录型条目的来源整体不存在时，产出该目录自身以便下游报 `missing`。
- `transfer.py` 统一处理 UTF-8 读取、字节比较和原子写入。
- `Entry` 与 `FilePair` 是 frozen dataclass；`pull.run`、`status`、`diff` 可接收显式 `entries` 供测试隔离。同步实现使用直接函数调用和局部状态，没有 async 或通用依赖注入框架。
- 参数错误以 2 退出；根入口与 `cli.py` 模块入口把 `OSError`、`UnicodeError`、`ValueError`、`RuntimeError` 打印到 stderr 并以 2 退出，其他异常冒泡。`pull` 的 `missing` 只计入状态，返回码仍为 0。
- 保持函数小而直接，修改前阅读调用方；新增行为应补行为测试。

## 重要文件

| 文件                        | 用途                 |
| --------------------------- | -------------------- |
| `manifest.json`             | 同步边界唯一权威清单 |
| `src/agc_sync/manifest.py`  | 清单解析与文件遍历   |
| `src/agc_sync/policy.py`    | 凭据安全策略         |
| `src/agc_sync/sync_plan.py` | pull 内容准备        |
| `src/agc_sync/transfer.py`  | 比较与原子写入       |
| `src/agc_sync/cli.py`       | 命令编排与只读状态/差异 |
| `sync.py`                   | 根 Python 入口与异常退出 |
| `src/agc_sync/pull.py`      | pull 执行与状态统计     |
| `pull.sh`                   | 用户入口脚本         |
| `tests/test_sync.py`        | 同步行为回归测试     |
| `wiki/index.md`             | 学习记录全局索引     |
| `wiki/log.md`               | 学习记录操作日志     |
| `tools/tern-maintain/README.md` | Tern 命令、依赖与验收手册 |
| `tools/wiki-check/check_evidence.py` | Wiki 字面证据报告 |
| `.github/workflows/tern-maintain.yml` | CI 触发范围与检查命令 |

## 运行时与工具规则

- 同步运行时为 Python 3；入口脚本明确调用 `python3`。
- 根目录没有 pyproject/setup/Makefile 构建系统；不要凭空添加依赖或命令。
- `.github/workflows/tern-maintain.yml` 在 `paths` 命中时执行 Tern 的 `bun run check`、Bun 行为测试、uv/FontTools 测试，以及根目录的 Wiki 证据检查和同步 unittest。Tern 命令工作目录为 `tools/tern-maintain/`；是否触发由 workflow 的 `paths` 决定，修改同步代码后仍需在本地运行根目录 unittest。
- Tern 分层验收：结构报告的 `deployable` 始终为 `false`；`verify-page` 检查无 token 页面初始化、字体注入、模块身份和 WebSocket 缺席，mount 与完整 GPU 交互仍记为 `not_run`；`inspect-runtime` 与 `verify-service` 检查实际进程、资源和认证行为。
- `upgrade` 会停止、替换并重启指定服务，只有明确授权时才运行，并核对进程、HTTP、认证与 pane 保留。`markdown-windows` 是独立的 Windows Chrome 复现检查，不作为部署条件；CI 不执行真实页面或服务验收。
- 各工具目录的 package/workspace 文件只服务对应工具，根目录不因此采用 Node/npm。`tools/tern-maintain/` 有独立 Bun 依赖、`typecheck/` 子包、uv 管理的 Python 依赖和固定 WABT 构建要求；完整命令以 `tools/tern-maintain/README.md` 为准。
- 不主动创建 symlink；来源条目是 symlink 时，先评估目标副作用。

## 测试与 QA

测试使用 Python 标准库 `unittest`，测试方法命名为 `test_<行为描述>`，临时文件使用 `tempfile.TemporaryDirectory()` 和 `pathlib.Path`，CLI 输出断言使用 `io.StringIO` + `redirect_stdout`。测试直接调用命令函数，不启动 CLI 子进程。

```bash
python3 -m unittest discover -s tests -v
python3 -m py_compile src/agc_sync/*.py sync.py
./pull.sh --dry-run
./sync.py status
./sync.py diff
git diff --check
find . -path './.git' -prune -o -type l -print
```

Tern 的 CI 对应检查从 `tools/tern-maintain/` 执行：

```bash
bun run check
bun test
uv run --with-requirements requirements.txt python -m unittest discover -s python_tests -v
```

构建 fixture 需要 WABT `1.0.42`；依赖安装与 `WABT_DIR` 设置见 `.github/workflows/tern-maintain.yml` 和 `tools/tern-maintain/README.md`。

`tests/test_sync.py` 使用手工构造的 `Entry`，覆盖 protected 内容脱敏（含 URL 内嵌凭据、已知 token、环境变量名与安全对象值）、原子写入、pull/status/diff 基本行为、sync_plan、目录来源缺失或为空，以及 manifest 文件枚举和 include/exclude。

未直接覆盖真实 manifest 全量加载、CLI 进程级参数解析、完整异常出口、symlink 语义和缺失单文件 diff。新增或修改同步行为时，至少补对应行为测试，并报告未执行的验证。

**Wiki 证据边界：**

- 提交 wiki 改动前运行 `python3 tools/wiki-check/check_evidence.py .`；CI 使用仓库副本。升级 `karpathy-llm-wiki` skill 后，比较其 `scripts/check_evidence.py` 与仓库副本并按需同步。
- 检查器正常扫描的退出码不表示通过，必须阅读报告。CI 对 evidence errors 和 unreferenced raw 设门禁；fidelity suspects 需要对照 raw 上下文人工判断。
- 已观察到的 fidelity suspect 假阳性形态：产品版本号、`See Also` 行、raw 侧写在 fenced code block 里的数字（如 JSON 字段值、代码片段中的常量）。

## 来源映射

| 仓库路径            | 本机来源                      |
| ------------------- | ----------------------------- |
| `codex/`            | `~/.codex/`                   |
| `opencode/`         | `~/.config/opencode/`         |
| `omo/`              | `~/.omo/`                     |
| `omp/`              | `~/.omp/`                     |
| `herdr/config.toml` | `~/.config/herdr/config.toml` |
| `prime/`            | `~/.prime/agent/`             |
| `plannotator/`      | `~/.plannotator/`             |
| `tuios/config.toml` | `~/.config/tuios/config.toml` |
| `dsh/`（仅清单声明的文件） | `~/.dsh/` |
| `agents/skill-lock.json` | `~/.agents/.skill-lock.json` |
| `bun/global-package.json` | `~/.bun/install/global/package.json` |
| `uv/tools/` | `~/.local/share/uv/tools/`（仅 `*/uv-receipt.toml`） |
| `starship/starship.toml` | `~/.config/starship.toml` |

## 同步边界

- 不追踪明文形态的凭据与运行时产物：token、secret、password、cookie、credential、authorization、私钥、数据库、WAL、历史、日志、缓存、session、运行时状态、备份和生成文件。例外：manifest protected 条目以 `<REDACTED>` 脱敏值入库，例如 `omp/agent/.env`（manifest `omp-env` 条目，`protected: true`）——仓库内出现的是脱敏副本，不是真实凭据，且已跟踪文件不受 `.gitignore` 的 `.env*` 规则影响。
- 明确排除的用户专属文件有两个不同层级：`omp/agent/extensions/umans-status.ts` 由 manifest 条目的 `exclude` 阻止 pull 刷新；`codex/umans.config.toml` 根本不在任何 manifest 条目覆盖范围内（`~/.codex/` 只同步 manifest 列出的具体文件与 `hooks/` 目录）。两者都存在于工作树、都被 `.gitignore` 排除，属历史残留，不纳入可提交内容。
- Prime Agent 侧排除 `auth.json`、`telemetry.json`、`AGENTS.md`（symlink 到用户级共享规则）及 sessions/logs/venv 等运行时产物；只同步 `settings.json` 与 `models.json`，两者均 protected。
- `pull`、`status`、`diff` 均通过 manifest 约束范围；不要执行广泛同步替代单文件需求。
- `raw/`、`experiments/` 和 `wiki/` 是本仓库自产的学习/实验记录，不在 `manifest.json` 中，不参与 pull 同步。入库前必须脱敏，不存放 token、cookie、authorization header 等凭据内容。`experiments/` 只记录结构化实验过程；只有可复用结论才晋升到 `wiki/`。
- `.gitignore` 是凭据边界的第二道闸，通配规则匹配任意层级。`profiles/` 对 `dsh/profiles/` 有反向例外；`.pi/better-harness/` 被忽略，`omp/.pi/extensions` 仍由 manifest 同步。`.gitignore` 只控制 Git 忽略，不过滤 pull，也不脱敏文件内容；同步范围看 manifest，敏感值由 protected 策略处理。往仓库加新目录前，同时检查 `.gitignore` 与 manifest。
- 绝对路径基本不脱敏：`policy.py` 只在 `EXCLUDED_USER_PATH` 里特判 `umans-status.ts` 一条路径，其余配置里的 `/home/<user>/...`（hook 命令、MCP 启动路径、工具链布局）会原样入库。这是已知并接受的残留，不是待修问题。

## 修改规则

- 修改前先读取现状和直接调用方。
- 只改与任务直接相关的文件；保持 diff 小、可审查、可回滚。
- 不提交 Git，除非用户明确要求。
- **凭据边界**：agent 输出、日志和提交中不出现真实凭据。agent 自身不读取凭据文件；需要时可编写脚本由脚本在运行时读取，凭据仅在 RAM 中处理、不打印。
- `AGENTS.md` 只放仓库规则，不作为工作日志。

报告完成前确认测试结果、跳过项、凭据边界、symlink 状态和 Git 状态。

## Wiki 先查

处理 agent、CLI、MCP、模型、配置或相关源码问题时，任何外部检索、源码追踪或配置读取之前，先查 `wiki/index.md`，按摘要定位并读取相关文章，再查证与作答。每个问题只查一次。

## 回答准则

执行前列出用户要求的每个独立问题、交付项、授权动作和范围限制；逐项完成并逐项验收。用户只要求读取、分析或回答时，保持只读，不增加外部研究、文件修改、同步或发布动作。

每个答案先给结论，并补齐用户作出决定所需的信息：对象、范围、触发条件、查看位置或使用入口、可见结果、agent 行为、影响、现有差异和限制。首次出现的陌生术语用常用中文解释；用户列出的项目逐项覆盖，抽象内容配例子，建议只给一个并说明理由。

事实以当前证据为准。明确分开已查证事实、推断和未知；时间相邻、共同发生和相关性不得写成因果关系。环境、版本或入口会改变答案时，先确认具体对象；关键未知会改变做法时，只问一个必要问题。

我授权的动作，做完并自己验一遍结果；我说只分析、只回答、只出方案，就守在这个范围里。答一个问题就只答这个问题。没做完的说清卡在哪。

发出前自查：每个问题是不是都有直接答案、每件事是不是都有结果。我若还会追问“具体指啥、什么情况下适用、对现状有啥影响、该选哪个、到底做没做”，而这些查得到，就接着查、补进去。分段写，留出空隙，只放跟问题相关的内容。

完成的标准：这一条我不回头翻旧消息也能读懂；我提的每个问题都有答案，每件让你做的事都有验证过的结果；重要结论有依据，不知道的地方标出来。

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:46cd31e7 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
