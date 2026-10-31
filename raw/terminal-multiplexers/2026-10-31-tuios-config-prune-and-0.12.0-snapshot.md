# TUIOS config prune and 0.12.0 snapshot

> Source: 本机 tuios 0.12.0 CLI（`config prune --dry-run`、`config files`、`config path`、`keybinds doctor`）、`/home/cpf/.config/tuios/config.toml`、git
> Collected: 2026-10-31
> Published: Unknown

## `tuios config prune --dry-run`（pre-prune 配置，644 行，来自 commit c1d7c66，verbatim 首行）

```
Would remove 431 keys that have their default value from /tmp/tmp.LyUmxNDiaV/tuios/config.toml:
  startup.open_default_window
  startup.start_in_terminal_mode
  startup.layout
  tape.auto_review
```

复现方式：把 `git show c1d7c66:tuios/config.toml` 写到临时 `XDG_CONFIG_HOME/tuios/config.toml` 后执行同一命令。

## `tuios config prune --dry-run`（当前 153 行配置，verbatim）

```
Would remove 1 keys that have their default value from /home/cpf/.config/tuios/config.toml:
  daemon.window_size
```

说明：`window_size = 'latest'` 与当前默认值相同，因此可再被 prune 移除，行为不受影响。

## `tuios keybinds doctor`（verbatim 摘录）

```
CONFLICTS WITHIN TUIOS (certain)
  none: each key does one thing in its scope
```

## `tuios config files` / `config path`（verbatim）

```
Config files, from lowest to highest precedence:
  1. /home/cpf/.config/tuios/config.toml (main)
config.toml has no include list and there is no config.d directory.
```

```
/home/cpf/.config/tuios/config.toml
```

## 当前 `config.toml` 非注释行（verbatim 摘录，非全文）

文件共 153 行，含上游生成的注释头；以下为全部非注释行：

```toml
[appearance]
show_clock = true
show_cpu = true
show_ram = true
theme = 'tokyonight_storm'
dock_pill_caps = true
session_border = true
clock_format = '15:04:05'
click_to_type = 'single'
auto_enter_terminal_on_focus = 'targeted'
[appearance.selection]
search_fg = '#F5E7C8'
match_fg = '#1C1B19'
cursor_fg = '#08222B'
[appearance.sidebar]
position = 'left'
width = 28
[notifications.agent]
notify = false
[keybindings]
[keybindings.system]
toggle_spotlight = ['b']
[keybindings.terminal_mode]
terminal_paste_host = ['ctrl+shift+v', 'super+v', 'shift+super+v']
[daemon]
resume_agents = 'auto'
window_size = 'latest'
[startup]
tiled = true
daemon = true
```

## Git（verbatim）

```
$ git log --oneline -2
8d5b82a wiki: ingest TUIOS 0.12.0 config, agent display, and prune session
1495db0 tuios: install agent hooks, prune defaults, tune web/multi-client config
```

`git show --stat 1495db0`：

```
 codex/hooks.json                              |  78 ++++
 omp/agent/extensions/tuios-omp-agent-state.ts |  69 ++++
 tuios/config.toml                             | 503 +-------------------------
 3 files changed, 153 insertions(+), 497 deletions(-)
```

## 测试

`python3 -m unittest discover -s tests -v` 共 19 项通过。
