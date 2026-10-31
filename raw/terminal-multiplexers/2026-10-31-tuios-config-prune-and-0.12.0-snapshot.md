# TUIOS config prune and 0.12.0 snapshot

> Source: Local TUIOS 0.12.0 CLI outputs and config files (/home/cpf/.config/tuios/config.toml), AGC sync (./pull.sh, ./sync.py), git
> Collected: 2026-10-31
> Published: Unknown

## CLI outputs (verbatim)
### `tuios config prune --dry-run`
```
tuios config prune --dry-run
431 keys would be removed (same as current defaults)
```

### `tuios config prune --yes`
```
tuios config prune --yes
Removed 431 redundant default keys and deprecated appearance.sidebar.workspaces
Config written to /home/cpf/.config/tuios/config.toml
```

### `tuios keybinds doctor` (before/after)
Before:
```
DROPPED BINDINGS: inbox_deny_reason "n" in [keybindings.inbox] (n starts new agent now, inbox_deny_reason moved to R)
```
After:
```
CONFLICTS WITHIN TUIOS: none
```

### `tuios config origin`
```
All explicit keys resolved from config.toml
```

### `./pull.sh`
```
pull: updated=0 would_update=0 unchanged=70 missing=0 protected_slots=45
```

### `git diff --cached --stat`
```
 codex/hooks.json                            |   19 +-
 omp/agent/extensions/tuios-omp-agent-state.ts |  134 +++++++++++++++++++
 tuios/config.toml                           | 153 +---------------------------------------------
 3 files changed, 153 insertions(+), 497 deletions(-)
```

### Git log
```
1495db0 tuios: install agent hooks, prune defaults, tune web/multi-client config
```

## Pruned config (/home/cpf/.config/tuios/config.toml) - 153 lines
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

## Tests
`python3 -m unittest discover -s tests -v` -> OK (19 tests)
