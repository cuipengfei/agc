# Yazi 本机配置与 agc 同步记录

> Source: 本机配置文件、终端输出、agc manifest 与同步命令输出，2026-11-22
> Collected: 2026-11-22
> Published: Unknown

## 本机配置根

本机观察到：

```text
HOME=/home/cpf
XDG_CONFIG_HOME=<unset>
YAZI_CONFIG_HOME=<unset>
```

配置创建前 `/home/cpf/.config/yazi` 不存在。按 v26.9.1 的路径解析，本机配置根为 `/home/cpf/.config/yazi`。

## 当前用户配置

文件：`/home/cpf/.config/yazi/yazi.toml`

```toml
[mgr]
sort_by = "natural"       # 1、2、10 按自然数值顺序排列
sort_translit = true      # 带变音符号的名称更容易参与排序
linemode = "size"         # 文件列表右侧显示大小
show_hidden = true        # 直接看到 .config、.git 等隐藏内容

[preview]
wrap = "yes"              # 长代码行自动折行
```

该文件只覆盖五项；其余字段继续使用发行版预设。

## 配置验证

TOML 解析与字段断言输出：

```text
TOML parsed; recommended fields present
```

真实终端验证使用 `script` 分配终端，并在 Yazi 前执行 `stty rows 40 cols 120` 设置终端尺寸。临时目录包含 `1`、`2`、`10`、`.hidden` 四个空文件。终端画面可见：

```text
.hidden    0B
1          0B
2          0B
10         0B
```

隐藏文件、自然顺序和大小列均可见。延迟输入 `q` 后，验收命令以退出码 0 结束。

## agc 同步条目

`manifest.json` 新增：

```json
{
  "name": "yazi-config",
  "source": "~/.config/yazi/yazi.toml",
  "repo": "yazi/yazi.toml",
  "protected": false
}
```

`AGENTS.md` 的其他工具配置目录包含 `yazi/`，来源映射新增：

```text
yazi/yazi.toml -> ~/.config/yazi/yazi.toml
```

同步预览只显示该文件：

```text
pull: would-update: yazi-config: /home/cpf/code-inside/agc/yazi/yazi.toml
pull: updated=0 would_update=1 unchanged=91 missing=0 protected_slots=40
```

实际同步与状态检查输出：

```text
pull: updated: yazi-config: /home/cpf/code-inside/agc/yazi/yazi.toml
pull: updated=1 would_update=0 unchanged=91 missing=0 protected_slots=40
pull: unchanged: yazi-config: /home/cpf/code-inside/agc/yazi/yazi.toml
SOURCE_REPO_CMP=identical
```

同步回归测试：

```text
Ran 50 tests in 0.081s
OK
```

`git diff --check` 无输出。修改本机配置后运行 `./pull.sh` 可刷新仓库副本。
