# Repository Guidelines

## 项目概览

AGC（AGent Configs）仓库有两个用途：

1. **配置管理**：保存 Codex、OpenCode、OMO、OMP、Prime Agent 五套 Agent 工具的可审查配置、hook、plugin 与扩展副本。同步是单向的：来源 -> 仓库，由显式脚本完成；仓库不使用 symlink。要改配置就在来源处改，再 pull 进仓库并提交，仓库只作版本化备份与变更历史。
2. **学习记录**：以 Karpathy LLM Wiki 模式存储 agent 配置的学习、实验与研究成果。`raw/` 放不可变原始材料摘录，`experiments/` 放结构化实验记录，`wiki/` 放可复用结论。

## 架构与数据流

### 配置同步

`manifest.json` 是同步范围的唯一权威清单，声明每个条目的来源路径、仓库路径、是否受保护、是否为目录及排除项。条目总数、protected 与 directory 的实际数量以 `manifest.json` 为准，不在本文重复声明。

```text
pull.sh / sync.py pull
  -> cli.main -> manifest.load_entries -> pull.run
  -> manifest.iter_pull_files（source→repo）
  -> sync_plan.prepare_pull -> policy.redact（protected）
  -> transfer.same_bytes -> transfer.write_atomic
```

- 同步只有 pull 一个方向。仓库副本不会写回来源，因此仓库里不需要、也不应出现真实凭据。
- `pull` 对受保护内容写入 `<REDACTED>`。
- 文件比较按 bytes 进行；写入使用同目录临时文件、`fsync` 和 `os.replace`，避免半写文件。
- `status` 与 `diff` 复用 manifest、同步计划及文件遍历逻辑，只读报告 pull 方向的状态或脱敏 unified diff。

### 学习记录

```text
调查/实验
  -> raw/<topic>/YYYY-MM-DD-<slug>.md（原始证据摘录，不可变）
  -> experiments/<date>-<slug>.md（结构化实验记录）
  -> wiki/<topic>/<article>.md（可复用结论，仅在有足够材料时编译）
```

- `raw/` 只放必要摘录，不放完整 transcript；入库前必须脱敏。
- `experiments/` 固定字段：Hypothesis / Baseline / Change / Context / Steps / Observations / Evidence / Verdict / Follow-up。
- `wiki/` 只在材料足够时编译；每个事实必须能追溯到 raw。
- `wiki/index.md` 是全局索引：按 topic 分节，每节一个三列表格（Article / Summary / Updated）。`wiki/log.md` 是追加式操作日志，条目格式 `## [YYYY-MM-DD] <action> | <描述>`，字段含 `Disposition`（New / Update / Disputed / No material）、`Raw`、`Updated`。
- 文章元数据（`Sources`、`Raw`、`Updated`）必须紧跟 H1 放在连续 blockquote 里；写在正文末尾会被证据校验器判为「无 Raw 字段」并连带把对应 raw 报成 unreferenced。`Raw` 链接从 `wiki/<topic>/` 出发统一用 `../../raw/`。

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
| `prime/`        | Prime Agent 配置（settings、models）            |
| `raw/`          | 学习记录原始材料（repo-owned，不同步）           |
| `experiments/`  | 结构化实验记录（repo-owned，不同步）             |
| `wiki/`         | 编译后的知识文章（repo-owned，不同步）           |

## 开发命令

```bash
./pull.sh --dry-run       # 预览来源 -> 仓库（等价 ./sync.py pull --dry-run）
./pull.sh                 # 来源 -> 仓库
./sync.py status          # 只读状态（pull 方向）
./sync.py diff            # 只读脱敏差异（pull 方向）
```

`--dry-run` 仅适用于 `pull`；用在 `status`/`diff` 会走 `parser.error` 并以 2 退出。`pull.sh` 只是 `exec python3 sync.py pull "$@"` 的薄包装。

清点同步范围（不要在文档里写死数字）：

```bash
python3 -c "import json;e=json.load(open('manifest.json'))['entries'];print(len(e),sum(1 for x in e if x.get('protected')),sum(1 for x in e if x.get('directory')))"
```

## 代码约定与常见模式

- Python 模块按职责拆分，优先通过 `manifest` 驱动，不在调用方硬编码同步范围。
- `policy.py` 集中处理敏感槽位识别与脱敏；不要在其他模块重复实现凭据逻辑。三段结构：① `_slots_for_line`（`policy.py:66-76`）按优先级遍历四个正则取槽——`SENSITIVE_QUERY`、`CLI_SECRET`、`AUTH_VALUE`、`SENSITIVE_ASSIGNMENT`；② `_is_actual_secret` 过滤，`SAFE_VALUE` 白名单（`<REDACTED>`、`${ENV_VAR}`、`null` 等）、纯大写标识符（环境变量名如 `UMANS_API_KEY`）、布尔与数字都不脱敏，但命中 `SECRET_LITERAL` 时强制判为密钥（`policy.py:119`）；③ `redact` 尾部逐行做 literal 扫描（`policy.py:157-166`），把 `EXCLUDED_USER_PATH`（专指 `umans-status.ts` 路径）与 `SECRET_LITERAL`（`sk-`、`ghp_`、`xox*-`、`fc-` 等已知前缀）直接替换。注意 `SENSITIVE_KEY`（`policy.py:9`）当前无调用方，是死代码。改这里前先想清楚会不会把 env 变量名当密钥。
- `manifest.py` 的 `iter_pull_files` 枚举来源到仓库的文件对。目录项递归时跳过 symlink，跳过 `IGNORED_NAMES`（`.git`、`__pycache__`、`node_modules`、`cache`、`caches`、`logs`、`log`、`run`、`sessions`、`terminal-sessions`、`profiles`、`puppeteer`）与 `IGNORED_SUFFIXES`（`.bak`、`.backup`、`.db`、`.sqlite`、`.db-shm`、`.db-wal`），并跳过条目自身 `exclude` 列出的相对路径；目录型条目的来源整体不存在时，产出该目录自身以便下游报 `missing`。
- `transfer.py` 统一处理 UTF-8 读取、字节比较、symlink 目标解析和原子写入。
- 失败通过 `RuntimeError` 等明确异常向 CLI 汇总；`cli.py` 的 `__main__` 只捕获 `OSError`、`UnicodeError`、`ValueError`、`RuntimeError` 并以 2 退出，其他异常直接冒泡。
- 保持函数小而直接，修改前阅读调用方；新增行为应补行为测试。

## 重要文件

| 文件                        | 用途                          |
| --------------------------- | ----------------------------- |
| `manifest.json`             | 同步边界唯一权威清单          |
| `src/agc_sync/manifest.py`  | 清单解析与文件遍历            |
| `src/agc_sync/policy.py`    | 凭据安全策略                  |
| `src/agc_sync/sync_plan.py` | pull 内容准备                 |
| `src/agc_sync/transfer.py`  | 比较与原子写入                |
| `src/agc_sync/cli.py`       | 命令编排与错误出口            |
| `sync.py`                   | 兼容 Python 入口              |
| `pull.sh`                   | 用户入口脚本                  |
| `tests/test_sync.py`        | 同步行为回归测试              |
| `wiki/index.md`             | 学习记录全局索引              |
| `wiki/log.md`               | 学习记录操作日志              |

## 运行时与工具偏好

- 同步运行时为 Python 3；入口脚本明确调用 `python3`。
- 根目录没有 pyproject/setup/Makefile 构建系统；不要凭空添加依赖或命令。
- 无 CI 配置（无 `.github/workflows/` 等）。
- `.opencode/` 与 `omp/plugins/` 的 package 文件只服务对应插件依赖（`@opencode-ai/plugin`；`@dietrichgebert/ponytail`、`@plannotator/pi-extension`）；除非任务涉及插件，否则不把 Node/npm 流程当作同步项目默认流程。
- 不主动创建 symlink；来源条目是 symlink 时，先评估目标副作用。

## 测试与 QA

测试使用 Python 标准库 `unittest`，测试方法命名为 `test_<行为描述>`，临时文件使用 `tempfile.TemporaryDirectory()` 和 `pathlib.Path`，CLI 输出断言使用 `io.StringIO` + `redirect_stdout`。

```bash
python3 -m unittest discover -s tests -v
python3 -m py_compile src/agc_sync/*.py sync.py
./pull.sh --dry-run
./sync.py status
./sync.py diff
git diff --check
find . -path './.git' -prune -o -type l -print
```

测试共 1 个文件、1 个 `SyncTests` 类、15 个方法，无 setUp/tearDown、无共享 helper、无 skip；假条目由方法内联 `Entry(...)` 构造。覆盖：pull 脱敏（apiKey、Authorization、UMANS 排除路径、独立 token、Firecrawl 路径 token、敏感 key 下的 JSON 对象值不脱敏、不保留 repo 侧既有 secret）、原子写、pull run 文件同步、目录型条目来源缺失时报 `missing`、来源为空目录时不报 `missing`、`diff` 对缺失目录只报 `missing` 不读取内容、CLI status/diff 输出、sync_plan pull 准备、manifest pull FilePair。

未直接覆盖：真实 manifest 和全部异常分支。新增或修改同步行为时，至少补对应行为测试，并报告未执行的验证。

**Wiki 证据边界：**

- 证据校验器不在本仓库内，在 skill 目录：`python3 ~/.agents/skills/karpathy-llm-wiki/scripts/check_evidence.py .`（可追加文章路径限定范围；默认扫 `wiki/**/*.md`，排除 `index.md`、`log.md`）。
- 它只验证字面证据与 raw 链接存在性，不查概括是否忠于原文，也不替代人工语义审查。fidelity suspect 常有假阳性（产品版本号、`See Also` 行）。

## 来源映射

| 仓库路径    | 本机来源              |
| ----------- | --------------------- |
| `codex/`    | `~/.codex/`           |
| `opencode/` | `~/.config/opencode/` |
| `omo/`      | `~/.omo/`             |
| `omp/`      | `~/.omp/`             |
| `prime/`    | `~/.prime/agent/`     |

## 同步边界

- 不追踪 token、secret、password、cookie、credential、authorization、私钥、`.env`、数据库、WAL、历史、日志、缓存、session、运行时状态、备份和生成文件。
- 明确排除的用户专属文件有两个不同层级：`omp/agent/extensions/umans-status.ts` 由 manifest 条目的 `exclude` 阻止 pull 刷新；`codex/umans.config.toml` 根本不在任何 manifest 条目覆盖范围内（`~/.codex/` 只同步 4 个具体文件与 `hooks/` 目录）。两者都存在于工作树、都被 `.gitignore:47-48` 排除，属历史残留，不纳入可提交内容。
- Prime Agent 侧排除 `auth.json`、`telemetry.json`、`AGENTS.md`（symlink 到用户级共享规则）及 sessions/logs/venv 等运行时产物；只同步 `settings.json` 与 `models.json`，两者均 protected。
- `pull`、`status`、`diff` 均通过 manifest 约束范围；不要执行广泛同步替代单文件需求。
- `raw/`、`experiments/` 和 `wiki/` 是本仓库自产的学习/实验记录，不在 `manifest.json` 中，不参与 pull 同步。入库前必须脱敏，不存放 token、cookie、authorization header 等凭据内容。`experiments/` 只记录结构化实验过程；只有可复用结论才晋升到 `wiki/`。
- `.gitignore` 是凭据边界的第二道闸：忽略 `.env`、`*token*`、`*.pem`、`*.key` 等凭据形态，`.omc/`、`.omo/`、`.pi/`、`logs/`、`sessions/`、`cache/` 等运行时状态，`*.bak` 备份与 `__pycache__/`。往仓库加新目录前先确认它是否已被忽略。
- 绝对路径基本不脱敏：`policy.py` 只在 `EXCLUDED_USER_PATH` 里特判 `umans-status.ts` 一条路径，其余配置里的 `/home/<user>/...`（hook 命令、MCP 启动路径、工具链布局）会原样入库。这是已知并接受的残留，不是待修问题。

## 修改规则

- 修改前先读取现状和直接调用方。
- 只改与任务直接相关的文件；保持 diff 小、可审查、可回滚。
- 不提交 Git，除非用户明确要求。
- 不读取、输出或提交真实凭据。
- `AGENTS.md` 只放仓库规则，不作为工作日志。

报告完成前确认测试结果、跳过项、凭据边界、symlink 状态和 Git 状态。
