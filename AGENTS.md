# Repository Guidelines

## 项目概览

AGC（AGent Configs）仓库有两个用途：

1. **配置管理**：保存 Codex、OpenCode、OMO、OMP 四套 Agent 工具的可审查配置、hook、plugin 与扩展副本。来源到仓库、仓库到来源的同步由显式脚本完成；仓库不使用 symlink。
2. **学习记录**：以 Karpathy LLM Wiki 模式存储 agent 配置的学习、实验与研究成果。`raw/` 放不可变原始材料摘录，`experiments/` 放结构化实验记录，`wiki/` 放可复用结论。

## 架构与数据流

### 配置同步

`manifest.json` 是同步范围的唯一权威清单，声明每个条目的来源路径、仓库路径、是否受保护、是否为目录及排除项。当前 23 个条目：12 个 protected、6 个 directory。

```text
pull.sh / sync.py pull
  -> cli.main -> manifest.load_entries -> pull.run
  -> manifest.iter_pull_files（source→repo）
  -> sync_plan.prepare_pull -> policy.redact（protected）
  -> transfer.same_bytes -> transfer.write_atomic

push.sh / sync.py push
  -> cli.main -> manifest.load_entries -> push.run
  -> manifest.iter_push_files（repo→source）
  -> transfer.resolved_target
  -> sync_plan.prepare_push
  -> policy.scan_repo_secrets / overlay_target_credentials（protected）
  -> backup.backup_target -> transfer.write_atomic
```

- `status` 和 `diff` 复用 manifest、同步计划及文件遍历逻辑，只读报告双向状态或脱敏 unified diff。
- `pull` 对受保护内容写入 `<REDACTED>`；`push` 拒绝仓库明文凭据，并保留来源已有凭据。
- 文件比较按 bytes 进行；写入使用同目录临时文件、`fsync` 和 `os.replace`，避免半写文件。

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
- `wiki/index.md` 是全局索引；`wiki/log.md` 是追加式操作日志。

## 关键目录

| 目录            | 用途                                             |
| --------------- | ------------------------------------------------ |
| `src/agc_sync/` | 同步实现（8 个模块）                             |
| `tests/`        | 标准库 `unittest` 测试                           |
| `codex/`        | Codex 配置与 hooks                               |
| `opencode/`     | OpenCode 配置与 plugins                          |
| `omo/`          | OMO 配置                                         |
| `omp/agent/`    | OMP 配置、模型、MCP、WATCHDOG、extensions、hooks |
| `omp/plugins/`  | OMP 插件包与锁定文件                             |
| `raw/`          | 学习记录原始材料（repo-owned，不同步）           |
| `experiments/`  | 结构化实验记录（repo-owned，不同步）             |
| `wiki/`         | 编译后的知识文章（repo-owned，不同步）           |

## 开发命令

```bash
./pull.sh --dry-run       # 预览来源 -> 仓库
./pull.sh                 # 来源 -> 仓库
./push.sh --dry-run       # 预览仓库 -> 来源
./push.sh                 # 仓库 -> 来源；覆盖前备份
./sync.py status          # 双向只读状态
./sync.py diff            # 双向脱敏差异
```

`--dry-run` 仅适用于 `pull` 和 `push`。修改来源文件前，`push` 会在 `~/.agc-backups/sync-runs/` 建立备份。

## 代码约定与常见模式

- Python 模块按职责拆分，优先通过 `manifest` 驱动，不在调用方硬编码同步范围。
- `policy.py` 集中处理敏感槽位识别、脱敏、仓库明文扫描和来源凭据覆盖；不要在其他模块重复实现凭据逻辑。
- `manifest.py` 负责方向性文件对：`iter_pull_files` 为来源到仓库，`iter_push_files` 为仓库到来源。目录项递归枚举时跳过 `.git`、`__pycache__`、`node_modules`、缓存/日志/session 等运行时目录及 `.bak`/`.db`/`.sqlite` 等后缀。
- `transfer.py` 统一处理 UTF-8 读取、字节比较、symlink 目标解析和原子写入。
- 失败通过 `RuntimeError` 等明确异常向 CLI 汇总；CLI 将操作错误转换为非零状态码。
- 保持函数小而直接，修改前阅读调用方；新增行为应补行为测试。

## 重要文件

| 文件                        | 用途                          |
| --------------------------- | ----------------------------- |
| `manifest.json`             | 同步边界唯一权威清单          |
| `src/agc_sync/manifest.py`  | 清单解析与文件遍历            |
| `src/agc_sync/policy.py`    | 凭据安全策略                  |
| `src/agc_sync/sync_plan.py` | pull/push 内容准备            |
| `src/agc_sync/transfer.py`  | 比较与原子写入                |
| `src/agc_sync/backup.py`    | push 覆盖前备份               |
| `src/agc_sync/cli.py`       | 命令编排与错误出口            |
| `sync.py`                   | 兼容 Python 入口              |
| `pull.sh` / `push.sh`       | 用户入口脚本                  |
| `tests/test_sync.py`        | 同步行为回归测试（16 个用例） |
| `wiki/index.md`             | 学习记录全局索引              |
| `wiki/log.md`               | 学习记录操作日志              |

## 运行时与工具偏好

- 同步运行时为 Python 3；入口脚本明确调用 `python3`。
- 根目录没有 pyproject/setup/Makefile 构建系统；不要凭空添加依赖或命令。
- 无 CI 配置（无 `.github/workflows/` 等）。
- `.opencode/` 与 `omp/plugins/` 的 package 文件只服务对应插件依赖；除非任务涉及插件，否则不把 Node/npm 流程当作同步项目默认流程。
- 不主动创建 symlink；来源条目是 symlink 时，先评估目标副作用。

## 测试与 QA

测试使用 Python 标准库 `unittest`，测试方法命名为 `test_<行为描述>`，临时文件使用 `tempfile.TemporaryDirectory()` 和 `pathlib.Path`，CLI 输出断言使用 `io.StringIO` + `redirect_stdout`。

```bash
python3 -m unittest discover -s tests -v
python3 -m py_compile src/agc_sync/*.py sync.py
./pull.sh --dry-run
./push.sh --dry-run
./sync.py status
./sync.py diff
git diff --check
find . -path './.git' -prune -o -type l -print
```

当前 16 个测试覆盖：pull 脱敏（apiKey、Authorization、UMANS 排除路径、独立 token、Firecrawl 路径 token）、push 凭据覆盖、repo 明文 secret 扫描、原子写、pull/push run 文件同步、CLI status/diff 输出、sync_plan 双向准备、manifest 双向 FilePair。

未直接覆盖：`backup.py`、真实 manifest 和全部异常分支。新增或修改同步行为时，至少补对应行为测试，并报告未执行的验证。

## 来源映射

| 仓库路径    | 本机来源              |
| ----------- | --------------------- |
| `codex/`    | `~/.codex/`           |
| `opencode/` | `~/.config/opencode/` |
| `omo/`      | `~/.omo/`             |
| `omp/`      | `~/.omp/`             |

## 同步边界

- 不追踪 token、secret、password、cookie、credential、authorization、私钥、`.env`、数据库、WAL、历史、日志、缓存、session、运行时状态、备份和生成文件。
- 明确排除用户专属文件：`~/.codex/umans.config.toml`、`~/.omp/agent/extensions/umans-status.ts`；仓库副本保持 `<REDACTED>` 或 ignored，不纳入可提交同步内容。
- `pull`、`push`、`status`、`diff` 均通过 manifest 约束范围；不要执行广泛同步替代单文件需求。
- `raw/`、`experiments/` 和 `wiki/` 是本仓库自产的学习/实验记录，不在 `manifest.json` 中，不参与 pull/push 同步。入库前必须脱敏，不存放 token、cookie、authorization header 等凭据内容。`experiments/` 只记录结构化实验过程；只有可复用结论才晋升到 `wiki/`。

## 修改规则

- 修改前先读取现状和直接调用方。
- 只改与任务直接相关的文件；保持 diff 小、可审查、可回滚。
- 不执行 `push`，除非用户明确要求；不提交 Git，除非用户明确要求。
- 不读取、输出或提交真实凭据。
- `AGENTS.md` 只放仓库规则，不作为工作日志。

报告完成前确认测试结果、跳过项、凭据边界、symlink 状态和 Git 状态。
