# AGC 纳管 TUIOS 配置的同步与验收记录

> Source: /home/cpf/code-inside/agc manifest.json、pull/status/test 命令输出、git status、policy.redact 单项检查
> Collected: 2026-10-17
> Published: Unknown

## Manifest 改动

新增条目：

```json
{
  "name": "tuios-config",
  "source": "~/.config/tuios/config.toml",
  "repo": "tuios/config.toml",
  "protected": true
}
```

`protected: true` 表示同步内容经过 AGC 的凭据检查策略。

## Dry-run 与实际同步

```console
$ ./pull.sh --dry-run
pull: would-update: tuios-config: /home/cpf/code-inside/agc/tuios/config.toml
pull: updated=0 would_update=1 unchanged=66 missing=0 protected_slots=50

$ ./pull.sh
pull: updated: tuios-config: /home/cpf/code-inside/agc/tuios/config.toml
pull: updated=1 would_update=0 unchanged=66 missing=0 protected_slots=50
```

`protected_slots=50` 是本次所有 manifest 条目的汇总输出，不能据此推断 TUIOS 单项的敏感槽位数量。

单独对 TUIOS 来源文件运行当前策略：

```text
tuios_redaction_slots= 0
source_sha256= a96bc4d73ea5353ef154d51bbc433e00ba94ec464443a6c5ffe0396604a01b77
repo_sha256= a96bc4d73ea5353ef154d51bbc433e00ba94ec464443a6c5ffe0396604a01b77
redaction_would_change= False
```

因此当前策略不会改变 TUIOS 配置，仓库副本与来源字节一致。

## 测试与状态

```text
Ran 19 tests in 0.003s
OK
```

同时执行并通过：

```bash
python3 -m py_compile src/agc_sync/*.py sync.py
git diff --check
```

`./sync.py status` 中：

```text
pull: unchanged: tuios-config: /home/cpf/code-inside/agc/tuios/config.toml
```

该次 status 输出的其他条目也均为 unchanged。

## Git 状态与一次短时异常观察

完成同步后的一次检查：

```text
 M manifest.json
?? tuios/
```

后续一次组合命令曾显示：

```text
 M manifest.json
?? tuios/manifest.json
tuios/config.toml
```

紧接着读取 `tuios/manifest.json` 时，工具返回：

```text
Path 'tuios/manifest.json' not found
```

随后再次执行 `git status --short`：

```text
 M manifest.json
?? tuios/
```

并检查未跟踪文件，当前只有 `tuios/config.toml`。该短时出现的 `tuios/manifest.json` 由哪个操作产生、是否属于外部改动，未确认；当前文件不存在。

## Symlink 与提交边界

仓库 symlink 检查显示 `.opencode/node_modules/.bin/` 和 `tools/tern-maintain/node_modules/.bin/` 下的既有依赖链接，以及 `.codegraph`。本次新增的 `tuios/config.toml` 是普通文件，没有新增 symlink。

截至本材料写入时未执行 Git commit。Git 当前变更为：

- 修改 `manifest.json`。
- 新增 `tuios/config.toml`。
- Wiki 与 raw 入库文件属于同一会话后续批准的学习记录改动。
