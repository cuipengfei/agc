# TUIOS 关闭鼠标焦点跟随

> Source: 当前会话用户消息与来源、仓库配置读取
> Collected: 2026-11-01
> Published: Unknown

## 用户选择（原文）

> ok, turn the mouse move switch pane config back, i find it not good, lets change that back

## 来源相关行（逐字）

```toml
# click_to_type: single (a click on a pane starts typing in it), double
# auto_enter_terminal_on_focus: off (Tab keeps cycling windows),
click_to_type = 'single'
auto_enter_terminal_on_focus = 'targeted'
window_title_format = '{title} · {cwd}'
dim_unfocused = 20
focus_follows_mouse = false
```

## 仓库副本相关行（逐字）

```toml
# click_to_type: single (a click on a pane starts typing in it), double
# auto_enter_terminal_on_focus: off (Tab keeps cycling windows),
click_to_type = 'single'
auto_enter_terminal_on_focus = 'targeted'
window_title_format = '{title} · {cwd}'
dim_unfocused = 20
focus_follows_mouse = true
focus_follows_mouse_pause = 'ctrl'
```

## 本次动作与检查（会话记录归纳）

仅修改来源 focus_follows_mouse=false，删除 focus_follows_mouse_pause。tomllib 解析和断言通过；tuios get-config 返回 false。未执行同步、重启或提交。鼠标移动不再改变焦点，单击输入和键盘目标切换仍保留。仓库副本仍保存此前的鼠标跟随设置；当前值以来源为准。
