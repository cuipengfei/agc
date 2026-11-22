# Yazi v26.9.1 配置：路径、完整键清单与使用影响

> 研究范围：Yazi v26.9.1；本机为 WSL Linux。官方说明与固定版本源码分别标明，默认值和允许值以 v26.9.1 tag 为准。

## 图例

- `[single-source]`：事实来自 Yazi 官方项目。文档与同项目源码互相核对，但不是多个独立来源。
- `[unknown]`：证据没有覆盖的运行结果或外部实现细节。
- **证据形态：文档声明／一手直读／推断**：分别表示官方说明、直接阅读固定版本源码、由已读实现推导；推断不等于实测。
- `[]`：数组的一条规则；`<name>`、`<scheme>`、`<domain>`：用户自定义名称，不是要原样输入的键。
- `Style`：颜色与文字属性表；`Color`：颜色值；`Origin`：弹窗锚点；`Offset`：相对锚点的 `[x, y, width, height]`。
- 本文键表在对应文件标题下解释；例如 `mgr.ratio` 位于 `yazi.toml`，而 `mgr.cwd` 位于 `theme.toml`，不能混写。默认值是**发行版预设／字段省略时的值**，不是本机当前个性化配置。

## 先看分工与版本边界

`[single-source]` 想改“怎么浏览、打开、预览、调度任务”，看 `yazi.toml`；想改“按键触发什么操作”，看 `keymap.toml`；想改“颜色、文字、边框、图标”，看 `theme.toml`。另外，`vfs.toml` 注册虚拟文件系统，`init.lua` 初始化 Lua 扩展，`package.toml` 记录插件与 flavor 的依赖版本。[D1][S2]

官方 overview 仍写“三个配置文件”，指三个主配置文件，**不是目录中的全部用户配置文件**。v26.9.1 初始化代码还读取 `vfs.toml`。而 `vfs.toml` 不是固定 `[vfs]` 节的清单：真实结构是 `[<scheme>.<domain>]`，例如 `[sftp.my-server]`。[D5][S14]

`[single-source]` 本版本 `yazi.toml` 的固定顶层集合是 `mgr`、`preview`、`opener`、`open`、`tasks`、`plugin`、`input`、`confirm`、`pick`、`which`。没有可用的固定 `[cmp]`、`[notify]`、`[Terminal]`、`[terminal]`、`[log]` 行为配置节；不要从旧教程补入。[S2]

但 `cmp` 是 `keymap.toml` 的补全层，也是 `theme.toml` 的补全样式节；`notify` 是 `theme.toml` 的通知样式节。这些本版本真实支持的项均列入下文。[D3][D4][S13][S16]

### 官方参考与 tag 并不完全相同

已读官方页面显示 `Version: 26.9.1`，但说明仍有漏项。本文默认值及解析边界以 `v26.9.1` tag 为准，不将可移动的 `shipped` 入口当作版本固定证据。

| 文档缺口／差异 | v26.9.1 的处理 |
| --- | --- |
| `mgr.sort_fallback` 没有出现在一般配置参考中 | 源码与预设存在；枚举为 `alphabetical`、`natural`，完整列入。 |
| 一般配置参考没有 `plugin.spotters` 小节 | 源码支持 `spotters`、`prepend_spotters`、`append_spotters`，完整列入。 |
| fetcher 文档写有 `if` | 本 tag 的 fetcher 结构没有 `if`；只有 selector 的 `url`／`mime`、`run`、`prio`、`group`。不把 `if` 当作生效条件。 |
| preloader 文档未列 `next` | 源码支持布尔 `next`，决定匹配后是否继续下一条预加载规则。 |
| `image_filter` 文档列四种 | Rust 图像适配器还识别 `gaussian`；字段本身是字符串，未知值在该适配器回退 `triangle`。自定义插件如何解释它另由插件决定。 |
| 主题参考漏掉 `mgr.marker_symbol`、`status.perm_sep`／`perm_exec`、`notify.icon_*` | 源码与暗／亮预设均存在，完整列入。 |
| 图标说明对 glob 的 `name`／`url` 写法不一致 | glob 规则真实字段是 `url`；只有 dirs／files／exts 使用 `name`。 |
| filetype 文档没列 `hidden`、`dummy`、`none`；icon 条件没列 `hovered` | 这些实际枚举／条件由 tag 源码补齐。 |
| VFS 文档说 scheme／domain 都是 1–20 字符 kebab-case | scheme 按该要求校验；domain 的 tag 解析器接受字符串，并另外支持 `"*"` catch-all，不做同样的名字校验。建议自定义普通名称仍遵循文档写法。 |

证据形态：文档声明与一手直读。它们是同项目的文档覆盖差异，已按实际版本分开描述，不是未解的多源冲突。[D2][D4][D5][S6][S10][S14][S16][S17][S18][S27]

## 1. 从哪里读取配置

### 1.1 目录优先级

`[single-source]` 配置目录只选**一个**，不是将系统目录、家目录、当前项目目录层层叠加。路径解析直接检查环境变量的原始路径是否绝对。[S1]

| 平台 | 高到低的优先级 | 未设置、空值、相对路径时 |
| --- | --- | --- |
| Linux／Unix（包括本机 WSL） | 有效的绝对路径 `YAZI_CONFIG_HOME` → 有效的绝对路径 `XDG_CONFIG_HOME` 加 `/yazi` → `dirs::home_dir()` 加 `/.config/yazi` | 前两者没有设置、为空或不是绝对路径，跳过该级。 |
| macOS | 同 Unix 分支：`YAZI_CONFIG_HOME` → `XDG_CONFIG_HOME/yazi` → 用户家目录 `/.config/yazi` | 默认**不是** `~/Library/Application Support/yazi`。 |
| Windows | 有效的绝对路径 `YAZI_CONFIG_HOME` → `dirs::config_dir()` 加 `\yazi\config` | 不经过 Unix 的 `XDG_CONFIG_HOME` 分支；官方默认写法是 `%AppData%\yazi\config`。 |

`HOME` 不是与 `YAZI_CONFIG_HOME` 平级的额外配置根，而是 Unix 家目录回退的背景。Yazi 调用 `dirs::home_dir()`，并不在此函数直接读取 `$HOME`；所以 **`HOME` 未设置不等价于 Yazi 必然失败**：只要该库仍能返回用户家目录就继续回退；返回 `None` 才触发 `Failed to get config directory`。Windows 的 `config_dir()` 无结果也会触发相同错误。`dirs` 自身在无 `HOME`、空 `HOME` 或特殊账户下的完整查找策略不属于已读 Yazi 源码，本文不伪造其内部规则。[S1]

配置目录环境变量与 TOML 内的路径字段不要混淆：

```sh
# Shell 将 ~ 展开为绝对路径：overview 的写法有效。
YAZI_CONFIG_HOME=~/.config/yazi-alt yazi

# 先由 Shell 展开 $HOME，送给 Yazi 的也是绝对路径。
YAZI_CONFIG_HOME="$HOME/.config/yazi-alt" yazi

# 原样的相对路径／字面 ~ 不通过 is_absolute()，会被忽略。
YAZI_CONFIG_HOME=./yazi-alt yazi
YAZI_CONFIG_HOME='~/.config/yazi-alt' yazi
```

同理，Windows 要提供当前 Windows 进程识别的绝对路径。WSL 的 Linux Yazi 不会因为宿主机是 Windows 就自动改读 `%AppData%`；要用 Windows 盘上的目录，应明确指定 Linux 绝对路径，例如 `/mnt/c/Users/<user>/AppData/Roaming/yazi/config`。该路径是明确覆盖的示例，不是自动默认路径。[S1]

### 1.2 各平台具体文件的绝对路径

下表的 Linux／macOS／Windows 列以示例账户 `alice`、环境变量均未覆盖为条件；它们是绝对路径**示例**，不是所有机器都叫这个用户名。自定义配置根生效后，将整个根替换，不再追加 `yazi` 或 `config`。[S1][S19][S20][S21][D7][D8]

| 文件／目录 | Linux | macOS | Windows |
| --- | --- | --- | --- |
| 配置根 | `/home/alice/.config/yazi` | `/Users/alice/.config/yazi` | `C:\Users\alice\AppData\Roaming\yazi\config` |
| 主行为配置 | `/home/alice/.config/yazi/yazi.toml` | `/Users/alice/.config/yazi/yazi.toml` | `C:\Users\alice\AppData\Roaming\yazi\config\yazi.toml` |
| 按键 | `/home/alice/.config/yazi/keymap.toml` | `/Users/alice/.config/yazi/keymap.toml` | `C:\Users\alice\AppData\Roaming\yazi\config\keymap.toml` |
| 外观 | `/home/alice/.config/yazi/theme.toml` | `/Users/alice/.config/yazi/theme.toml` | `C:\Users\alice\AppData\Roaming\yazi\config\theme.toml` |
| 虚拟文件系统 | `/home/alice/.config/yazi/vfs.toml` | `/Users/alice/.config/yazi/vfs.toml` | `C:\Users\alice\AppData\Roaming\yazi\config\vfs.toml` |
| Lua 初始化 | `/home/alice/.config/yazi/init.lua` | `/Users/alice/.config/yazi/init.lua` | `C:\Users\alice\AppData\Roaming\yazi\config\init.lua` |
| 包依赖锁定 | `/home/alice/.config/yazi/package.toml` | `/Users/alice/.config/yazi/package.toml` | `C:\Users\alice\AppData\Roaming\yazi\config\package.toml` |
| 插件目录 | `/home/alice/.config/yazi/plugins` | `/Users/alice/.config/yazi/plugins` | `C:\Users\alice\AppData\Roaming\yazi\config\plugins` |
| 插件入口 | `/home/alice/.config/yazi/plugins/foo.yazi/main.lua` | `/Users/alice/.config/yazi/plugins/foo.yazi/main.lua` | `C:\Users\alice\AppData\Roaming\yazi\config\plugins\foo.yazi\main.lua` |
| 子入口 | `/home/alice/.config/yazi/plugins/foo.yazi/bar.lua` | `/Users/alice/.config/yazi/plugins/foo.yazi/bar.lua` | `C:\Users\alice\AppData\Roaming\yazi\config\plugins\foo.yazi\bar.lua` |
| flavor 目录 | `/home/alice/.config/yazi/flavors` | `/Users/alice/.config/yazi/flavors` | `C:\Users\alice\AppData\Roaming\yazi\config\flavors` |
| flavor 样式 | `/home/alice/.config/yazi/flavors/foo.yazi/flavor.toml` | `/Users/alice/.config/yazi/flavors/foo.yazi/flavor.toml` | `C:\Users\alice\AppData\Roaming\yazi\config\flavors\foo.yazi\flavor.toml` |
| flavor 代码配色 | `/home/alice/.config/yazi/flavors/foo.yazi/tmtheme.xml` | `/Users/alice/.config/yazi/flavors/foo.yazi/tmtheme.xml` | `C:\Users\alice\AppData\Roaming\yazi\config\flavors\foo.yazi\tmtheme.xml` |

插件 `foo` 对应 `foo.yazi/main.lua`，`foo.bar` 对应 `foo.yazi/bar.lua`，`foo.main` 归一为 `foo`。内置插件先存在于发行版的 loader 缓存，不是遍历用户目录后自动覆盖所有内置插件。扩展包中的 README、LICENSE、preview.png 等是说明／许可／展示资产，不是额外的运行配置入口，故不列为配置文件。[S20][D7][D8]

### 1.3 本机 WSL 的展开结果

本次仅只读查看研究进程的环境变量，观察到 `HOME=/home/cpf`，`YAZI_CONFIG_HOME` 与 `XDG_CONFIG_HOME` 都未设置。依上述实现，本研究进程启动 Linux Yazi 时的配置根为 `/home/cpf/.config/yazi`。证据形态：本机环境观察加源码推断；没有启动 Yazi 核实。[S1]

| 对象 | 本机绝对路径 |
| --- | --- |
| `yazi.toml` | `/home/cpf/.config/yazi/yazi.toml` |
| `keymap.toml` | `/home/cpf/.config/yazi/keymap.toml` |
| `theme.toml` | `/home/cpf/.config/yazi/theme.toml` |
| `vfs.toml` | `/home/cpf/.config/yazi/vfs.toml` |
| `init.lua` | `/home/cpf/.config/yazi/init.lua` |
| `package.toml` | `/home/cpf/.config/yazi/package.toml` |
| plugins／示例入口 | `/home/cpf/.config/yazi/plugins`；`/home/cpf/.config/yazi/plugins/foo.yazi/main.lua` |
| flavors／示例文件 | `/home/cpf/.config/yazi/flavors`；`/home/cpf/.config/yazi/flavors/foo.yazi/flavor.toml`；`/home/cpf/.config/yazi/flavors/foo.yazi/tmtheme.xml` |

`[unknown]` 已经运行的另一终端、wrapper 或独立 Yazi 进程可以拥有不同环境，本文没有读取这些进程，也没有声称上述文件都已存在。

### 1.4 文件缺失、覆盖和混合

`[single-source]` 四份 TOML 按各自固定文件名，从同一个选中的配置根读取。文件不存在时按空配置处理，保留预设；不是必须先复制全部默认文件。初始化读取／解析出现错误时，显示错误并提示按键继续使用预设，随后不合并用户的这四份 TOML。权限或错误不会被当成“另一搜索路径”的触发条件。[S2][S28]

| 对象 | 混合方式与优先顺序 |
| --- | --- |
| 一般 TOML 固定 section | 用户写出的字段覆盖该字段；没有写出的字段保留发行版预设。 |
| 数组 `rules`／`keymap`／`previewers` 等 | 写整个基础数组就替换该基础数组；不是按下标逐项修补。 |
| `prepend_*`／基础数组／`append_*` | 通常组成“前置 → 基础 → 后置”，随后按各规则的匹配逻辑使用。 |
| open、previewer、spotter 的通配兜底 | `append_*` 中的 `url="*"`／`"*/"` 会使基础数组中同类通配兜底移除；并非永远被预设兜底挡住。前置的通配兜底也会压掉基础对应兜底。 |
| keymap | 每层单独混合。源码去重／遮蔽使用按键序列的前两键；前置同前两键遮蔽基础规则，后置与基础同前两键被过滤。然后过滤不适用平台及 `noop`。因此不要把三键以上序列当作完全独立的冲突空间。 |
| opener 名称表 | 新名称加入；重写现有名称的数组替换该名称下全部命令，不是前后追加那个 opener 的命令。其他名称保留。 |
| theme 与 flavor | 选暗／亮预设 → 选中的 `flavor.toml` → 用户 `theme.toml`。用户优先于 flavor，flavor 优先于预设。 |
| 一个 `Style` 值 | 用户的样式表替换这个完整样式值，不是将每个 `fg`／`bold` 独立递归补齐；例如重写 `cwd={fg="red"}` 不自动继承被替换样式内的其他属性。 |
| icon 精确名称表 | 同名优先级为前置 > 基础 > 后置；与 glob／condition 的线性首命中规则不同。 |
| filetype 样式 | 本 tag 只有 `rules`，没有 `prepend_rules`／`append_rules`。要改其数组必须重写。 |

没有自动加载 `keymap-foo.toml`、`theme-foo.toml` 或当前项目中的第二份主配置文件的机制。所谓“多份主题”，是用户主题与其选中的 flavor 再加内置预设；所谓“按键混合”，是同一文件各层的三个数组，不是自动搜集多个按键文件。[D1][D3][D8][S2][S12][S13][S17][S18][S23]

## 2. `yazi.toml`：浏览、预览和任务行为

`[single-source]` 本节完整固定键集合来自 tag 的配置结构与 `yazi-default.toml`。文档用于解释体验，源码补齐漏项与数值边界。[D2][S3][S6][S7][S8][S9][S10]

### 2.1 浏览文件：`mgr`

| 完整键路径 | 允许值／类型 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `mgr.ratio` | 3 个 `u16` 整数，各 0–65535；至少一项非零。安全使用时保持三者总和不超过 `u16` 容量。 | `[1, 4, 3]` | 父目录／当前目录／预览各占 1/8、4/8、3/8；某项 0 隐藏对应面板。总和是源码 `u16` 加法，不要把单项类型上限误当作安全布局推荐。 |
| `mgr.sort_by` | `"none"`、`"mtime"`、`"btime"`、`"extension"`、`"alphabetical"`、`"natural"`、`"size"`、`"random"` | `"alphabetical"` | 不排序、修改时间、创建时间、扩展名、字典序、自然数值序、大小或随机。字典序 `1 < 10 < 2`，自然序 `1 < 2 < 10`。 |
| `mgr.sort_sensitive` | bool | `false` | 主排序是否区分大小写。 |
| `mgr.sort_reverse` | bool | `false` | 反向排序；仍先处理目录优先分组。 |
| `mgr.sort_dir_first` | bool | `true` | 排序时目录放在普通文件之前；`sort_by="none"` 不调用排序，不因此强制重新分组。 |
| `mgr.sort_translit` | bool | `false` | 自然排序时把带变音符等字符转写，例如 `Â→A`。 |
| `mgr.sort_fallback` | `"alphabetical"`、`"natural"` | `"alphabetical"` | 时间、大小、扩展名等相同时，用文件名字典序／自然序破同值；此处不采用主排序的大小写忽略和转写设置，但会跟随 reverse。[S22] |
| `mgr.linemode` | 非空字符串；源码按 UTF-8 字节长度限制 1–20。内置 `"none"`、`"size"`、`"btime"`、`"mtime"`、`"permissions"`、`"owner"`；自定义名称需 Lua UI 实现。 | `"none"` | 列表右侧显示大小、时间、权限或所有者；权限／所有者仅 Unix；目录大小当前通常随 size 排序计算。 |
| `mgr.show_hidden` | bool | `false` | 是否显示隐藏文件。 |
| `mgr.show_symlink` | bool | `true` | 链接名后是否显示目标路径。 |
| `mgr.scrolloff` | `u8`，0–255 | `5` | 移动光标时上下保留几行；超过可见高度的一半时近似居中。 |
| `mgr.mouse_events` | 字符串数组，每项是 `"click"`、`"scroll"`、`"touch"`、`"move"`、`"drag"`；空数组可用 | `["click", "scroll", "drag"]` | 点击、垂直滚动、水平滚动、移动、拖动是否送入插件系统；`[]` 禁用鼠标。终端不支持拖动时，配置本身不能补出支持。 |

### 2.2 看内容：`preview`

| 完整键路径 | 允许值／类型 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `preview.wrap` | `"no"`、`"yes"` | `"no"` | 代码预览长行是否折行。 |
| `preview.tab_size` | `u8`，0–255 | `2` | 预览中的 tab 显示为几格空格。源码没有强制至少 1。 |
| `preview.max_width` | `u16`，0–65535 | `600` | 图像预览／预加载最大像素宽；越大越耗 CPU 和缓存空间。文档要求改后执行 `ya cache clear`，本文没有执行。 |
| `preview.max_height` | `u16`，0–65535 | `900` | 图像预览／预加载最大像素高；同上。 |
| `preview.cache_dir` | 路径字符串；文档建议空串或绝对路径；tag 的 `sanitize_path` 实际可展开变量／`~` 并将相对路径绝对化 | `""` → 运行时临时目录下 `yazi-<uid>` | 空串用临时缓存；指定稳定绝对路径可持久缓存。不是 `XDG_CACHE_HOME/yazi` 这个包缓存目录。本机 `/tmp` 是否为临时根取决于进程临时目录环境，未实测。 |
| `preview.image_delay` | 整数 0–100 毫秒 | `30` | 快速上下移动时延后发图，减轻终端忙于绘图造成的卡顿；设小更及时，设大更缓冲。 |
| `preview.image_filter` | 字符串；文档 `"nearest"`、`"triangle"`、`"catmull-rom"`、`"lanczos3"`；Rust 图像适配器另支持 `"gaussian"` | `"triangle"` | 缩小图片的速度／质量取舍；文档顺序为 nearest 到 lanczos3，由快／粗到慢／细。未知字符串在 Rust 适配器回退 triangle，不意味着所有插件都有相同回退。[S27] |
| `preview.image_quality` | 整数 50–90 | `75` | 预缓存 JPEG 质量；高值通常更慢、更大；带 alpha 图像在已读适配器使用 PNG，此 JPEG 参数不直接控制它。[S27] |
| `preview.ueberzug_scale` | `f32` 数字；源码未增加正值范围校验 | `1` | Überzug 后端的图像缩放补偿；>1 放大、<1 缩小。正常设置应依据实际缩放问题，不把未校验负值当成推荐用法。 |
| `preview.ueberzug_offset` | 四个 `f32` 数字 `[x,y,width,height]`，按字符格偏移 | `[0, 0, 0, 0]` | 修正 Überzug 图像位置、宽高偏差，例如半格偏移。它与弹窗 Offset 的整数／高度约束不同。 |

`[single-source]` 配置根环境变量不展开路径，但上述 cache_dir、SFTP 文件路径、syntect_theme 走 `sanitize_path`：可以展开 Unix `$VAR`／`${VAR}`、Windows `%VAR%`、`~`；普通相对路径也会按 Yazi CWD 绝对化。**这是源码与“必须绝对路径”文档表述的差别，不是建议依赖 CWD 的配置方式**。为可移植和可预期，仍建议显式绝对路径或 `~/...`。[S24]

### 2.3 怎样打开文件：`opener` 与 `open`

先定义“能怎么开”的命令组，再定义“什么文件用哪个组”。opener 是任意名称到命令数组的映射，不只有 `edit`、`open`、`play`。[D2#opener][S29]

| 完整键路径 | 允许值／类型 | 省略时／默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `opener.<name>` | 命令表数组；名称为字符串 | 内置 `edit`、`play`、`open`、`reveal`、`extract`、`download`、`trash`，完整命令见下表 | 给某类操作一组可选择命令；同名自定义数组整体替换原组。 |
| `opener.<name>[].run` | 非空命令模板字符串，支持下列格式占位符 | 必填，无字段默认 | 真正启动的命令；不是 Yazi 内置动作字符串。 |
| `opener.<name>[].block` | bool | `false` | 暂时让出 Yazi 界面，终端程序接管前台，退出后返回；用于编辑器等交互程序。 |
| `opener.<name>[].orphan` | bool | `false` | 脱离任务调度，Yazi 退出后也可继续运行；不能把它理解为 block 的别名。 |
| `opener.<name>[].desc` | 字符串 | `""`；展示时回退 run 的首个空白分词 | “Open with”等菜单标签。 |
| `opener.<name>[].for` | `"all"`、`"linux"`、`"macos"`、`"windows"`、`"android"`、`"unix"`；all 由源码补齐 | `"all"` | 仅在选定平台保留该命令；unix 包括 Linux、macOS、Android。 |
| `open.rules` | 开启规则数组 | 下方 10 条规则 | 全部重写文件类型→opener 的映射。 |
| `open.prepend_rules` | 同 `rules` | `[]` | 优先覆盖少数文件类型，保留其余默认规则。 |
| `open.append_rules` | 同 `rules` | `[]` | 补规则／兜底；通配兜底对默认通配有特别处理，见 1.4。 |
| `open.<规则数组>[].url` | glob 字符串，可省略，但与 mime 至少一个存在 | 无匹配器默认 | 按文件 URL 匹配；末尾 `/` 限定目录；`*` 是所有非目录文件，`*/` 是目录。 |
| `open.<规则数组>[].mime` | MIME glob 字符串；与 url 同时写时两者都必须匹配 | 无匹配器默认 | 按文件内容类型选打开方式。 |
| `open.<规则数组>[].use` | opener 名称字符串或字符串数组 | 必填，无字段默认 | 普通 open 用各组可用命令里的第一条；interactive 展示合并的可用命令。多个选中文件会寻找共同可用的 opener。[S30] |

`<规则数组>` 在此精确表示 `rules`、`prepend_rules`、`append_rules`，各元素字段完全相同。selector 不支持仅凭空表“全部匹配”，必须至少有 `url` 或 `mime`。[S11]

命令模板占位符（N 从 1 开始）：`%s`／`%S` 是全部选中文件的路径／URL；`%sN`／`%SN` 是第 N 项；`%d`／`%D` 是全部父目录路径／URL；`%dN`／`%DN` 是第 N 项父目录；`%%` 是字面 `%`。不要照搬旧 `$@`、`$1` 示例当作本版本推荐语法。[D2#opener]

最小例子：

```toml
[opener]
edit = [{ run = "nvim %s", block = true, for = "unix", desc = "Edit" }]

[open]
prepend_rules = [{ url = "*.json", use = "edit" }]
```

glob 默认忽略大小写；前缀 `\s` 切换敏感，在 TOML 可写为字面单引号字符串 `'\s*.JSON'`，或双引号内转义成 `"\\s*.JSON"`。大括号表达式如 `"{audio,video}/*"` 匹配两种类型。带路径分隔符的 glob 按路径边界匹配，`**` 可跨目录。[D2#open][S11]

#### 完整内置 opener 命令

下表保留每条 run 的精确默认值；未写 block／orphan 即 false，未写 for 即 all。[S3]

| 名称 | 平台 | `run` 默认模板 | block | orphan | `desc` 默认 |
| --- | --- | --- | --- | --- | --- |
| edit | unix | `${EDITOR:-vi} %s` | true | false | `$EDITOR` |
| edit | windows | `code %s` | false | true | `code` |
| edit | windows | `code -w %s` | true | false | `code (block)` |
| play | linux | `xdg-open %s1` | false | true | `Play` |
| play | macos | `open %s` | false | false | `Play` |
| play | windows | `start "" %s1` | false | true | `Play` |
| play | android | `termux-open %s1` | false | false | `Play` |
| play | unix | `mediainfo %s1; echo 'Press enter to exit'; read _` | true | false | `Show media info` |
| play | windows | `mediainfo %s1 & pause` | true | false | `Show media info` |
| open | linux | `xdg-open %s1` | false | false | `Open` |
| open | macos | `open %s` | false | false | `Open` |
| open | windows | `start "" %s1` | false | true | `Open` |
| open | android | `termux-open %s1` | false | false | `Open` |
| reveal | linux | `xdg-open %d1` | false | false | `Reveal` |
| reveal | macos | `open -R %s1` | false | false | `Reveal` |
| reveal | windows | `explorer /select,%s1` | false | true | `Reveal` |
| reveal | android | `termux-open %d1` | false | false | `Reveal` |
| reveal | unix | `clear; exiftool %s1; echo 'Press enter to exit'; read _` | true | false | `Show EXIF` |
| extract | all | `ya pub extract --list %s` | false | false | `Extract here` |
| download | all | `ya emit download --open %S` | false | false | `Download and open` |
| download | all | `ya emit download %S` | false | false | `Download` |
| trash | all | `ya pub trash-restore --list %S` | false | false | `Restore selected files` |
| trash | all | `ya pub trash-empty --list %S` | false | false | `Empty trash bin` |

这些命令依赖相应外部程序是否存在；报告列出预设不等于已经在本机验证 mpv、code、xdg-open、mediainfo 或 exiftool。

#### 完整内置 `open.rules`，按顺序

| 匹配键 | 默认 pattern | 默认 use | 体验 |
| --- | --- | --- | --- |
| mime | `folder/*` | `["edit", "open", "reveal"]` | 目录可交编辑器、系统打开或定位。 |
| mime | `text/*` | `["edit", "reveal"]` | 文本优先编辑。 |
| mime | `image/*` | `["open", "reveal"]` | 图片走系统打开。 |
| mime | `{audio,video}/*` | `["play", "reveal"]` | 音视频优先 play。 |
| mime | `application/{json,ndjson,javascript,wine-extension-ini}` | `["edit", "reveal"]` | 代码／配置内容优先编辑。 |
| mime | `application/{zip,rar,7z*,tar,gzip,xz,zstd,bzip*,lzma,compress,archive,cpio,arj,xar,ms-cab*}` | `["extract", "reveal"]` | 压缩包优先解压。 |
| mime | `inode/empty` | `["edit", "reveal"]` | 空文件可编辑。 |
| mime | `vfs/{absent,stale}` | `"download"` | 未下载／过期虚拟文件提供下载。 |
| mime | `trash/**` | `["open", "trash"]` | 回收站对象提供打开、恢复／清空。 |
| url | `*` | `["open", "reveal"]` | 其他非目录文件的兜底。 |

### 2.4 后台工作：`tasks`

| 完整键路径 | 允许值／类型 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `tasks.file_workers` | 1–255 的非零整数 | `3` | 同时执行的复制、剪切、删除等文件操作数。 |
| `tasks.plugin_workers` | 1–255 | `5` | 同时执行的功能插件任务数。 |
| `tasks.fetch_workers` | 1–255 | `5` | 同时执行元数据获取任务数。 |
| `tasks.preload_workers` | 1–255 | `2` | 同时执行预加载数。 |
| `tasks.process_workers` | 1–255 | `5` | 同时启动／运行的进程任务数。 |
| `tasks.bizarre_retry` | 1–255；不是可设为 0 的整数 | `3` | 异常失败的最大重试次数。 |
| `tasks.image_alloc` | `u32`，0–4294967295，字节；0 不限 | `536870912`（512 MiB） | 限制解码单张图像的内存；降低可阻止超大图耗尽内存，但可能无法预览。 |
| `tasks.image_bound` | 两个 `u16`，各 0–65535，像素；每个维度 0 不限 | `[10000, 10000]` | 限制解码图像宽高，与预览缩图 max_width／max_height 不同。 |
| `tasks.suppress_preload` | bool | `false` | true 隐藏系统预加载任务、不报告其进度、退出确认不计它们；不等于禁用预加载。 |

提高 worker 数可能让更多工作并发，但不是无条件更快；外部工具、磁盘和终端仍会争用资源。这是调度行为的推断，本文没有跑性能基准。

### 2.5 内容处理规则：`plugin`

| 完整键路径 | 允许值／类型 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `plugin.fetchers` | Fetcher 规则数组，混合后最多 16 条 | 下方 4 条 | 获取 MIME 等元数据；同 group 只运行首个匹配项。 |
| `plugin.prepend_fetchers` | 同 fetchers | `[]` | 先于默认获取规则匹配。 |
| `plugin.append_fetchers` | 同 fetchers | `[]` | 在默认之后补获取规则。 |
| `plugin.preloaders` | Preloader 数组，混合后最多 16 条 | 下方 8 条 | 预先准备图片、视频等缓存。 |
| `plugin.prepend_preloaders` | 同 preloaders | `[]` | 先匹配自定义预加载。 |
| `plugin.append_preloaders` | 同 preloaders | `[]` | 后补预加载。 |
| `plugin.previewers` | Previewer 规则数组 | 下方 22 条 | 当前悬停文件在预览面板如何呈现。真实键是 previewers，不是 previews。 |
| `plugin.prepend_previewers` | 同 previewers | `[]` | 优先处理特定类型。 |
| `plugin.append_previewers` | 同 previewers | `[]` | 补充／替换通配兜底。 |
| `plugin.spotters` | Spotter 规则数组 | 下方 13 条 | Tab 文件信息页如何展示。 |
| `plugin.prepend_spotters` | 同 spotters | `[]` | 优先用自定义信息展示器。 |
| `plugin.append_spotters` | 同 spotters | `[]` | 补充／替换信息页兜底。 |

所有以上规则元素支持 `url`／`mime` selector 和 `run`；selector 至少写一个，同时写要求同时匹配。`run` 是非空的插件命令字符串，可带入口如 `mime.local` 以及 shell-style 参数；不是 `opener.run` 的系统 Shell 模板。[S10][S11][S31]

| 完整元素键路径 | 允许值／类型 | 省略默认 | 体验 |
| --- | --- | --- | --- |
| `plugin.<规则数组>[].url` | glob 字符串 | 无；与 mime 至少一个必填 | 按 URL／目录匹配。 |
| `plugin.<规则数组>[].mime` | MIME glob 字符串 | 无；与 url 至少一个必填 | 按内容类型匹配。 |
| `plugin.<规则数组>[].run` | 插件命令字符串 | 必填 | 调用指定插件／子入口及其参数。 |
| `plugin.<fetcher数组>[].prio` | `"low"`、`"normal"`、`"high"` | `"normal"` | 调度优先级，不改变 selector 命中次序。 |
| `plugin.<fetcher数组>[].group` | 字符串 | 必填，没有 serde 默认 | 同组只保留第一个匹配 fetcher；MIME 系统使用 `"mime"` 组。 |
| `plugin.<preloader数组>[].prio` | `"low"`、`"normal"`、`"high"` | `"normal"` | 预加载任务优先级。 |
| `plugin.<preloader数组>[].next` | bool | `false` | true 匹配并运行后继续找下一条，false 停止；不等于后台异步开关。 |

`<规则数组>` 表示本节上表全部 12 个数组键；`<fetcher数组>` 表示 fetchers 及其前后置两个数组，`<preloader数组>` 同理。previewer／spotter 没有 prio 或 next。getter 使用首个匹配 previewer／spotter；fetcher 受组限制，preloader 受 next 限制，所以四种规则不能简单视为全部同时执行。[S10]

```toml
[plugin]
prepend_previewers = [{ url = "*.raf", run = "raf" }]
prepend_preloaders = [{ mime = "image/heic", run = "heic", prio = "high" }]
```

只有安装／提供了相应插件，上述自定义名称才可运行；这个示例不创建任何插件或假后备实现。

#### 四类插件的完整默认规则

每个数组各自从上到下匹配；以下不是文档里的简化示例，而是 tag 的全部预设规则。[S3]

**`plugin.fetchers`**

| 序号 | 完整默认规则 |
| --- | --- |
| 1 | `{ url = "*/", run = "mime.dir", prio = "high", group = "mime" }` |
| 2 | `{ url = "local://*", run = "mime.local", prio = "high", group = "mime" }` |
| 3 | `{ url = "trash://*", run = "mime.trash", prio = "high", group = "mime" }` |
| 4 | `{ url = "remote://*", run = "mime.remote", prio = "high", group = "mime" }` |

**`plugin.spotters`**

| 序号 | 完整默认规则 |
| --- | --- |
| 1 | `{ mime = "multi/*", run = "multi" }` |
| 2 | `{ mime = "folder/*", run = "folder" }` |
| 3 | `{ mime = "text/*", run = "code" }` |
| 4 | `{ mime = "application/{mbox,javascript,wine-extension-ini}", run = "code" }` |
| 5 | `{ mime = "image/{avif,hei?,jxl}", run = "magick" }` |
| 6 | `{ mime = "image/svg+xml", run = "svg" }` |
| 7 | `{ mime = "image/*", run = "image" }` |
| 8 | `{ mime = "video/*", run = "video" }` |
| 9 | `{ mime = "vfs/*", run = "vfs" }` |
| 10 | `{ mime = "trash/**", run = "trash" }` |
| 11 | `{ mime = "null/*", run = "null" }` |
| 12 | `{ url = "*", run = "file" }` |
| 13 | `{ url = "*/", run = "file" }` |

**`plugin.preloaders`**

| 序号 | 完整默认规则 |
| --- | --- |
| 1 | `{ mime = "image/{avif,hei?,jxl}", run = "magick" }` |
| 2 | `{ mime = "image/svg+xml", run = "svg" }` |
| 3 | `{ mime = "image/*", run = "image" }` |
| 4 | `{ mime = "video/*", run = "video" }` |
| 5 | `{ mime = "application/pdf", run = "pdf" }` |
| 6 | `{ mime = "font/*", run = "font" }` |
| 7 | `{ mime = "application/ms-opentype", run = "font" }` |
| 8 | `{ mime = "trash/**", run = "trash" }` |

**`plugin.previewers`**

| 序号 | 完整默认规则 |
| --- | --- |
| 1 | `{ mime = "folder/*", run = "folder" }` |
| 2 | `{ mime = "text/*", run = "code" }` |
| 3 | `{ mime = "application/{mbox,javascript,wine-extension-ini}", run = "code" }` |
| 4 | `{ mime = "application/{json,ndjson}", run = "json" }` |
| 5 | `{ mime = "image/{avif,hei?,jxl}", run = "magick" }` |
| 6 | `{ mime = "image/svg+xml", run = "svg" }` |
| 7 | `{ mime = "image/*", run = "image" }` |
| 8 | `{ mime = "video/*", run = "video" }` |
| 9 | `{ mime = "application/pdf", run = "pdf" }` |
| 10 | `{ mime = "application/{zip,rar,7z*,tar,gzip,xz,zstd,bzip*,lzma,compress,archive,cpio,arj,xar,ms-cab*}", run = "archive" }` |
| 11 | `{ mime = "application/{debian*-package,redhat-package-manager,rpm,android.package-archive}", run = "archive" }` |
| 12 | `{ url = "*.{AppImage,appimage}", run = "archive" }` |
| 13 | `{ mime = "application/{iso9660-image,qemu-disk,ms-wim,apple-diskimage}", run = "archive" }` |
| 14 | `{ mime = "application/virtualbox-{vhd,vhdx}", run = "archive" }` |
| 15 | `{ url = "*.{img,fat,ext,ext2,ext3,ext4,squashfs,ntfs,hfs,hfsx}", run = "archive" }` |
| 16 | `{ mime = "font/*", run = "font" }` |
| 17 | `{ mime = "application/ms-opentype", run = "font" }` |
| 18 | `{ mime = "inode/empty", run = "empty" }` |
| 19 | `{ mime = "vfs/*", run = "vfs" }` |
| 20 | `{ mime = "trash/**", run = "trash" }` |
| 21 | `{ mime = "null/*", run = "null" }` |
| 22 | `{ url = "*", run = "file" }` |

### 2.6 弹窗位置和标题：`input`、`confirm`、`pick`

这些设置不改变按键；只改变操作弹窗的标题和区域。[D2#input][S9]

- `Origin` 全部枚举：`"top-left"`、`"top-center"`、`"top-right"`、`"bottom-left"`、`"bottom-center"`、`"bottom-right"`、`"center"`、`"hovered"`。
- `Offset` 是 `[x, y, width, height]`：x、y 为 -32768–32767 的整数，width 为 0–32767，height 为 3–32767。四个数先按 `i16` 读取；宽不能负，高至少 3。不是浮点值。最终区域仍受终端尺寸限制。[D6][S32]
- `input.create_title`／`find_title`／`shell_title` 是两元素字符串数组，分别对应创建文件／目录、向前／向后查找、普通／阻塞 Shell；其他 title 是单个字符串。
- `search_title` 的 `{n}` 替换搜索引擎名；confirm 的 trash／delete／quit 标题通过 `{n}` 替换数量、`{s}` 替换复数字尾。标题字符串可改为中文。[D2#input][S9]

| 完整键路径 | 类型／允许值 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `input.cursor_blink` | bool | `false` | 输入框光标是否闪烁。 |
| `input.cd_title` | string | `"Change directory:"` | 输入目标目录的标题文本。 |
| `input.cd_origin` | Origin | `"top-center"` | 输入目标目录的锚点位置。 |
| `input.cd_offset` | Offset | `[ 0, 2, 50, 3 ]` | 输入目标目录的位置偏移与弹窗宽高。 |
| `input.create_title` | [string,string] | `[ "Create:", "Create (dir):" ]` | 创建文件／目录的标题文本。 |
| `input.create_origin` | Origin | `"top-center"` | 创建文件／目录的锚点位置。 |
| `input.create_offset` | Offset | `[ 0, 2, 50, 3 ]` | 创建文件／目录的位置偏移与弹窗宽高。 |
| `input.rename_title` | string | `"Rename:"` | 重命名悬停文件的标题文本。 |
| `input.rename_origin` | Origin | `"hovered"` | 重命名悬停文件的锚点位置。 |
| `input.rename_offset` | Offset | `[ 0, 1, 50, 3 ]` | 重命名悬停文件的位置偏移与弹窗宽高。 |
| `input.filter_title` | string | `"Filter:"` | 过滤当前列表的标题文本。 |
| `input.filter_origin` | Origin | `"top-center"` | 过滤当前列表的锚点位置。 |
| `input.filter_offset` | Offset | `[ 0, 2, 50, 3 ]` | 过滤当前列表的位置偏移与弹窗宽高。 |
| `input.find_title` | [string,string] | `[ "Find next:", "Find previous:" ]` | 向下／向上定位名称的标题文本。 |
| `input.find_origin` | Origin | `"top-center"` | 向下／向上定位名称的锚点位置。 |
| `input.find_offset` | Offset | `[ 0, 2, 50, 3 ]` | 向下／向上定位名称的位置偏移与弹窗宽高。 |
| `input.search_title` | string | `"Search via {n}:"` | 通过指定引擎搜索的标题文本。 |
| `input.search_origin` | Origin | `"top-center"` | 通过指定引擎搜索的锚点位置。 |
| `input.search_offset` | Offset | `[ 0, 2, 50, 3 ]` | 通过指定引擎搜索的位置偏移与弹窗宽高。 |
| `input.shell_title` | [string,string] | `[ "Shell:", "Shell (block):" ]` | 运行普通／前台 Shell 命令的标题文本。 |
| `input.shell_origin` | Origin | `"top-center"` | 运行普通／前台 Shell 命令的锚点位置。 |
| `input.shell_offset` | Offset | `[ 0, 2, 50, 3 ]` | 运行普通／前台 Shell 命令的位置偏移与弹窗宽高。 |

| 完整键路径 | 类型／允许值 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `confirm.trash_title` | string | `"Trash {n} selected file{s}?"` | 移到回收站确认的标题。 |
| `confirm.trash_origin` | Origin | `"center"` | 移到回收站确认的锚点。 |
| `confirm.trash_offset` | Offset | `[ 0, 0, 70, 20 ]` | 移到回收站确认的区域。 |
| `confirm.delete_title` | string | `"Permanently delete {n} selected file{s}?"` | 永久删除确认的标题。 |
| `confirm.delete_origin` | Origin | `"center"` | 永久删除确认的锚点。 |
| `confirm.delete_offset` | Offset | `[ 0, 0, 70, 20 ]` | 永久删除确认的区域。 |
| `confirm.overwrite_title` | string | `"Overwrite file?"` | 覆盖已有文件确认的标题。 |
| `confirm.overwrite_body` | string | `"Will overwrite the following file:"` | 覆盖已有文件确认的正文。 |
| `confirm.overwrite_origin` | Origin | `"center"` | 覆盖已有文件确认的锚点。 |
| `confirm.overwrite_offset` | Offset | `[ 0, 0, 50, 15 ]` | 覆盖已有文件确认的区域。 |
| `confirm.quit_title` | string | `"Quit?"` | 未完成任务时退出确认的标题。 |
| `confirm.quit_body` | string | `"There are unfinished tasks, quit anyway?\n(Open task manager with default key 'w')"` | 未完成任务时退出确认的正文。 |
| `confirm.quit_origin` | Origin | `"center"` | 未完成任务时退出确认的锚点。 |
| `confirm.quit_offset` | Offset | `[ 0, 0, 50, 15 ]` | 未完成任务时退出确认的区域。 |

trash／delete 没有可配置的 `_body` 字段。输入框的 tab 重命名弹窗也没有 `input.tab_rename_*` 配置键，源码固定使用 `Rename tab:`、top-center、`[0,2,50,3]`。[S9]

| 完整键路径 | 类型／允许值 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `pick.open_title` | string | `"Open with:"` | 选择打开程序的标题。 |
| `pick.open_origin` | Origin | `"hovered"` | 选项框靠悬停文件定位。 |
| `pick.open_offset` | Offset | `[0, 1, 50, 7]` | 宽度及最大高度；选项少时源码缩到选项数加边框，不强制占满 7 行。 |

### 2.7 连续按键提示的排序：`which`

| 完整键路径 | 类型／允许值 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `which.sort_by` | `"none"`、`"key"`、`"desc"` | `"none"` | 候选键按配置顺序、键或描述排序。 |
| `which.sort_sensitive` | bool | `false` | 候选排序是否区分大小写。 |
| `which.sort_reverse` | bool | `false` | 反转候选排序。 |
| `which.sort_translit` | bool | `false` | 候选排序转写带变音符等字符。 |

这是 `yazi.toml` 的候选行为；列数、颜色和分隔符属于 `theme.toml` 的 which，见外观节。

## 3. `keymap.toml`：八个界面的按键

`[single-source]` 全部层是 `mgr`、`tasks`、`spot`、`pick`、`input`、`confirm`、`cmp`、`help`。没有可配置的 which／notify 按键层。[D3][S13]

### 3.1 每层的完整数组键

| 完整键路径 | 类型／允许值 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `mgr.keymap` | Keybinding 表数组 | 本节 3.4 的 文件列表默认绑定；完整上游 on/run/desc 见 [S4] | 整体重写此界面的绑定。 |
| `mgr.prepend_keymap` | 同 keymap | `[]` | 优先绑定／遮蔽默认绑定。 |
| `mgr.append_keymap` | 同 keymap | `[]` | 后补不冲突的绑定。 |
| `tasks.keymap` | Keybinding 表数组 | 本节 3.4 的 后台任务列表默认绑定；完整上游 on/run/desc 见 [S4] | 整体重写此界面的绑定。 |
| `tasks.prepend_keymap` | 同 keymap | `[]` | 优先绑定／遮蔽默认绑定。 |
| `tasks.append_keymap` | 同 keymap | `[]` | 后补不冲突的绑定。 |
| `spot.keymap` | Keybinding 表数组 | 本节 3.4 的 文件信息页默认绑定；完整上游 on/run/desc 见 [S4] | 整体重写此界面的绑定。 |
| `spot.prepend_keymap` | 同 keymap | `[]` | 优先绑定／遮蔽默认绑定。 |
| `spot.append_keymap` | 同 keymap | `[]` | 后补不冲突的绑定。 |
| `pick.keymap` | Keybinding 表数组 | 本节 3.4 的 打开方式等选择菜单默认绑定；完整上游 on/run/desc 见 [S4] | 整体重写此界面的绑定。 |
| `pick.prepend_keymap` | 同 keymap | `[]` | 优先绑定／遮蔽默认绑定。 |
| `pick.append_keymap` | 同 keymap | `[]` | 后补不冲突的绑定。 |
| `input.keymap` | Keybinding 表数组 | 本节 3.4 的 创建、重命名、路径等输入框默认绑定；完整上游 on/run/desc 见 [S4] | 整体重写此界面的绑定。 |
| `input.prepend_keymap` | 同 keymap | `[]` | 优先绑定／遮蔽默认绑定。 |
| `input.append_keymap` | 同 keymap | `[]` | 后补不冲突的绑定。 |
| `confirm.keymap` | Keybinding 表数组 | 本节 3.4 的 删除、覆盖、退出确认默认绑定；完整上游 on/run/desc 见 [S4] | 整体重写此界面的绑定。 |
| `confirm.prepend_keymap` | 同 keymap | `[]` | 优先绑定／遮蔽默认绑定。 |
| `confirm.append_keymap` | 同 keymap | `[]` | 后补不冲突的绑定。 |
| `cmp.keymap` | Keybinding 表数组 | 本节 3.4 的 路径／命令补全菜单默认绑定；完整上游 on/run/desc 见 [S4] | 整体重写此界面的绑定。 |
| `cmp.prepend_keymap` | 同 keymap | `[]` | 优先绑定／遮蔽默认绑定。 |
| `cmp.append_keymap` | 同 keymap | `[]` | 后补不冲突的绑定。 |
| `help.keymap` | Keybinding 表数组 | 本节 3.4 的 帮助与按键清单默认绑定；完整上游 on/run/desc 见 [S4] | 整体重写此界面的绑定。 |
| `help.prepend_keymap` | 同 keymap | `[]` | 优先绑定／遮蔽默认绑定。 |
| `help.append_keymap` | 同 keymap | `[]` | 后补不冲突的绑定。 |

### 3.2 单条绑定的完整字段

下面 `<layer>` 为八层之一，`<数组>` 为 keymap／prepend_keymap／append_keymap。数组元素没有叫 `key` 或 `or` 的字段：真实触发字段是 **`on`**。[S13]

| 完整元素键路径 | 类型／允许格式 | 默认值 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `<layer>.<数组>[].on` | 单键字符串，或非空字符串数组（按顺序输入的键）；不能空数组 | 必填 | 单键还是连续组合键，如 `"<C-a>"`、`["g","d"]`。 |
| `<layer>.<数组>[].run` | 动作字符串或动作字符串数组；动作名非空，命令按 shell-style 分词 | 必填 | 一个或多个依次触发的 Yazi 动作；不是任意系统命令，系统命令要经过 `shell`。 |
| `<layer>.<数组>[].desc` | string | `""`；展示时回退 run | which／help 等菜单的说明；不是操作执行条件。 |
| `<layer>.<数组>[].for` | `"all"`、`"linux"`、`"macos"`、`"windows"`、`"android"`、`"unix"` | `"all"` | 仅指定平台的绑定有效。 |

可用特殊键全部为 `<Space>`、`<Backspace>`、`<Enter>`、`<Left>`、`<Right>`、`<Up>`、`<Down>`、`<Home>`、`<End>`、`<PageUp>`、`<PageDown>`、`<Tab>`、`<Delete>`、`<Insert>`、`<F1>`–`<F19>`、`<Esc>`。普通字符直接写 `a`、`A`、`.`、`/` 等。修饰键为 `S-`（Shift）、`C-`（Ctrl）、`A-`（Alt／Meta）、`D-`（Super／Command／Windows），可以组合，例如 `<C-S-b>`／`<C-B>`、`<S-Tab>`。[D3#notation][S13]

不要写 `on="gg"` 代替 `["g","g"]`：源码对非尖括号字符串取首字符，而非多键序列。旧终端协议还可能把 Tab 与 Ctrl-i、Enter 与 Ctrl-m 当成同一个键；区分它们或使用 Super 修饰键需要终端的 CSI u 支持。macOS 的 Option 是否映射 Alt 取决于终端设置。[D3#notation]

```toml
[mgr]
prepend_keymap = [
  { on = ["g", "d"], run = "cd ~/Downloads", desc = "Downloads", for = "unix" },
  { on = "<C-a>", run = ["toggle_all --state=on", "arrow top"], desc = "Select all" },
]
```

也可以写 `[[mgr.prepend_keymap]]` 形式。不要对同一个完整 TOML 键同时使用互相冲突的内联数组与 array-of-tables 定义；参考页特别提醒不要混用它展示的两类定义风格。[D3]

### 3.3 `run` 的命令空间与体验

八层有各自的动作空间；可以加 `layer:` 指定另一层，例如 `tasks:show`、`input:close --submit`。动作数组按列出的次序发送，并不自动变成一个 Shell 脚本。[S31]

| 层 | 官方参考中的全部动作名称 | 典型用途和参数格式 |
| --- | --- | --- |
| mgr | `escape`、`quit`、`close`、`suspend`、`arrow`、`leave`、`enter`、`back`、`forward`、`seek`、`spot`、`cd`、`follow`、`reveal`、`toggle`、`toggle_all`、`visual_mode`、`open`、`yank`、`unyank`、`paste`、`link`、`hardlink`、`remove`、`create`、`rename`、`copy`、`shell`、`hidden`、`linemode`、`search`、`find`、`find_arrow`、`filter`、`sort`、`tab_create`、`tab_close`、`tab_switch`、`tab_swap`、`help`、`plugin`、`noop` | 浏览、选择、打开、文件操作、搜索、标签。 |
| tasks | `show`、`close`、`arrow`、`inspect`、`cancel`、`help`、`plugin`、`noop` | 显示／隐藏任务，查看错误或 stdout/stderr，尝试取消。取消复制不自动删除部分目标文件，这是数据安全设计。 |
| spot | `close`、`arrow`、`swipe`、`copy`、`plugin`、`noop`、`help` | 文件信息页滚动、切换文件；`copy cell` 复制表格单元格。 |
| pick | `close`、`arrow`、`help`、`plugin`、`noop` | 选择打开方式等；`close --submit` 接受。 |
| input | `close`、`escape`、`move`、`backward`、`forward`、`recall`、`insert`、`visual`、`delete`、`yank`、`paste`、`undo`、`redo`、`help`、`backspace`、`kill`、`plugin`、`noop` | Vim-like 模式输入、光标、剪贴与历史。 |
| confirm | `close`、`arrow`、`help` | `close --submit` 确认，普通 close 取消。 |
| cmp | `close`、`arrow`、`help`、`plugin`、`noop` | 补全候选选择；`close --submit` 接受。 |
| help | `close`、`escape`、`arrow`、`plugin`、`noop` | 帮助中滚动、清筛选或关闭。 |

这是官方参考列出的动作名称，不是所有 Lua API。tag 的默认绑定另外真实使用 `mgr:bulk_create`、`mgr:tab_rename`、`input:replace`、`input:casefy`，以及 help 的 `close --submit`；文档有漏项，下方默认绑定保留它们，未按旧参考删掉。[D3][S4]

常见参数的允许值来自官方参考：[D3]

| 动作／参数 | 允许值／格式 | 体验与安全影响 |
| --- | --- | --- |
| `arrow`（多个列表层） | 整数 n、`n%`、`nvp`、`top`、`bot`、`prev`、`next` | 按行、视口比例、视口位置或端点移动；prev／next 会绕到另一端。 |
| `escape`（mgr） | `--all`、`--find`、`--visual`、`--select`、`--filter`、`--search` | 不带参数自动决定取消哪种状态，可指定多个。 |
| `quit`／`close`（mgr） | `--code=[n]`、`--no-cwd-file` | 退出码／是否输出 cwd-file；close 只关当前标签，最后一个标签才退出。 |
| `open` | `--interactive`、`--hovered` | 选程序／忽略已选择项只开悬停项。 |
| `toggle`／`toggle_all` | 不指定、`--state=on`、`--state=off` | 反转、全选／取消。toggle_all 只操作当前目录。 |
| `visual_mode` | 不指定、`--unset` | 选择／取消选择模式。 |
| `yank` | 不指定、`--cut` | 复制／剪切准备状态。 |
| `paste`／`link`／`hardlink` | `--force`、`--follow`；link 另有 `--relative` | force 可以覆盖目标；follow 操作链接指向对象而非链接自身。 |
| `remove` | `--force`、`--permanently`、`--hovered` | force 跳过确认，permanently 永久删除；Android 无回收站，只能永久删除。 |
| `create` | `--dir`、`--force`；目录名末尾 `/`（Unix）或 `\`（Windows） | 强制目录／覆盖现有对象；覆盖可能破坏数据。 |
| `rename` | `--hovered`、`--force`；`--empty=stem/ext/dot_ext/all`；`--cursor=end/start/before_ext` | 指定清空哪部分名字和初始光标，多个选中时批量重命名。 |
| `copy` | `path`、`url`、`dirpath`、`dirurl`、`filename`、`name_without_ext`；`--separator=unix`、`--hovered` | 复制路径、URL 或名称；默认分隔符按平台。 |
| `hidden` | `show`、`hide`、`toggle` | 临时切换隐藏文件显示。 |
| `search` | `--via=fd/rg/rga`、`--args=...` | 按名称、内容或更多文件类型搜索；依赖外部程序。 |
| `find`／`filter` | `--smart`、`--insensitive`；find 另有 `--previous` | 智能大小写／不敏感匹配；查找不等于递归搜索。 |
| `sort` | mgr.sort_by 的八种枚举；`--reverse[=yes/no]`、`--dir-first[=yes/no]`、`--translit[=yes/no]` | 本次会话切换排序。 |
| `tab_create`／`tab_close`／`tab_switch`／`tab_swap` | URL 或数字 n；create 有 `--current`，switch 有 `--relative` | 标签位置从 0 起；相对数可为负。 |
| `backward`／`forward`（input） | `fine`、`lean`、`wide`；forward 可 `--end-of-word` | Vim word、Emacs-like word、空格分隔 WORD。 |
| `move`／`recall`（input） | 有符号整数；move 可 `--in-operating` | 左右移动／前后历史；tag 默认还使用 `bol`、`eol`、`first-char`。 |
| `delete`／`paste`／`backspace`（input） | delete `--cut`、`--insert`；paste `--before`；backspace `--under` | 剪切／进入插入、在光标前粘贴、删除光标下字符。 |
| `kill`（input） | `bol`、`eol`、`backward`、`forward` | 删除行前／行后／前词／后词。 |
| `plugin` | 插件名，后接 shell-style 参数；推荐用 `--` 分开插件参数 | 运行 Lua 功能插件；仅位置参数和 `--name` 命名参数受支持，不要依赖 `-a` 短选项。 |
| `noop` | 单个 `"noop"` 或数组 `["noop"]` | 用前置绑定禁用预设键，并从 which 移除；不是运行空 Shell。 |

`mgr.shell` 可带 `--interactive`、`--block`、`--orphan`、`--cursor=N`。模板支持 `%h/%H`（悬停）、`%s/%S`（选中）、`%d/%D`（父目录）、`%y/%Y`（yanked）、相应的 N-th 版本、`%tX`（下一标签）、`%TX`（上一标签）、`%%`。`shell -- <原始命令>` 可以将剩余字符串作为命令模板，避免多层引号。不要将任意不可信字符串直接拼接到 shell 模板。[D3#mgr.shell]

### 3.4 八层的完整默认绑定（on／run／desc）

以下按 `v26.9.1` 原始顺序逐条转录全部 254 条规则。on、run、desc 三列是精确默认值，体验列是中文解释；所有这些预设绑定都未限定 for，即 all。数组是同一条连续按键或动作，不表示不同规则。来源：[S4]。

#### `mgr` — 文件列表

| 默认 on | 默认 run | 默认 desc | 体验 |
| --- | --- | --- | --- |
| `"<Esc>"` | `"escape"` | `"Exit visual mode, clear selection, or cancel search"` | 退出视觉模式／清选择／取消搜索。 |
| `"<C-[>"` | `"escape"` | `"Exit visual mode, clear selection, or cancel search"` | 退出视觉模式／清选择／取消搜索。 |
| `"q"` | `"quit"` | `"Quit the process"` | 退出。 |
| `"Q"` | `"quit --no-cwd-file"` | `"Quit without outputting cwd-file"` | 退出但不输出工作目录。 |
| `"<C-c>"` | `"close"` | `"Close the current tab, or quit if it's last"` | 关闭标签；最后一个则退出。 |
| `"<C-z>"` | `"suspend"` | `"Suspend the process"` | 挂起到 Shell。 |
| `"k"` | `"arrow prev"` | `"Previous file"` | 上一文件，支持首尾循环。 |
| `"j"` | `"arrow next"` | `"Next file"` | 下一文件，支持首尾循环。 |
| `"<Up>"` | `"arrow prev"` | `"Previous file"` | 上一文件，支持首尾循环。 |
| `"<Down>"` | `"arrow next"` | `"Next file"` | 下一文件，支持首尾循环。 |
| `[ "g", "g" ]` | `"arrow top"` | `"Go to top"` | 首项。 |
| `"G"` | `"arrow bot"` | `"Go to bottom"` | 末项。 |
| `"<Home>"` | `"arrow top"` | `"Go to top"` | 首项。 |
| `"<End>"` | `"arrow bot"` | `"Go to bottom"` | 末项。 |
| `"<C-u>"` | `"arrow -50%"` | `"Move cursor up half page"` | 上半页。 |
| `"<C-d>"` | `"arrow 50%"` | `"Move cursor down half page"` | 下半页。 |
| `"<C-b>"` | `"arrow -100%"` | `"Move cursor up one page"` | 上一页。 |
| `"<C-f>"` | `"arrow 100%"` | `"Move cursor down one page"` | 下一页。 |
| `"<S-PageUp>"` | `"arrow -50%"` | `"Move cursor up half page"` | 上半页。 |
| `"<S-PageDown>"` | `"arrow 50%"` | `"Move cursor down half page"` | 下半页。 |
| `"<PageUp>"` | `"arrow -100%"` | `"Move cursor up one page"` | 上一页。 |
| `"<PageDown>"` | `"arrow 100%"` | `"Move cursor down one page"` | 下一页。 |
| `"h"` | `"leave"` | `"Back to the parent directory"` | 父目录。 |
| `"l"` | `"enter"` | `"Enter the child directory"` | 进入目录。 |
| `"<Left>"` | `"leave"` | `"Back to the parent directory"` | 父目录。 |
| `"<Right>"` | `"enter"` | `"Enter the child directory"` | 进入目录。 |
| `"H"` | `"back"` | `"Back to previous directory"` | 目录历史后退。 |
| `"L"` | `"forward"` | `"Forward to next directory"` | 目录历史前进。 |
| `"<Space>"` | `[ "toggle", "arrow 1" ]` | `"Toggle the current selection state"` | 反转当前选择并下移。 |
| `"<C-a>"` | `"toggle_all --state=on"` | `"Select all files"` | 选择当前目录全部文件。 |
| `"<C-r>"` | `"toggle_all"` | `"Invert selection of all files"` | 反选当前目录全部文件。 |
| `"v"` | `"visual_mode"` | `"Enter visual mode (selection mode)"` | 视觉选择模式。 |
| `"V"` | `"visual_mode --unset"` | `"Enter visual mode (unset mode)"` | 视觉取消选择模式。 |
| `"K"` | `"seek -5"` | `"Seek up 5 units in the preview"` | 预览向上 5 单位。 |
| `"J"` | `"seek 5"` | `"Seek down 5 units in the preview"` | 预览向下 5 单位。 |
| `"<Tab>"` | `"spot"` | `"Spot hovered file"` | 查看文件信息。 |
| `"o"` | `"open"` | `"Open selected files"` | 打开所选文件。 |
| `"O"` | `"open --interactive"` | `"Open selected files interactively"` | 选择打开方式。 |
| `"<Enter>"` | `"open"` | `"Open selected files"` | 打开所选文件。 |
| `"<S-Enter>"` | `"open --interactive"` | `"Open selected files interactively"` | 选择打开方式。 |
| `"y"` | `"yank"` | `"Yank selected files (copy)"` | 复制准备。 |
| `"x"` | `"yank --cut"` | `"Yank selected files (cut)"` | 剪切准备。 |
| `"p"` | `"paste"` | `"Paste yanked files"` | 粘贴。 |
| `"P"` | `"paste --force"` | `"Paste yanked files (overwrite if the destination exists)"` | 覆盖式粘贴。 |
| `"-"` | `"link"` | `"Symlink the absolute path of yanked files"` | 绝对符号链接。 |
| `"_"` | `"link --relative"` | `"Symlink the relative path of yanked files"` | 相对符号链接。 |
| `"<C-->"` | `"hardlink"` | `"Hardlink yanked files"` | 硬链接。 |
| `"Y"` | `"unyank"` | `"Cancel the yank status"` | 取消复制／剪切准备。 |
| `"X"` | `"unyank"` | `"Cancel the yank status"` | 取消复制／剪切准备。 |
| `"d"` | `"remove"` | `"Trash selected files"` | 移入回收站。 |
| `"D"` | `"remove --permanently"` | `"Permanently delete selected files"` | 永久删除。 |
| `"a"` | `"create"` | `"Create a file (ends with / for directories)"` | 创建文件，末尾分隔符建目录。 |
| `"A"` | `"bulk_create"` | `"Bulk create files"` | 批量创建文件。 |
| `"r"` | `"rename --cursor=before_ext"` | `"Rename selected file(s)"` | 重命名，光标在扩展名前。 |
| `";"` | `"shell --interactive"` | `"Run a shell command"` | 输入 Shell 命令。 |
| `":"` | `"shell --block --interactive"` | `"Run a shell command (block until finishes)"` | 输入前台阻塞命令。 |
| `"."` | `"hidden toggle"` | `"Toggle the visibility of hidden files"` | 切换隐藏文件。 |
| `"s"` | `"search --via=fd"` | `"Search files by name via fd"` | 按名搜索。 |
| `"S"` | `"search --via=rg"` | `"Search files by content via ripgrep"` | 按内容搜索。 |
| `"<C-s>"` | `"escape --search"` | `"Cancel the ongoing search"` | 取消搜索。 |
| `"z"` | `"plugin fzf"` | `"Jump to a file/directory via fzf"` | fzf 跳转。 |
| `"Z"` | `"plugin zoxide"` | `"Jump to a directory via zoxide"` | zoxide 目录跳转。 |
| `[ "m", "s" ]` | `"linemode size"` | `"Linemode: size"` | 列表附加信息：size。 |
| `[ "m", "p" ]` | `"linemode permissions"` | `"Linemode: permissions"` | 列表附加信息：permissions。 |
| `[ "m", "b" ]` | `"linemode btime"` | `"Linemode: btime"` | 列表附加信息：btime。 |
| `[ "m", "m" ]` | `"linemode mtime"` | `"Linemode: mtime"` | 列表附加信息：mtime。 |
| `[ "m", "o" ]` | `"linemode owner"` | `"Linemode: owner"` | 列表附加信息：owner。 |
| `[ "m", "n" ]` | `"linemode none"` | `"Linemode: none"` | 列表附加信息：none。 |
| `[ "c", "c" ]` | `"copy path"` | `"Copy file path"` | 复制：path。 |
| `[ "c", "C" ]` | `"copy url"` | `"Copy file URL"` | 复制：url。 |
| `[ "c", "d" ]` | `"copy dirpath"` | `"Copy directory path"` | 复制：dirpath。 |
| `[ "c", "D" ]` | `"copy dirurl"` | `"Copy directory URL"` | 复制：dirurl。 |
| `[ "c", "f" ]` | `"copy filename"` | `"Copy filename"` | 复制：filename。 |
| `[ "c", "n" ]` | `"copy name_without_ext"` | `"Copy filename without extension"` | 复制：name_without_ext。 |
| `"f"` | `"filter --smart"` | `"Filter files"` | 智能大小写过滤。 |
| `"/"` | `"find --smart"` | `"Find next file"` | 查找下一名称。 |
| `"?"` | `"find --previous --smart"` | `"Find previous file"` | 查找上一名称。 |
| `"n"` | `"find_arrow"` | `"Next found"` | 下一查找结果。 |
| `"N"` | `"find_arrow --previous"` | `"Previous found"` | 上一查找结果。 |
| `[ ",", "m" ]` | `[ "sort mtime --reverse=no", "linemode mtime" ]` | `"Sort by modified time"` | 按 mtime 排序。 |
| `[ ",", "M" ]` | `[ "sort mtime --reverse=yes", "linemode mtime" ]` | `"Sort by modified time (reverse)"` | 按 mtime 排序（反向）。 |
| `[ ",", "b" ]` | `[ "sort btime --reverse=no", "linemode btime" ]` | `"Sort by birth time"` | 按 btime 排序。 |
| `[ ",", "B" ]` | `[ "sort btime --reverse=yes", "linemode btime" ]` | `"Sort by birth time (reverse)"` | 按 btime 排序（反向）。 |
| `[ ",", "e" ]` | `"sort extension --reverse=no"` | `"Sort by extension"` | 按 extension 排序。 |
| `[ ",", "E" ]` | `"sort extension --reverse=yes"` | `"Sort by extension (reverse)"` | 按 extension 排序（反向）。 |
| `[ ",", "a" ]` | `"sort alphabetical --reverse=no"` | `"Sort alphabetically"` | 按 alphabetical 排序。 |
| `[ ",", "A" ]` | `"sort alphabetical --reverse=yes"` | `"Sort alphabetically (reverse)"` | 按 alphabetical 排序（反向）。 |
| `[ ",", "n" ]` | `"sort natural --reverse=no"` | `"Sort naturally"` | 按 natural 排序。 |
| `[ ",", "N" ]` | `"sort natural --reverse=yes"` | `"Sort naturally (reverse)"` | 按 natural 排序（反向）。 |
| `[ ",", "s" ]` | `[ "sort size --reverse=no", "linemode size" ]` | `"Sort by size"` | 按 size 排序。 |
| `[ ",", "S" ]` | `[ "sort size --reverse=yes", "linemode size" ]` | `"Sort by size (reverse)"` | 按 size 排序（反向）。 |
| `[ ",", "r" ]` | `"sort random --reverse=no"` | `"Sort randomly"` | 随机排序。 |
| `[ "g", "h" ]` | `"cd ~"` | `"Go home"` | 家目录。 |
| `[ "g", "c" ]` | `"cd ~/.config"` | `"Go to ~/.config"` | 配置根父目录。 |
| `[ "g", "d" ]` | `"cd ~/Downloads"` | `"Go to ~/Downloads"` | 下载目录。 |
| `[ "g", "t" ]` | `"plugin trash"` | `"Go to trash bin"` | 回收站。 |
| `[ "g", "<Space>" ]` | `"cd --interactive"` | `"Jump interactively"` | 输入跳转目录。 |
| `[ "g", "f" ]` | `"follow"` | `"Follow hovered symlink"` | 跟随链接。 |
| `[ "t", "t" ]` | `"tab_create --current"` | `"Create a new tab in CWD"` | 当前目录新标签。 |
| `[ "t", "r" ]` | `"tab_rename --interactive"` | `"Rename current tab"` | 重命名标签。 |
| `"1"` | `"tab_switch 0"` | `"Switch to first tab"` | 切换第 1 个标签。 |
| `"2"` | `"tab_switch 1"` | `"Switch to second tab"` | 切换第 2 个标签。 |
| `"3"` | `"tab_switch 2"` | `"Switch to third tab"` | 切换第 3 个标签。 |
| `"4"` | `"tab_switch 3"` | `"Switch to fourth tab"` | 切换第 4 个标签。 |
| `"5"` | `"tab_switch 4"` | `"Switch to fifth tab"` | 切换第 5 个标签。 |
| `"6"` | `"tab_switch 5"` | `"Switch to sixth tab"` | 切换第 6 个标签。 |
| `"7"` | `"tab_switch 6"` | `"Switch to seventh tab"` | 切换第 7 个标签。 |
| `"8"` | `"tab_switch 7"` | `"Switch to eighth tab"` | 切换第 8 个标签。 |
| `"9"` | `"tab_switch 8"` | `"Switch to ninth tab"` | 切换第 9 个标签。 |
| `"["` | `"tab_switch -1 --relative"` | `"Switch to previous tab"` | 上一个标签。 |
| `"]"` | `"tab_switch 1 --relative"` | `"Switch to next tab"` | 下一个标签。 |
| `"{"` | `"tab_swap -1"` | `"Swap current tab with previous tab"` | 向前交换标签。 |
| `"}"` | `"tab_swap 1"` | `"Swap current tab with next tab"` | 向后交换标签。 |
| `"w"` | `"tasks:show"` | `"Show task manager"` | 打开任务管理器。 |
| `"~"` | `"help"` | `"Open help"` | 帮助。 |
| `"<F1>"` | `"help"` | `"Open help"` | 帮助。 |

#### `tasks` — 后台任务列表

| 默认 on | 默认 run | 默认 desc | 体验 |
| --- | --- | --- | --- |
| `"<Esc>"` | `"close"` | `"Close task manager"` | 关闭／取消。 |
| `"<C-[>"` | `"close"` | `"Close task manager"` | 关闭／取消。 |
| `"<C-c>"` | `"close"` | `"Close task manager"` | 关闭／取消。 |
| `"w"` | `"close"` | `"Close task manager"` | 关闭／取消。 |
| `"k"` | `"arrow prev"` | `"Previous task"` | 上一项。 |
| `"j"` | `"arrow next"` | `"Next task"` | 下一项。 |
| `"<Up>"` | `"arrow prev"` | `"Previous task"` | 上一项。 |
| `"<Down>"` | `"arrow next"` | `"Next task"` | 下一项。 |
| `"<Enter>"` | `"inspect"` | `"Inspect the task"` | 查看任务输出／错误。 |
| `"x"` | `"cancel"` | `"Cancel the task"` | 尝试取消任务。 |
| `"~"` | `"help"` | `"Open help"` | 帮助。 |
| `"<F1>"` | `"help"` | `"Open help"` | 帮助。 |

#### `spot` — 文件信息页

| 默认 on | 默认 run | 默认 desc | 体验 |
| --- | --- | --- | --- |
| `"<Esc>"` | `"close"` | `"Close the spot"` | 关闭／取消。 |
| `"<C-[>"` | `"close"` | `"Close the spot"` | 关闭／取消。 |
| `"<C-c>"` | `"close"` | `"Close the spot"` | 关闭／取消。 |
| `"<Tab>"` | `"close"` | `"Close the spot"` | 关闭／取消。 |
| `"k"` | `"arrow prev"` | `"Previous line"` | 上一项。 |
| `"j"` | `"arrow next"` | `"Next line"` | 下一项。 |
| `"h"` | `"swipe prev"` | `"Swipe to previous file"` | 上一文件。 |
| `"l"` | `"swipe next"` | `"Swipe to next file"` | 下一文件。 |
| `"<Up>"` | `"arrow prev"` | `"Previous line"` | 上一项。 |
| `"<Down>"` | `"arrow next"` | `"Next line"` | 下一项。 |
| `"<Left>"` | `"swipe prev"` | `"Swipe to previous file"` | 上一文件。 |
| `"<Right>"` | `"swipe next"` | `"Swipe to next file"` | 下一文件。 |
| `[ "c", "c" ]` | `"copy cell"` | `"Copy selected cell"` | 复制单元格。 |
| `"~"` | `"help"` | `"Open help"` | 帮助。 |
| `"<F1>"` | `"help"` | `"Open help"` | 帮助。 |

#### `pick` — 打开方式等选择菜单

| 默认 on | 默认 run | 默认 desc | 体验 |
| --- | --- | --- | --- |
| `"<Esc>"` | `"close"` | `"Cancel pick"` | 关闭／取消。 |
| `"<C-[>"` | `"close"` | `"Cancel pick"` | 关闭／取消。 |
| `"<C-c>"` | `"close"` | `"Cancel pick"` | 关闭／取消。 |
| `"<Enter>"` | `"close --submit"` | `"Submit the pick"` | 提交／确认。 |
| `"k"` | `"arrow prev"` | `"Previous option"` | 上一项。 |
| `"j"` | `"arrow next"` | `"Next option"` | 下一项。 |
| `"<Up>"` | `"arrow prev"` | `"Previous option"` | 上一项。 |
| `"<Down>"` | `"arrow next"` | `"Next option"` | 下一项。 |
| `"~"` | `"help"` | `"Open help"` | 帮助。 |
| `"<F1>"` | `"help"` | `"Open help"` | 帮助。 |

#### `input` — 创建、重命名、路径等输入框

| 默认 on | 默认 run | 默认 desc | 体验 |
| --- | --- | --- | --- |
| `"<C-c>"` | `"close"` | `"Cancel input"` | 取消输入。 |
| `"<Enter>"` | `"close --submit"` | `"Submit input"` | 提交输入。 |
| `"<Esc>"` | `"escape"` | `"Back to normal mode, or cancel input"` | 返回普通模式或取消。 |
| `"<C-[>"` | `"escape"` | `"Back to normal mode, or cancel input"` | 返回普通模式或取消。 |
| `"i"` | `"insert"` | `"Enter insert mode"` | 插入模式。 |
| `"I"` | `[ "move first-char", "insert" ]` | `"Move to the BOL, and enter insert mode"` | 行首非空字符插入。 |
| `"a"` | `"insert --append"` | `"Enter append mode"` | 光标后插入。 |
| `"A"` | `[ "move eol", "insert --append" ]` | `"Move to the EOL, and enter append mode"` | 行尾插入。 |
| `"v"` | `"visual"` | `"Enter visual mode"` | 视觉选择。 |
| `"r"` | `"replace"` | `"Replace a single character"` | 替换单字符。 |
| `"V"` | `[ "move bol", "visual", "move eol" ]` | `"Select from BOL to EOL"` | 行首到行尾选择。 |
| `"<C-A>"` | `[ "move eol", "visual", "move bol" ]` | `"Select from EOL to BOL"` | 行尾到行首选择。 |
| `"<C-E>"` | `[ "move bol", "visual", "move eol" ]` | `"Select from BOL to EOL"` | 行首到行尾选择。 |
| `"h"` | `"move -1"` | `"Move back a character"` | 左移字符。 |
| `"l"` | `"move 1"` | `"Move forward a character"` | 右移字符。 |
| `"<Left>"` | `"move -1"` | `"Move back a character"` | 左移字符。 |
| `"<Right>"` | `"move 1"` | `"Move forward a character"` | 右移字符。 |
| `"<C-b>"` | `"move -1"` | `"Move back a character"` | 左移字符。 |
| `"<C-f>"` | `"move 1"` | `"Move forward a character"` | 右移字符。 |
| `"b"` | `"backward"` | `"Move back to the start of the current or previous word"` | 向后 word。 |
| `"B"` | `"backward wide"` | `"Move back to the start of the current or previous WORD"` | 向后 WORD。 |
| `"w"` | `"forward"` | `"Move forward to the start of the next word"` | 下一 word 起点。 |
| `"W"` | `"forward wide"` | `"Move forward to the start of the next WORD"` | 下一 WORD 起点。 |
| `"e"` | `"forward --end-of-word"` | `"Move forward to the end of the current or next word"` | word 末尾。 |
| `"E"` | `"forward wide --end-of-word"` | `"Move forward to the end of the current or next WORD"` | WORD 末尾。 |
| `"<A-b>"` | `"backward lean"` | `"Move back to the start of the current or previous word"` | Emacs-like 前词。 |
| `"<A-f>"` | `"forward lean --end-of-word"` | `"Move forward to the end of the current or next word"` | Emacs-like 后词末尾。 |
| `"<C-Left>"` | `"backward lean"` | `"Move back to the start of the current or previous word"` | Emacs-like 前词。 |
| `"<C-Right>"` | `"forward lean --end-of-word"` | `"Move forward to the end of the current or next word"` | Emacs-like 后词末尾。 |
| `"0"` | `"move bol"` | `"Move to the BOL"` | 行首。 |
| `"$"` | `"move eol"` | `"Move to the EOL"` | 行尾。 |
| `"_"` | `"move first-char"` | `"Move to the first non-whitespace character"` | 行首非空白。 |
| `"^"` | `"move first-char"` | `"Move to the first non-whitespace character"` | 行首非空白。 |
| `"<C-a>"` | `"move bol"` | `"Move to the BOL"` | 行首。 |
| `"<C-e>"` | `"move eol"` | `"Move to the EOL"` | 行尾。 |
| `"<Home>"` | `"move bol"` | `"Move to the BOL"` | 行首。 |
| `"<End>"` | `"move eol"` | `"Move to the EOL"` | 行尾。 |
| `"<Backspace>"` | `"backspace"` | `"Delete the character before the cursor"` | 删光标前字符。 |
| `"<Delete>"` | `"backspace --under"` | `"Delete the character under the cursor"` | 删光标下字符。 |
| `"<C-h>"` | `"backspace"` | `"Delete the character before the cursor"` | 删光标前字符。 |
| `"<C-d>"` | `"backspace --under"` | `"Delete the character under the cursor"` | 删光标下字符。 |
| `"<C-u>"` | `"kill bol"` | `"Kill backwards to the BOL"` | 删除至行首。 |
| `"<C-k>"` | `"kill eol"` | `"Kill forwards to the EOL"` | 删除至行尾。 |
| `"<C-w>"` | `"kill backward"` | `"Kill backwards to the start of the current word"` | 删前词。 |
| `"<A-d>"` | `"kill forward"` | `"Kill forwards to the end of the current word"` | 删后词。 |
| `"<C-Backspace>"` | `"kill backward"` | `"Kill backwards to the start of the current word"` | 删前词。 |
| `"<C-Delete>"` | `"kill forward"` | `"Kill forwards to the end of the current word"` | 删后词。 |
| `"d"` | `"delete --cut"` | `"Cut selected characters"` | 剪切选中字符。 |
| `"D"` | `[ "delete --cut", "move eol" ]` | `"Cut until EOL"` | 剪切到行尾。 |
| `"c"` | `"delete --cut --insert"` | `"Cut selected characters, and enter insert mode"` | 剪切并插入。 |
| `"C"` | `[ "delete --cut --insert", "move eol" ]` | `"Cut until EOL, and enter insert mode"` | 剪切到行尾并插入。 |
| `"s"` | `[ "delete --cut --insert", "move 1" ]` | `"Cut current character, and enter insert mode"` | 剪切当前字符并插入。 |
| `"S"` | `[ "move bol", "delete --cut --insert", "move eol" ]` | `"Cut from BOL until EOL, and enter insert mode"` | 剪切整行并插入。 |
| `"x"` | `[ "delete --cut", "move 1 --in-operating" ]` | `"Cut current character"` | 剪切当前字符。 |
| `"y"` | `"yank"` | `"Copy selected characters"` | 复制选中字符。 |
| `"p"` | `"paste"` | `"Paste copied characters after the cursor"` | 光标后粘贴。 |
| `"P"` | `"paste --before"` | `"Paste copied characters before the cursor"` | 光标前粘贴。 |
| `"u"` | `[ "undo", "casefy lower" ]` | `"Undo, or lowercase if in visual mode"` | 撤销，视觉模式则小写。 |
| `"U"` | `"casefy upper"` | `"Uppercase"` | 大写。 |
| `"<C-r>"` | `"redo"` | `"Redo the last operation"` | 重做。 |
| `"k"` | `"recall -1"` | `"Recall previous input"` | 较早历史。 |
| `"j"` | `"recall 1"` | `"Recall next input"` | 较晚历史。 |
| `"<Up>"` | `"recall -1"` | `"Recall previous input"` | 较早历史。 |
| `"<Down>"` | `"recall 1"` | `"Recall next input"` | 较晚历史。 |
| `"<C-p>"` | `"recall -1"` | `"Recall previous input"` | 较早历史。 |
| `"<C-n>"` | `"recall 1"` | `"Recall next input"` | 较晚历史。 |
| `"~"` | `"help"` | `"Open help"` | 帮助。 |
| `"<F1>"` | `"help"` | `"Open help"` | 帮助。 |

#### `confirm` — 删除、覆盖、退出确认

| 默认 on | 默认 run | 默认 desc | 体验 |
| --- | --- | --- | --- |
| `"<Esc>"` | `"close"` | `"Cancel the confirm"` | 关闭／取消。 |
| `"<C-[>"` | `"close"` | `"Cancel the confirm"` | 关闭／取消。 |
| `"<C-c>"` | `"close"` | `"Cancel the confirm"` | 关闭／取消。 |
| `"<Enter>"` | `"close --submit"` | `"Submit the confirm"` | 提交／确认。 |
| `"n"` | `"close"` | `"Cancel the confirm"` | 关闭／取消。 |
| `"y"` | `"close --submit"` | `"Submit the confirm"` | 提交／确认。 |
| `"k"` | `"arrow prev"` | `"Previous line"` | 上一项。 |
| `"j"` | `"arrow next"` | `"Next line"` | 下一项。 |
| `"<Up>"` | `"arrow prev"` | `"Previous line"` | 上一项。 |
| `"<Down>"` | `"arrow next"` | `"Next line"` | 下一项。 |
| `"~"` | `"help"` | `"Open help"` | 帮助。 |
| `"<F1>"` | `"help"` | `"Open help"` | 帮助。 |

#### `cmp` — 路径／命令补全菜单

| 默认 on | 默认 run | 默认 desc | 体验 |
| --- | --- | --- | --- |
| `"<C-c>"` | `"close"` | `"Cancel completion"` | 取消补全。 |
| `"<Tab>"` | `"close --submit"` | `"Submit the completion"` | 接受补全。 |
| `"<Enter>"` | `[ "close --submit", "input:close --submit" ]` | `"Complete and submit the input"` | 补全并提交输入。 |
| `"<A-k>"` | `"arrow prev"` | `"Previous item"` | 上一候选。 |
| `"<A-j>"` | `"arrow next"` | `"Next item"` | 下一候选。 |
| `"<Up>"` | `"arrow prev"` | `"Previous item"` | 上一候选。 |
| `"<Down>"` | `"arrow next"` | `"Next item"` | 下一候选。 |
| `"<C-p>"` | `"arrow prev"` | `"Previous item"` | 上一候选。 |
| `"<C-n>"` | `"arrow next"` | `"Next item"` | 下一候选。 |
| `"~"` | `"help"` | `"Open help"` | 帮助。 |
| `"<F1>"` | `"help"` | `"Open help"` | 帮助。 |

#### `help` — 帮助与按键清单

| 默认 on | 默认 run | 默认 desc | 体验 |
| --- | --- | --- | --- |
| `"<Esc>"` | `"escape"` | `"Enter normal mode, or hide help menu"` | 清过滤或关闭。 |
| `"<C-[>"` | `"escape"` | `"Enter normal mode, or hide help menu"` | 清过滤或关闭。 |
| `"<C-c>"` | `"close"` | `"Close help menu"` | 关闭帮助。 |
| `"<Enter>"` | `"close --submit"` | `"Close help menu and run selected action(s)"` | 关闭并执行选中动作。 |
| `"k"` | `"arrow prev"` | `"Previous line"` | 上一行。 |
| `"j"` | `"arrow next"` | `"Next line"` | 下一行。 |
| `"<Up>"` | `"arrow prev"` | `"Previous line"` | 上一行。 |
| `"<Down>"` | `"arrow next"` | `"Next line"` | 下一行。 |
| `"<C-p>"` | `"arrow prev"` | `"Previous line"` | 上一行。 |
| `"<C-n>"` | `"arrow next"` | `"Next line"` | 下一行。 |

## 4. `theme.toml`：全部内置外观键

`[single-source]` 主题预设根据终端暗／亮模式分为两份；下表除显式写出“暗／亮”差异外，两个模式默认相同。空样式 `{}` 是不额外指定样式，不是固定的黑底白字。[D4][S5][S16]

### 4.1 样式与颜色的允许值

`Color` 使用 `"#RRGGBB"`，或以下 17 个官方名称：`"reset"`、`"black"`、`"white"`、`"red"`、`"lightred"`、`"green"`、`"lightgreen"`、`"yellow"`、`"lightyellow"`、`"blue"`、`"lightblue"`、`"magenta"`、`"lightmagenta"`、`"cyan"`、`"lightcyan"`、`"gray"`、`"darkgray"`。这些名称按终端调色盘呈现，未必在所有终端看起来相同。[D4#types.color]

`Style` 的完整字段如下；`<样式键>` 精确代表后续表格所有类型为 Style 的键，或 filetype／icon 元素中的扁平样式位置。例如 `mgr.cwd.fg` 与 `filetype.rules[].fg` 都是完整有效路径，而不是写一个叫 Style 的配置节。[D4#types.style][S15]

| 完整子键路径 | 类型 | 未指定时 | 体验 |
| --- | --- | --- | --- |
| `<样式键>.fg` | Color | 不指定前景 | 字体颜色。 |
| `<样式键>.bg` | Color | 不指定背景 | 背景颜色。 |
| `<样式键>.bold` | bool | 不指定此修饰 | 粗体。 |
| `<样式键>.dim` | bool | 不指定此修饰 | 弱化显示，终端可能不支持。 |
| `<样式键>.italic` | bool | 不指定此修饰 | 斜体。 |
| `<样式键>.underline` | bool | 不指定此修饰 | 下划线。 |
| `<样式键>.blink` | bool | 不指定此修饰 | 慢闪烁。 |
| `<样式键>.blink_rapid` | bool | 不指定此修饰 | 快闪烁。 |
| `<样式键>.reversed` | bool | 不指定此修饰 | 交换前景／背景。 |
| `<样式键>.hidden` | bool | 不指定此修饰 | 隐藏文字。 |
| `<样式键>.crossed` | bool | 不指定此修饰 | 删除线。 |

未指定 bool 与 false 不同：未指定不追加／移除修饰，false 明确移除。`reset` 也不等于属性缺失。`Style` 的最终继承／叠加受各组件绘制影响，本文不将 `{}` 写成 false 的全集。[S15]

```toml
[mgr]
cwd = { fg = "#e4e4e4", bg = "black", bold = true }

[app]
overall = { bg = "#1e1e2e" }
```

`app.overall` 虽用 Style 类型，官方语义只允许设置 bg 来改变终端背景，要求 OSC 11。其他样式属性不因此拥有“整个 App 粗体”的效果。[D4#app.overall]

### 4.2 每个内置 section 的全部固定键

#### `flavor`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `flavor.dark` | string | `""` | 暗模式使用的 flavor 名；空串不选 flavor。 |
| `flavor.light` | string | `""` | 亮模式使用的 flavor 名；空串不选 flavor。 |

#### `app`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `app.overall` | Style | `{}` | 终端整体背景，需 OSC 11。 |

#### `mgr`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `mgr.cwd` | Style | `{ fg = "cyan" }` | 顶部当前目录文字。 |
| `mgr.find_keyword` | Style | `{ fg = "yellow", bold = true, italic = true, underline = true }` | 文件名中查找命中的片段。 |
| `mgr.find_position` | Style | `{ fg = "magenta", bg = "reset", bold = true, italic = true }` | 当前查找结果位置提示。 |
| `mgr.symlink_target` | Style | `{ italic = true }` | 链接名后的目标路径。 |
| `mgr.marker_copied` | Style | `{ fg = "lightgreen", bg = "lightgreen" }` | 已复制准备文件的标记。 |
| `mgr.marker_cut` | Style | `{ fg = "lightred", bg = "lightred" }` | 已剪切准备文件的标记。 |
| `mgr.marker_marked` | Style | `{ fg = "lightcyan", bg = "lightcyan" }` | 视觉预选标记。 |
| `mgr.marker_selected` | Style | `{ fg = "lightyellow", bg = "lightyellow" }` | 已选择文件的标记。 |
| `mgr.marker_symbol` | string | `"│"` | 这些文件标记使用的字符。 |
| `mgr.count_copied` | Style | `{ fg = "white", bg = "green" }` | 复制计数标签。 |
| `mgr.count_cut` | Style | `{ fg = "white", bg = "red" }` | 剪切计数标签。 |
| `mgr.count_selected` | Style | 暗 `{ fg = "black", bg = "yellow" }`；亮 `{ fg = "white", bg = "yellow" }` | 选择计数标签。 |
| `mgr.border_symbol` | string | `"│"` | 列表面板边界字符。 |
| `mgr.border_style` | Style | `{ fg = "gray" }` | 列表面板边界样式。 |
| `mgr.syntect_theme` | 路径 string；空串、绝对路径或 tag 可绝对化的本地路径 | `""` | 代码预览的 tmTheme 文件；空串用预设，选 flavor 时改用它的 tmtheme.xml。 |

#### `tabs`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `tabs.active` | Style | `{ bg = "blue", bold = true }` | 活动标签。 |
| `tabs.inactive` | Style | `{ fg = "blue", bg = "gray" }` | 非活动标签。 |
| `tabs.sep_inner` | {open:string, close:string} | `{ open = "", close = "" }` | 标签内侧开／闭分隔字符。 |
| `tabs.sep_outer` | {open:string, close:string} | `{ open = "", close = "" }` | 标签外侧开／闭分隔字符。 |

#### `mode`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `mode.normal_main` | Style | `{ bg = "blue", bold = true }` | 普通模式主块。 |
| `mode.normal_alt` | Style | `{ fg = "blue", bg = "gray" }` | 普通模式副块。 |
| `mode.select_main` | Style | `{ bg = "red", bold = true }` | 视觉选择模式主块。 |
| `mode.select_alt` | Style | `{ fg = "red", bg = "gray" }` | 视觉选择模式副块。 |
| `mode.unset_main` | Style | `{ bg = "red", bold = true }` | 视觉取消选择模式主块。 |
| `mode.unset_alt` | Style | `{ fg = "red", bg = "gray" }` | 视觉取消选择模式副块。 |

#### `indicator`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `indicator.parent` | Style | `{ reversed = true }` | 父目录悬停指示条。 |
| `indicator.current` | Style | `{ reversed = true }` | 当前目录悬停指示条。 |
| `indicator.preview` | Style | `{ underline = true }` | 预览目录悬停指示条。 |
| `indicator.padding` | {open:string, close:string} | `{ open = "", close = "" }` | 指示条左右装饰字符。 |

#### `status`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `status.overall` | Style | `{}` | 状态栏整体。 |
| `status.sep_left` | {open:string, close:string} | `{ open = "", close = "" }` | 状态栏左侧开／闭分隔字符。 |
| `status.sep_right` | {open:string, close:string} | `{ open = "", close = "" }` | 状态栏右侧开／闭分隔字符。 |
| `status.perm_sep` | Style | `{ fg = "darkgray" }` | 权限信息分隔。 |
| `status.perm_type` | Style | `{ fg = "green" }` | 权限字段中的文件类型字符。 |
| `status.perm_read` | Style | `{ fg = "yellow" }` | 读权限字符。 |
| `status.perm_write` | Style | `{ fg = "red" }` | 写权限字符。 |
| `status.perm_exec` | Style | `{ fg = "cyan" }` | 执行权限字符。 |
| `status.progress_label` | Style | `{ bold = true }` | 任务进度标签。 |
| `status.progress_normal` | Style | 暗 `{ fg = "green", bg = "black" }`；亮 `{ fg = "green", bg = "gray" }` | 正常进度条。 |
| `status.progress_error` | Style | `{ fg = "yellow", bg = "red" }` | 错误进度条。 |

#### `which`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `which.border` | Style | `{ fg = "blue" }` | 连续键候选提示边框。 |
| `which.cols` | 整数 1、2、3 | `3` | 候选列数。 |
| `which.mask` | Style | `{}` | 提示遮罩。 |
| `which.cand` | Style | `{ fg = "lightcyan" }` | 候选键。 |
| `which.rest` | Style | `{ fg = "darkgray" }` | 剩余键序列。 |
| `which.desc` | Style | `{ fg = "lightmagenta" }` | 候选说明。 |
| `which.separator` | string | `"  "` | 键与说明间分隔字符。 |
| `which.separator_style` | Style | `{ fg = "darkgray" }` | 键与说明间分隔样式。 |

#### `confirm`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `confirm.border` | Style | `{ fg = "blue" }` | 确认框边框。 |
| `confirm.title` | Style | `{ fg = "blue" }` | 确认框标题。 |
| `confirm.body` | Style | `{}` | 确认说明正文。 |
| `confirm.list` | Style | `{}` | 受影响文件列表。 |
| `confirm.btn_yes` | Style | `{ reversed = true }` | 确认按钮。 |
| `confirm.btn_no` | Style | `{}` | 取消按钮。 |
| `confirm.btn_labels` | [string,string] | `[ "  [Y]es  ", "  (N)o  " ]` | 确认／取消两个标签文本。 |

#### `spot`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `spot.border` | Style | `{ fg = "blue" }` | 信息页边框。 |
| `spot.title` | Style | `{ fg = "blue" }` | 信息页标题。 |
| `spot.tbl_col` | Style | `{ fg = "blue" }` | 选中表格列。 |
| `spot.tbl_cell` | Style | `{ fg = "yellow", reversed = true }` | 选中表格单元格。 |

#### `notify`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `notify.title_info` | Style | `{ fg = "green" }` | 信息通知标题。 |
| `notify.title_warn` | Style | `{ fg = "yellow" }` | 警告通知标题。 |
| `notify.title_error` | Style | `{ fg = "red" }` | 错误通知标题。 |
| `notify.icon_info` | string | `""` | 信息通知图标字符。 |
| `notify.icon_warn` | string | `""` | 警告通知图标字符。 |
| `notify.icon_error` | string | `""` | 错误通知图标字符。 |

#### `pick`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `pick.border` | Style | `{ fg = "blue" }` | 选择框边框。 |
| `pick.active` | Style | `{ fg = "magenta", bold = true }` | 当前选择项。 |
| `pick.inactive` | Style | `{}` | 其他选择项。 |

#### `input`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `input.border` | Style | `{ fg = "blue" }` | 输入框边框。 |
| `input.title` | Style | `{}` | 输入框标题。 |
| `input.value` | Style | `{}` | 输入内容。 |
| `input.selected` | Style | `{ reversed = true }` | 选中文字。 |

#### `cmp`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `cmp.border` | Style | `{ fg = "blue" }` | 补全框边框。 |
| `cmp.active` | Style | `{ reversed = true }` | 活动补全项。 |
| `cmp.inactive` | Style | `{}` | 其他补全项。 |
| `cmp.icon_file` | string | `""` | 文件补全图标字符。 |
| `cmp.icon_folder` | string | `""` | 目录补全图标字符。 |
| `cmp.icon_command` | string | `""` | 命令补全图标字符。 |

#### `tasks`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `tasks.border` | Style | `{ fg = "blue" }` | 任务面板边框。 |
| `tasks.title` | Style | `{}` | 任务面板标题。 |
| `tasks.hovered` | Style | `{ fg = "magenta", bold = true }` | 悬停任务。 |

#### `help`

| 完整键路径 | 类型／允许格式 | 暗／亮默认值 | 体验 |
| --- | --- | --- | --- |
| `help.border` | Style | `{ fg = "blue" }` | 帮助面板边框。 |
| `help.chord` | Style | `{ fg = "cyan" }` | 帮助中的按键序列。 |
| `help.action` | Style | `{}` | 帮助中的动作／描述。 |
| `help.hovered` | Style | `{ reversed = true, bold = true }` | 帮助中当前行。 |

`sep_inner`、`sep_outer`、`sep_left`、`sep_right`、`padding` 各自拥有 `.open` 与 `.close` 两个字符串子键；它们的完整默认值已在对应行展开。`confirm.btn_labels` 是两个字符串，不是一个样式；图标字符也不是可替换为 bool 的开关。[S16]

### 4.3 `filetype`：按文件类型着色

| 完整键路径 | 允许值／类型 | 默认值 | 体验 |
| --- | --- | --- | --- |
| `filetype.rules` | FiletypeRule 数组 | 下方完整 10 条 | 首个命中规则决定文件列表项样式；写整个数组替换，不是累积叠加所有命中样式。 |
| `filetype.rules[].url` | glob string；与 mime 至少一项 | 无字段默认 | 按文件／目录路径匹配。 |
| `filetype.rules[].mime` | MIME glob string；同时写 url 时是 AND | 无字段默认 | 按内容类型匹配。 |
| `filetype.rules[].is` | `"none"`、`"hidden"`、`"link"`、`"orphan"`、`"dummy"`、`"block"`、`"char"`、`"fifo"`、`"sock"`、`"exec"`、`"sticky"` | `"none"` | 再限制文件元数据类型；none 不追加限制。不是 icon 的布尔表达式。 |
| `filetype.rules[].fg`／`.bg`／全部 Style 布尔字段 | 见 4.1 的全部 11 个 Style 字段 | 未写则不指定 | 每条规则的样式，直接扁平写在规则表内，不嵌一个 style 字段。 |

来源：[D4#filetype][S18]。`dummy` 指没有完整加载元数据的文件；`orphan` 是失效链接；`exec` 是可执行；`sticky` 是 sticky-bit 文件。`is` 与 url／mime 一起使用，不能只写 `{is="exec"}` 代替 selector。

| 序号 | 暗模式完整默认规则 | 亮模式差异 |
| --- | --- | --- |
| 1 | `{ mime = "**/image/*", fg = "yellow" }` | 同左 |
| 2 | `{ mime = "**/{audio,video}/*", fg = "magenta" }` | 同左 |
| 3 | `{ mime = "**/application/{zip,rar,7z*,tar,gzip,xz,zstd,bzip*,lzma,compress,archive,cpio,arj,xar,ms-cab*}", fg = "red" }` | 同左 |
| 4 | `{ mime = "**/application/{pdf,doc,rtf}", fg = "cyan" }` | 同左 |
| 5 | `{ mime = "vfs/{absent,stale}", fg = "gray" }` | `{ mime = "vfs/{absent,stale}", fg = "darkgray" }` |
| 6 | `{ url = "*", is = "orphan", bg = "red" }` | 同左 |
| 7 | `{ url = "*", is = "exec", fg = "green" }` | 同左 |
| 8 | `{ url = "*", is = "dummy", bg = "red" }` | 同左 |
| 9 | `{ url = "*/", is = "dummy", bg = "red" }` | 同左 |
| 10 | `{ url = "*/", fg = "blue" }` | 同左 |

### 4.4 `icon`：文件图标的全部配置键

| 完整键路径 | 类型 | 默认值 | 体验 |
| --- | --- | --- | --- |
| `icon.globs` | IconGlob 数组 | `[]` | 替换此类别的默认映射：最优先的 URL glob 图标。 |
| `icon.prepend_globs` | 同 globs 数组 | `[]` | 前置添加此类别的图标规则。 |
| `icon.append_globs` | 同 globs 数组 | `[]` | 后置添加此类别的图标规则。 |
| `icon.dirs` | IconName 数组 | 14 条，暗／亮全部值见附录 A | 替换此类别的默认映射：目录名图标。 |
| `icon.prepend_dirs` | 同 dirs 数组 | `[]` | 前置添加此类别的图标规则。 |
| `icon.append_dirs` | 同 dirs 数组 | `[]` | 后置添加此类别的图标规则。 |
| `icon.files` | IconName 数组 | 214 条，暗／亮全部值见附录 A | 替换此类别的默认映射：文件名图标。 |
| `icon.prepend_files` | 同 files 数组 | `[]` | 前置添加此类别的图标规则。 |
| `icon.append_files` | 同 files 数组 | `[]` | 后置添加此类别的图标规则。 |
| `icon.exts` | IconName 数组 | 485 条，暗／亮全部值见附录 A | 替换此类别的默认映射：扩展名图标。 |
| `icon.prepend_exts` | 同 exts 数组 | `[]` | 前置添加此类别的图标规则。 |
| `icon.append_exts` | 同 exts 数组 | `[]` | 后置添加此类别的图标规则。 |
| `icon.conds` | IconCond 数组 | 12 条，暗／亮全部值见附录 A | 替换此类别的默认映射：元数据条件图标。 |
| `icon.prepend_conds` | 同 conds 数组 | `[]` | 前置添加此类别的图标规则。 |
| `icon.append_conds` | 同 conds 数组 | `[]` | 后置添加此类别的图标规则。 |

| 完整规则键路径 | 类型／允许值 | 省略时 | 体验 |
| --- | --- | --- | --- |
| `icon.<glob数组>[].url` | glob string；不是 name | 必填 | 按 URL 最先判断。 |
| `icon.<名称数组>[].name` | 非空 string | 必填 | dirs／files／exts 对应的精确名称；查找先原名，再尝试 ASCII 小写名。不是 glob。 |
| `icon.<条件数组>[].if` | 布尔表达式 string | 必填 | dir、hidden、link、orphan、dummy、block、char、fifo、sock、exec、sticky、hovered，支持 `\|`（OR）、`&`、`!`、括号。未知因子在 matcher 为 false。 |
| `icon.<任意规则数组>[].text` | string | 必填 | 显示的图标文字；可用多字符。字形是否显示取决于终端字体。 |
| `icon.<任意规则数组>[].fg`／`.bg`／全部 Style 布尔字段 | 见 4.1 | 未写则不指定 | 图标规则接受完整扁平 Style；文档虽主要举 fg，源码不只支持 fg。 |

`<glob数组>` 为 globs／prepend_globs／append_globs；`<名称数组>` 为 dirs／files／exts 及对应前后置数组；`<条件数组>` 为 conds 及前后置数组。这三个模板覆盖上表全部 15 个数组。

匹配顺序：globs →（目录才查 dirs，非目录先 files 再 exts）→ conds。globs、conds 按规则次序查找；dirs、files、exts 是名称表。同名的优先级前置 > 基础 > 后置。大量复杂 glob 比名称查找更耗计算，是上游实现结构说明，不是本机 benchmark。[D4#icon][S17]

```toml
[icon]
prepend_globs = [{ url = "**/Downloads/*.zip", text = "Z", fg = "yellow" }]
prepend_dirs  = [{ name = "Desktop", text = "D", fg = "cyan" }]
prepend_conds = [{ if = "hidden & dir", text = "H", fg = "gray" }]
```

### 4.5 flavor 与插件自定义样式

```toml
[flavor]
dark  = "bar"
light = "bar"

[mgr]
cwd = { fg = "red" }
```

这从 `flavors/bar.yazi/flavor.toml` 读取样式，再用当前用户文件的 cwd 覆盖；语法中的名称不带 `.yazi`。代码高亮会使用该 flavor 的 `tmtheme.xml`，而不是 `mgr.syntect_theme`。只有暗或亮一个名称时，另一种模式仍按自己的预设／未配置 flavor 处理。[D8][S2][S16]

`[single-source]` tag 还支持用户自定义顶层主题 section，供插件消费。顶层 section 名是 1–20 字节的 kebab-case；其内部键是 1–20 字节的 snake_case，按 SnakeCasedKey 处理，值支持字符串或 Style，默认没有自定义条目。它不是一个固定 `[custom]` 配置节，也不是可以随意加入数值开关的通用程序配置。[S33]

```toml
[my-plugin]
label = "My plugin"
accent = { fg = "cyan", bold = true }
```

这些键不会自动给内置面板增加功能，必须有插件使用它们；本文不枚举第三方插件自己定义的参数。

## 5. `vfs.toml`：额外的文件系统配置域

`[single-source]` VFS（虚拟文件系统）让 Yazi 通过 URL 管理本地文件之外的服务。其配置域不叫固定 `[vfs]`，而是“scheme → domain → service 表”。scheme 可以 `sftp` 或自定义名；`regular`、`search` 禁止配置。自定义 scheme 的 kind 只能 mount／hub／scope；kind=sftp 服务必须使用 sftp scheme。[D5][S14]

默认整个文件仅为：[S34]

```toml
[trash."*"]
kind = "hub"
run = "trash"
```

这是回收站的 Lua hub 服务，`"*"` 是 catch-all domain。普通 domain 精确匹配优先于 catch-all；用户定义同 scheme 的新 domain 加入，重写已有 domain 替换该 service。hub 要求 domain 必须是 `"*"`。无任何默认 SFTP 主机，不会自动从 ssh config 推导下面的 host／user／port。[S14]

### 5.1 SFTP 的全部内置配置字段

在 `vfs.toml` 写 `[sftp.<domain>]`。scheme 建议 kebab-case 1–20 字节，domain 建议普通 kebab-case 名；源码 domain 实际允许字符串与 `"*"`，详见版本边界表。

| 完整键路径（相对于 vfs.toml） | 允许值／类型 | 省略默认 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `sftp.<domain>.host` | string | 必填，无默认 | SSH 主机名／地址。 |
| `sftp.<domain>.user` | string | 必填，无默认 | 登录用户名，不自动默认为本机用户。 |
| `sftp.<domain>.port` | `u16`，0–65535 | 必填；`22` 是文档示例而非字段默认 | SSH 端口；类型允许 0 不代表 0 能连接。 |
| `sftp.<domain>.password` | string，可省略 | 无（None） | 有值就优先使用密码验证；可空串，但空串也算提供了密码。会以明文存在配置文件中。 |
| `sftp.<domain>.key_file` | 路径 string | `""` | 私钥路径；文档可写 `~/.ssh/id_rsa`，tag 的 sanitize_path 会展开／绝对化。 |
| `sftp.<domain>.key_passphrase` | string，可省略 | 无（None） | 私钥的解密口令；也是明文配置。 |
| `sftp.<domain>.cert_file` | 路径 string | `""` | 配合 key_file 使用 OpenSSH 用户证书；不是服务器 known_hosts 文件。文档未列，源码存在。 |
| `sftp.<domain>.no_cert_verify` | bool | `false` | true 跳过本地用户证书的签名和有效期校验。**不是控制服务器 host-key 校验的开关**。 |
| `sftp.<domain>.identity_agent` | 路径 string | `$SSH_AUTH_SOCK` 仅当它是绝对路径；否则 `""`；显式空串也重新尝试该环境默认 | 指定 agent socket；Unix 使用 UDS，Windows 使用 named pipe。 |

没有 `sftp.<domain>.kind` 的必填字段：sftp scheme 直接按 ServiceSftp 解析。`auth` 是内部生成数据，不是用户配置键。[S14]

```toml
[sftp.my-server]
host = "192.0.2.10"
user = "alice"
port = 22
key_file = "~/.ssh/id_ed25519"
```

启动可用 `yazi sftp://my-server`；按键可用 `run = "cd sftp://my-server"`。这只是配置示例，本文没有启动网络连接。[D5#usage]

`[single-source]` tag 的认证分支顺序是：提供 password → key_file 与 cert_file 同时存在 → 仅 key_file → identity_agent → none；不是失败后自动试下一个分支的通用重试链。agent 自身会尝试返回的 identities，并可最后尝试 none。[S25]

**安全边界**：v26.9.1 的 `check_server_key` 直接返回 true，所读代码没有服务器 host-key 验证。不要把 `no_cert_verify=false` 当成启用了 known_hosts 保护；它校验的是前述用户证书。使用密码或私钥连接敏感服务器前应考虑这一风险。证据形态：一手直读，未进行攻击模拟或连接实测。[S25]

### 5.2 自定义 Lua 服务的全部通用字段

| 完整键路径（相对于 vfs.toml） | 允许值／类型 | 省略默认 | 用户能感知的变化 |
| --- | --- | --- | --- |
| `<scheme>.<domain>.kind` | `"mount"`、`"hub"`、`"scope"`；不是任意字符串 | 必填；默认预设 trash 的值是 hub | 决定服务的 VFS kind；hub 必须配 catch-all `"*"` domain。没有服务实现时，选 kind 不会凭空生成能力。 |
| `<scheme>.<domain>.run` | 非空插件命令 string | 必填；trash 预设为 `"trash"` | 负责该服务的 Lua 插件。 |
| `<scheme>.<domain>.<插件选项>` | tag Data：bool、整数、浮点数、string、数组、表；具体键与合法值由插件决定 | 无通用默认；默认 trash 没有额外选项 | 将 provider 参数交给插件，而不是内置固定键。TOML 没有 null，不能将内部 Nil 直接写成 `null`。 |

这覆盖了 tag 的全部内置 VFS 字段；插件扩展的未知参数不可能从 Yazi 官方固定配置结构枚举成统一清单。[S14][S35]

## 6. 初始化、包依赖、终端与日志

### `init.lua` 不是 TOML 配置节

`[single-source]` 它在选中配置目录内作为同步初始化执行，可调用插件 setup 或修改 UI。不是一个可列出固定 TOML 默认键的文件。默认没有用户初始化代码；缺失则跳过；已读实现的 `if let Ok(read(...))` 也会跳过读取失败，但读取成功后的 Lua 执行错误会传播，不能把语法错误当成不生效而忽略。[D7#sync-vs-async][S21]

```lua
-- init.lua：只有相应插件已提供时才能执行
require("my-plugin"):setup { key1 = "value1" }
```

这里的 key1 是该插件自己定义的参数，不是 Yazi 的统一配置键。

### `package.toml` 的完整通用键

这个文件由 `ya pkg` 管理插件与 flavor 的锁定版本，不是 Yazi 四份主运行 TOML 的初始化清单。配置根仍是同一个；依赖目标分别复制到 plugins／flavors 目录。[D9#pm][S19]

| 完整键路径 | 类型／格式 | 默认值 | 体验 |
| --- | --- | --- | --- |
| `plugin.deps` | Dependency 表数组；常用 `[[plugin.deps]]` | 未提供 plugin section 时 `[]` | 要安装／锁定的插件。显式 plugin section 下 deps 需要提供。 |
| `flavor.deps` | 同上；常用 `[[flavor.deps]]` | 未提供 flavor section 时 `[]` | 要安装／锁定的 flavor。 |
| `plugin.deps[].use` | string，`owner/repo` 或 `owner/repo:child` | 必填 | GitHub 包位置；包名 kebab-case；前者实际仓库名带 `.yazi`，后者取 monorepo 子目录。 |
| `flavor.deps[].use` | 同上 | 必填 | flavor 包位置。 |
| `plugin.deps[].rev`／`flavor.deps[].rev` | string，提交版本；前缀 `=` 可 pin | `""` | 锁定提交；`=...` 在 upgrade 时不自动升级。 |
| `plugin.deps[].hash`／`flavor.deps[].hash` | string；包管理器生成的内容 hash | `""` | 跟踪文件内容；不是开放器或按键参数。源码反序列化没有强制字符长度，文档示例不构成固定长度校验。 |

```toml
[[plugin.deps]]
use = "yazi-rs/plugins:git"
rev = "=9a1129c"
hash = "a8e15d3c21c02a5af41d46ed04778a02"
```

以上是官方文档的示例值，不是本机已安装版本。没有执行 `ya pkg`、下载或升级。

### Terminal 与 `log` 到底在哪里

本 tag 没有 `[Terminal]`／`[terminal]` TOML 行为节：与本报告范围有关的终端体验通过 `mgr.mouse_events`、`input.cursor_blink`、`preview.image_*`、Überzug 补偿、`theme.app.overall.bg` 和键编码／终端自身设置控制。终端图像协议和 Super 键支持不由一个凭空补出的 Terminal 配置表决定。[D2][D3#notation][D4#app.overall][S2]

也没有 `[log]` TOML 节。tag 实际读取环境变量 **`YAZI_LOG`**，大小写不敏感识别 `ERROR`、`WARN`、`INFO`、`DEBUG`，未设置或其他字符串为 None，默认关闭。它不包含所谓默认 `TRACE` 级别。这里只补充真实入口，不扩展为全部 Yazi 环境变量清单。[S26]

```sh
YAZI_LOG=debug yazi
```

上述只是使用示例，本文没有执行它、创建日志或修改常驻环境。

## 附录 A：暗／亮模式的全部默认图标映射

以下完整转录 `theme-dark.toml` 与 `theme-light.toml` 的 icon 数据：globs 为空，dirs 14 条、files 214 条、exts 485 条、conds 12 条。图标本身是配置数据，不是本文装饰。基础数组没有 bg 或其他 Style 修饰；未给出的属性仍是不指定。[S5]

`icon.globs = []`，暗／亮相同。

<details>
<summary>icon.dirs — 14 条完整默认值</summary>

| name | text | fg（暗） | fg（亮） |
| --- | --- | --- | --- |
| `".config"` | `""` | `"#ff9800"` | `"#ff9800"` |
| `".git"` | `""` | `"#00bcd4"` | `"#009688"` |
| `".github"` | `""` | `"#03a9f4"` | `"#03a9f4"` |
| `".npm"` | `""` | `"#03a9f4"` | `"#03a9f4"` |
| `"Desktop"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Development"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Documents"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Downloads"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Library"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Movies"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Music"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Pictures"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Public"` | `""` | `"#00bcd4"` | `"#009688"` |
| `"Videos"` | `""` | `"#00bcd4"` | `"#009688"` |

</details>

<details>
<summary>icon.files — 214 条完整默认值</summary>

| name | text | fg（暗） | fg（亮） |
| --- | --- | --- | --- |
| `".babelrc"` | `""` | `"#cbcb41"` | `"#666620"` |
| `".bash_profile"` | `""` | `"#89e051"` | `"#447028"` |
| `".bashrc"` | `""` | `"#89e051"` | `"#447028"` |
| `".clang-format"` | `""` | `"#6d8086"` | `"#526064"` |
| `".clang-tidy"` | `""` | `"#6d8086"` | `"#526064"` |
| `".codespellrc"` | `"󰓆"` | `"#35da60"` | `"#239140"` |
| `".condarc"` | `""` | `"#43b02a"` | `"#2d751c"` |
| `".dockerignore"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `".ds_store"` | `""` | `"#41535b"` | `"#41535b"` |
| `".editorconfig"` | `""` | `"#fff2f2"` | `"#333030"` |
| `".env"` | `""` | `"#faf743"` | `"#32310d"` |
| `".eslintignore"` | `""` | `"#4b32c3"` | `"#4b32c3"` |
| `".eslintrc"` | `""` | `"#4b32c3"` | `"#4b32c3"` |
| `".git-blame-ignore-revs"` | `""` | `"#f54d27"` | `"#b83a1d"` |
| `".gitattributes"` | `""` | `"#f54d27"` | `"#b83a1d"` |
| `".gitconfig"` | `""` | `"#f54d27"` | `"#b83a1d"` |
| `".gitignore"` | `""` | `"#f54d27"` | `"#b83a1d"` |
| `".gitlab-ci.yml"` | `""` | `"#e24329"` | `"#aa321f"` |
| `".gitmodules"` | `""` | `"#f54d27"` | `"#b83a1d"` |
| `".gtkrc-2.0"` | `""` | `"#ffffff"` | `"#333333"` |
| `".gvimrc"` | `""` | `"#019833"` | `"#017226"` |
| `".justfile"` | `""` | `"#6d8086"` | `"#526064"` |
| `".luacheckrc"` | `""` | `"#00a2ff"` | `"#007abf"` |
| `".luaurc"` | `""` | `"#00a2ff"` | `"#007abf"` |
| `".mailmap"` | `"󰊢"` | `"#f54d27"` | `"#b83a1d"` |
| `".nanorc"` | `""` | `"#440077"` | `"#440077"` |
| `".npmignore"` | `""` | `"#e8274b"` | `"#ae1d38"` |
| `".npmrc"` | `""` | `"#e8274b"` | `"#ae1d38"` |
| `".nuxtrc"` | `"󱄆"` | `"#00c58e"` | `"#00835f"` |
| `".nvmrc"` | `""` | `"#5fa04e"` | `"#3f6b34"` |
| `".pnpmfile.cjs"` | `""` | `"#f9ad02"` | `"#7c5601"` |
| `".pre-commit-config.yaml"` | `"󰛢"` | `"#f8b424"` | `"#7c5a12"` |
| `".prettierignore"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc.cjs"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc.js"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc.json"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc.json5"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc.mjs"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc.toml"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc.yaml"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".prettierrc.yml"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `".pylintrc"` | `""` | `"#6d8086"` | `"#526064"` |
| `".settings.json"` | `""` | `"#854cc7"` | `"#643995"` |
| `".SRCINFO"` | `"󰣇"` | `"#0f94d2"` | `"#0b6f9e"` |
| `".vimrc"` | `""` | `"#019833"` | `"#017226"` |
| `".Xauthority"` | `""` | `"#e54d18"` | `"#ac3a12"` |
| `".xinitrc"` | `""` | `"#e54d18"` | `"#ac3a12"` |
| `".Xresources"` | `""` | `"#e54d18"` | `"#ac3a12"` |
| `".xsession"` | `""` | `"#e54d18"` | `"#ac3a12"` |
| `".zprofile"` | `""` | `"#89e051"` | `"#447028"` |
| `".zshenv"` | `""` | `"#89e051"` | `"#447028"` |
| `".zshrc"` | `""` | `"#89e051"` | `"#447028"` |
| `"_gvimrc"` | `""` | `"#019833"` | `"#017226"` |
| `"_vimrc"` | `""` | `"#019833"` | `"#017226"` |
| `"AUTHORS"` | `""` | `"#a172ff"` | `"#6b4caa"` |
| `"AUTHORS.txt"` | `""` | `"#a172ff"` | `"#6b4caa"` |
| `"brewfile"` | `""` | `"#701516"` | `"#701516"` |
| `"bspwmrc"` | `""` | `"#2f2f2f"` | `"#2f2f2f"` |
| `"build"` | `""` | `"#89e051"` | `"#447028"` |
| `"build.gradle"` | `""` | `"#005f87"` | `"#005f87"` |
| `"build.zig.zon"` | `""` | `"#f69a1b"` | `"#7b4d0e"` |
| `"bun.lock"` | `""` | `"#eadcd1"` | `"#4e4946"` |
| `"bun.lockb"` | `""` | `"#eadcd1"` | `"#4e4946"` |
| `"cantorrc"` | `""` | `"#1c99f3"` | `"#1573b6"` |
| `"checkhealth"` | `"󰓙"` | `"#75b4fb"` | `"#3a5a7e"` |
| `"cmakelists.txt"` | `""` | `"#dce3eb"` | `"#2c2d2f"` |
| `"code_of_conduct"` | `""` | `"#e41662"` | `"#ab104a"` |
| `"code_of_conduct.md"` | `""` | `"#e41662"` | `"#ab104a"` |
| `"commit_editmsg"` | `""` | `"#f54d27"` | `"#b83a1d"` |
| `"commitlint.config.js"` | `"󰜘"` | `"#2b9689"` | `"#207067"` |
| `"commitlint.config.ts"` | `"󰜘"` | `"#2b9689"` | `"#207067"` |
| `"compose.yaml"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `"compose.yml"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `"config"` | `""` | `"#6d8086"` | `"#526064"` |
| `"containerfile"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `"copying"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"copying.lesser"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"Directory.Build.props"` | `""` | `"#00a2ff"` | `"#007abf"` |
| `"Directory.Build.targets"` | `""` | `"#00a2ff"` | `"#007abf"` |
| `"Directory.Packages.props"` | `""` | `"#00a2ff"` | `"#007abf"` |
| `"docker-compose.yaml"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `"docker-compose.yml"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `"dockerfile"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `"eslint.config.cjs"` | `""` | `"#4b32c3"` | `"#4b32c3"` |
| `"eslint.config.js"` | `""` | `"#4b32c3"` | `"#4b32c3"` |
| `"eslint.config.mjs"` | `""` | `"#4b32c3"` | `"#4b32c3"` |
| `"eslint.config.ts"` | `""` | `"#4b32c3"` | `"#4b32c3"` |
| `"ext_typoscript_setup.txt"` | `""` | `"#ff8700"` | `"#aa5a00"` |
| `"favicon.ico"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"fp-info-cache"` | `""` | `"#ffffff"` | `"#333333"` |
| `"fp-lib-table"` | `""` | `"#ffffff"` | `"#333333"` |
| `"FreeCAD.conf"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"Gemfile"` | `""` | `"#701516"` | `"#701516"` |
| `"gnumakefile"` | `""` | `"#6d8086"` | `"#526064"` |
| `"go.mod"` | `""` | `"#00add8"` | `"#0082a2"` |
| `"go.sum"` | `""` | `"#00add8"` | `"#0082a2"` |
| `"go.work"` | `""` | `"#00add8"` | `"#0082a2"` |
| `"gradle-wrapper.properties"` | `""` | `"#005f87"` | `"#005f87"` |
| `"gradle.properties"` | `""` | `"#005f87"` | `"#005f87"` |
| `"gradlew"` | `""` | `"#005f87"` | `"#005f87"` |
| `"groovy"` | `""` | `"#4a687c"` | `"#384e5d"` |
| `"gruntfile.babel.js"` | `""` | `"#e37933"` | `"#975122"` |
| `"gruntfile.coffee"` | `""` | `"#e37933"` | `"#975122"` |
| `"gruntfile.js"` | `""` | `"#e37933"` | `"#975122"` |
| `"gruntfile.ts"` | `""` | `"#e37933"` | `"#975122"` |
| `"gtkrc"` | `""` | `"#ffffff"` | `"#333333"` |
| `"gulpfile.babel.js"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"gulpfile.coffee"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"gulpfile.js"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"gulpfile.ts"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"hypridle.conf"` | `""` | `"#00aaae"` | `"#008082"` |
| `"hyprland.conf"` | `""` | `"#00aaae"` | `"#008082"` |
| `"hyprlandd.conf"` | `""` | `"#00aaae"` | `"#008082"` |
| `"hyprlock.conf"` | `""` | `"#00aaae"` | `"#008082"` |
| `"hyprpaper.conf"` | `""` | `"#00aaae"` | `"#008082"` |
| `"hyprsunset.conf"` | `""` | `"#00aaae"` | `"#008082"` |
| `"i18n.config.js"` | `"󰗊"` | `"#7986cb"` | `"#515987"` |
| `"i18n.config.ts"` | `"󰗊"` | `"#7986cb"` | `"#515987"` |
| `"i3blocks.conf"` | `""` | `"#e8ebee"` | `"#2e2f30"` |
| `"i3status.conf"` | `""` | `"#e8ebee"` | `"#2e2f30"` |
| `"index.theme"` | `""` | `"#2db96f"` | `"#1e7b4a"` |
| `"ionic.config.json"` | `""` | `"#4f8ff7"` | `"#355fa5"` |
| `"Jenkinsfile"` | `""` | `"#d33833"` | `"#9e2a26"` |
| `"justfile"` | `""` | `"#6d8086"` | `"#526064"` |
| `"kalgebrarc"` | `""` | `"#1c99f3"` | `"#1573b6"` |
| `"kdeglobals"` | `""` | `"#1c99f3"` | `"#1573b6"` |
| `"kdenlive-layoutsrc"` | `""` | `"#83b8f2"` | `"#425c79"` |
| `"kdenliverc"` | `""` | `"#83b8f2"` | `"#425c79"` |
| `"kritadisplayrc"` | `""` | `"#f245fb"` | `"#a12ea7"` |
| `"kritarc"` | `""` | `"#f245fb"` | `"#a12ea7"` |
| `"license"` | `""` | `"#d0bf41"` | `"#686020"` |
| `"license.md"` | `""` | `"#d0bf41"` | `"#686020"` |
| `"lxde-rc.xml"` | `""` | `"#909090"` | `"#606060"` |
| `"lxqt.conf"` | `""` | `"#0192d3"` | `"#016e9e"` |
| `"makefile"` | `""` | `"#6d8086"` | `"#526064"` |
| `"mix.lock"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"mpv.conf"` | `""` | `"#3b1342"` | `"#3b1342"` |
| `"next.config.cjs"` | `""` | `"#ffffff"` | `"#333333"` |
| `"next.config.js"` | `""` | `"#ffffff"` | `"#333333"` |
| `"next.config.ts"` | `""` | `"#ffffff"` | `"#333333"` |
| `"node_modules"` | `""` | `"#e8274b"` | `"#ae1d38"` |
| `"nuxt.config.cjs"` | `"󱄆"` | `"#00c58e"` | `"#00835f"` |
| `"nuxt.config.js"` | `"󱄆"` | `"#00c58e"` | `"#00835f"` |
| `"nuxt.config.mjs"` | `"󱄆"` | `"#00c58e"` | `"#00835f"` |
| `"nuxt.config.ts"` | `"󱄆"` | `"#00c58e"` | `"#00835f"` |
| `"package-lock.json"` | `""` | `"#7a0d21"` | `"#7a0d21"` |
| `"package.json"` | `""` | `"#e8274b"` | `"#ae1d38"` |
| `"PKGBUILD"` | `""` | `"#0f94d2"` | `"#0b6f9e"` |
| `"platformio.ini"` | `""` | `"#f6822b"` | `"#a4571d"` |
| `"playwright.config.cjs"` | `""` | `"#2fad33"` | `"#238226"` |
| `"playwright.config.cts"` | `""` | `"#2fad33"` | `"#238226"` |
| `"playwright.config.js"` | `""` | `"#2fad33"` | `"#238226"` |
| `"playwright.config.mjs"` | `""` | `"#2fad33"` | `"#238226"` |
| `"playwright.config.mts"` | `""` | `"#2fad33"` | `"#238226"` |
| `"playwright.config.ts"` | `""` | `"#2fad33"` | `"#238226"` |
| `"pnpm-lock.yaml"` | `""` | `"#f9ad02"` | `"#7c5601"` |
| `"pnpm-workspace.yaml"` | `""` | `"#f9ad02"` | `"#7c5601"` |
| `"pom.xml"` | `""` | `"#7a0d21"` | `"#7a0d21"` |
| `"prettier.config.cjs"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `"prettier.config.js"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `"prettier.config.mjs"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `"prettier.config.ts"` | `""` | `"#4285f4"` | `"#3264b7"` |
| `"prisma.config.mts"` | `""` | `"#5a67d8"` | `"#444da2"` |
| `"prisma.config.ts"` | `""` | `"#5a67d8"` | `"#444da2"` |
| `"procfile"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"PrusaSlicer.ini"` | `""` | `"#ec6b23"` | `"#9d4717"` |
| `"PrusaSlicerGcodeViewer.ini"` | `""` | `"#ec6b23"` | `"#9d4717"` |
| `"py.typed"` | `""` | `"#ffbc03"` | `"#805e02"` |
| `"QtProject.conf"` | `""` | `"#40cd52"` | `"#2b8937"` |
| `"rakefile"` | `""` | `"#701516"` | `"#701516"` |
| `"readme"` | `"󰂺"` | `"#ededed"` | `"#2f2f2f"` |
| `"readme.md"` | `"󰂺"` | `"#ededed"` | `"#2f2f2f"` |
| `"rmd"` | `""` | `"#519aba"` | `"#36677c"` |
| `"robots.txt"` | `"󰚩"` | `"#5d7096"` | `"#465470"` |
| `"security"` | `"󰒃"` | `"#bec4c9"` | `"#3f4143"` |
| `"security.md"` | `"󰒃"` | `"#bec4c9"` | `"#3f4143"` |
| `"settings.gradle"` | `""` | `"#005f87"` | `"#005f87"` |
| `"svelte.config.js"` | `""` | `"#ff3e00"` | `"#bf2e00"` |
| `"sxhkdrc"` | `""` | `"#2f2f2f"` | `"#2f2f2f"` |
| `"sym-lib-table"` | `""` | `"#ffffff"` | `"#333333"` |
| `"tailwind.config.js"` | `"󱏿"` | `"#20c2e3"` | `"#158197"` |
| `"tailwind.config.mjs"` | `"󱏿"` | `"#20c2e3"` | `"#158197"` |
| `"tailwind.config.ts"` | `"󱏿"` | `"#20c2e3"` | `"#158197"` |
| `"tmux.conf"` | `""` | `"#14ba19"` | `"#0f8c13"` |
| `"tmux.conf.local"` | `""` | `"#14ba19"` | `"#0f8c13"` |
| `"tsconfig.json"` | `""` | `"#519aba"` | `"#36677c"` |
| `"unlicense"` | `""` | `"#d0bf41"` | `"#686020"` |
| `"vagrantfile"` | `""` | `"#1563ff"` | `"#104abf"` |
| `"vercel.json"` | `""` | `"#ffffff"` | `"#333333"` |
| `"vite.config.cjs"` | `""` | `"#ffa800"` | `"#805400"` |
| `"vite.config.cts"` | `""` | `"#ffa800"` | `"#805400"` |
| `"vite.config.js"` | `""` | `"#ffa800"` | `"#805400"` |
| `"vite.config.mjs"` | `""` | `"#ffa800"` | `"#805400"` |
| `"vite.config.mts"` | `""` | `"#ffa800"` | `"#805400"` |
| `"vite.config.ts"` | `""` | `"#ffa800"` | `"#805400"` |
| `"vitest.config.cjs"` | `""` | `"#739b1b"` | `"#4d6712"` |
| `"vitest.config.cts"` | `""` | `"#739b1b"` | `"#4d6712"` |
| `"vitest.config.js"` | `""` | `"#739b1b"` | `"#4d6712"` |
| `"vitest.config.mjs"` | `""` | `"#739b1b"` | `"#4d6712"` |
| `"vitest.config.mts"` | `""` | `"#739b1b"` | `"#4d6712"` |
| `"vitest.config.ts"` | `""` | `"#739b1b"` | `"#4d6712"` |
| `"vlcrc"` | `"󰕼"` | `"#ee7a00"` | `"#9f5100"` |
| `"webpack"` | `"󰜫"` | `"#519aba"` | `"#36677c"` |
| `"weston.ini"` | `""` | `"#ffbb01"` | `"#805e00"` |
| `"workspace"` | `""` | `"#89e051"` | `"#447028"` |
| `"wrangler.jsonc"` | `""` | `"#f48120"` | `"#a35615"` |
| `"wrangler.toml"` | `""` | `"#f48120"` | `"#a35615"` |
| `"xdph.conf"` | `""` | `"#00aaae"` | `"#008082"` |
| `"xmobarrc"` | `""` | `"#fd4d5d"` | `"#a9333e"` |
| `"xmobarrc.hs"` | `""` | `"#fd4d5d"` | `"#a9333e"` |
| `"xmonad.hs"` | `""` | `"#fd4d5d"` | `"#a9333e"` |
| `"xorg.conf"` | `""` | `"#e54d18"` | `"#ac3a12"` |
| `"xsettingsd.conf"` | `""` | `"#e54d18"` | `"#ac3a12"` |

</details>

<details>
<summary>icon.exts — 485 条完整默认值</summary>

| name | text | fg（暗） | fg（亮） |
| --- | --- | --- | --- |
| `"3gp"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"3mf"` | `"󰆧"` | `"#888888"` | `"#5b5b5b"` |
| `"7z"` | `""` | `"#eca517"` | `"#76520c"` |
| `"a"` | `""` | `"#dcddd6"` | `"#494a47"` |
| `"aac"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"ada"` | `""` | `"#599eff"` | `"#3b69aa"` |
| `"adb"` | `""` | `"#599eff"` | `"#3b69aa"` |
| `"ads"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"ai"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"aif"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"aiff"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"android"` | `""` | `"#34a853"` | `"#277e3e"` |
| `"ape"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"apk"` | `""` | `"#34a853"` | `"#277e3e"` |
| `"apl"` | `""` | `"#24a148"` | `"#1b7936"` |
| `"app"` | `""` | `"#9f0500"` | `"#9f0500"` |
| `"applescript"` | `""` | `"#6d8085"` | `"#526064"` |
| `"asc"` | `"󰦝"` | `"#576d7f"` | `"#41525f"` |
| `"asm"` | `""` | `"#0091bd"` | `"#006d8e"` |
| `"ass"` | `"󰨖"` | `"#ffb713"` | `"#805c0a"` |
| `"astro"` | `""` | `"#e23f67"` | `"#aa2f4d"` |
| `"avif"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"awk"` | `""` | `"#4d5a5e"` | `"#3a4446"` |
| `"azcli"` | `""` | `"#0078d4"` | `"#005a9f"` |
| `"bak"` | `"󰁯"` | `"#6d8086"` | `"#526064"` |
| `"bash"` | `""` | `"#89e051"` | `"#447028"` |
| `"bat"` | `""` | `"#c1f12e"` | `"#40500f"` |
| `"bazel"` | `""` | `"#89e051"` | `"#447028"` |
| `"bib"` | `"󱉟"` | `"#cbcb41"` | `"#666620"` |
| `"bicep"` | `""` | `"#519aba"` | `"#36677c"` |
| `"bicepparam"` | `""` | `"#9f74b3"` | `"#6a4d77"` |
| `"bin"` | `""` | `"#9f0500"` | `"#9f0500"` |
| `"blade.php"` | `""` | `"#f05340"` | `"#a0372b"` |
| `"blend"` | `"󰂫"` | `"#ea7600"` | `"#9c4f00"` |
| `"blp"` | `"󰺾"` | `"#5796e2"` | `"#3a6497"` |
| `"bmp"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"bqn"` | `""` | `"#24a148"` | `"#1b7936"` |
| `"brep"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"bz"` | `""` | `"#eca517"` | `"#76520c"` |
| `"bz2"` | `""` | `"#eca517"` | `"#76520c"` |
| `"bz3"` | `""` | `"#eca517"` | `"#76520c"` |
| `"bzl"` | `""` | `"#89e051"` | `"#447028"` |
| `"c"` | `""` | `"#599eff"` | `"#3b69aa"` |
| `"c++"` | `""` | `"#f34b7d"` | `"#a23253"` |
| `"cache"` | `""` | `"#ffffff"` | `"#333333"` |
| `"cast"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"cbl"` | `""` | `"#005ca5"` | `"#005ca5"` |
| `"cc"` | `""` | `"#f34b7d"` | `"#a23253"` |
| `"ccm"` | `""` | `"#f34b7d"` | `"#a23253"` |
| `"cfc"` | `""` | `"#01a4ba"` | `"#017b8c"` |
| `"cfg"` | `""` | `"#6d8086"` | `"#526064"` |
| `"cfm"` | `""` | `"#01a4ba"` | `"#017b8c"` |
| `"cjs"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"clj"` | `""` | `"#8dc149"` | `"#466024"` |
| `"cljc"` | `""` | `"#8dc149"` | `"#466024"` |
| `"cljd"` | `""` | `"#519aba"` | `"#36677c"` |
| `"cljs"` | `""` | `"#519aba"` | `"#36677c"` |
| `"cmake"` | `""` | `"#dce3eb"` | `"#2c2d2f"` |
| `"cob"` | `""` | `"#005ca5"` | `"#005ca5"` |
| `"cobol"` | `""` | `"#005ca5"` | `"#005ca5"` |
| `"coffee"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"conda"` | `""` | `"#43b02a"` | `"#2d751c"` |
| `"conf"` | `""` | `"#6d8086"` | `"#526064"` |
| `"config.ru"` | `""` | `"#701516"` | `"#701516"` |
| `"cow"` | `"󰆚"` | `"#965824"` | `"#70421b"` |
| `"cp"` | `""` | `"#519aba"` | `"#36677c"` |
| `"cpp"` | `""` | `"#519aba"` | `"#36677c"` |
| `"cppm"` | `""` | `"#519aba"` | `"#36677c"` |
| `"cpy"` | `""` | `"#005ca5"` | `"#005ca5"` |
| `"cr"` | `""` | `"#c8c8c8"` | `"#434343"` |
| `"crdownload"` | `""` | `"#44cda8"` | `"#226654"` |
| `"cs"` | `"󰌛"` | `"#596706"` | `"#434d04"` |
| `"csh"` | `""` | `"#4d5a5e"` | `"#3a4446"` |
| `"cshtml"` | `"󱦗"` | `"#512bd4"` | `"#512bd4"` |
| `"cson"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"csproj"` | `"󰪮"` | `"#512bd4"` | `"#512bd4"` |
| `"css"` | `""` | `"#663399"` | `"#663399"` |
| `"csv"` | `""` | `"#89e051"` | `"#447028"` |
| `"cts"` | `""` | `"#519aba"` | `"#36677c"` |
| `"cu"` | `""` | `"#89e051"` | `"#447028"` |
| `"cue"` | `"󰲹"` | `"#ed95ae"` | `"#764a57"` |
| `"cuh"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"cxx"` | `""` | `"#519aba"` | `"#36677c"` |
| `"cxxm"` | `""` | `"#519aba"` | `"#36677c"` |
| `"d"` | `""` | `"#b03931"` | `"#842b25"` |
| `"d.ts"` | `""` | `"#d59855"` | `"#6a4c2a"` |
| `"dart"` | `""` | `"#03589c"` | `"#03589c"` |
| `"db"` | `""` | `"#dad8d8"` | `"#494848"` |
| `"dconf"` | `""` | `"#ffffff"` | `"#333333"` |
| `"desktop"` | `""` | `"#563d7c"` | `"#563d7c"` |
| `"diff"` | `""` | `"#41535b"` | `"#41535b"` |
| `"dll"` | `""` | `"#4d2c0b"` | `"#4d2c0b"` |
| `"doc"` | `"󰈬"` | `"#185abd"` | `"#185abd"` |
| `"Dockerfile"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `"dockerignore"` | `"󰡨"` | `"#458ee6"` | `"#2e5f99"` |
| `"docx"` | `"󰈬"` | `"#185abd"` | `"#185abd"` |
| `"dot"` | `"󱁉"` | `"#30638e"` | `"#244a6a"` |
| `"download"` | `""` | `"#44cda8"` | `"#226654"` |
| `"drl"` | `""` | `"#ffafaf"` | `"#553a3a"` |
| `"dropbox"` | `""` | `"#0061fe"` | `"#0049be"` |
| `"dump"` | `""` | `"#dad8d8"` | `"#494848"` |
| `"dwg"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"dxf"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"ebook"` | `""` | `"#eab16d"` | `"#755836"` |
| `"ebuild"` | `""` | `"#4c416e"` | `"#4c416e"` |
| `"edn"` | `""` | `"#519aba"` | `"#36677c"` |
| `"eex"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"ejs"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"el"` | `""` | `"#8172be"` | `"#61568e"` |
| `"elc"` | `""` | `"#8172be"` | `"#61568e"` |
| `"elf"` | `""` | `"#9f0500"` | `"#9f0500"` |
| `"elm"` | `""` | `"#519aba"` | `"#36677c"` |
| `"eln"` | `""` | `"#8172be"` | `"#61568e"` |
| `"env"` | `""` | `"#faf743"` | `"#32310d"` |
| `"eot"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"epp"` | `""` | `"#ffa61a"` | `"#80530d"` |
| `"epub"` | `""` | `"#eab16d"` | `"#755836"` |
| `"erb"` | `""` | `"#701516"` | `"#701516"` |
| `"erl"` | `""` | `"#b83998"` | `"#8a2b72"` |
| `"ex"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"exe"` | `""` | `"#9f0500"` | `"#9f0500"` |
| `"exs"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"f#"` | `""` | `"#519aba"` | `"#36677c"` |
| `"f3d"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"f90"` | `"󱈚"` | `"#734f96"` | `"#563b70"` |
| `"fbx"` | `"󰆧"` | `"#888888"` | `"#5b5b5b"` |
| `"fcbak"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fcmacro"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fcmat"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fcparam"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fcscript"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fcstd"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fcstd1"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fctb"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fctl"` | `""` | `"#cb333b"` | `"#98262c"` |
| `"fdmdownload"` | `""` | `"#44cda8"` | `"#226654"` |
| `"feature"` | `""` | `"#00a818"` | `"#007e12"` |
| `"fish"` | `""` | `"#4d5a5e"` | `"#3a4446"` |
| `"flac"` | `""` | `"#0075aa"` | `"#005880"` |
| `"flc"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"flf"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"fnl"` | `""` | `"#fff3d7"` | `"#33312b"` |
| `"fodg"` | `""` | `"#fffb57"` | `"#333211"` |
| `"fodp"` | `""` | `"#fe9c45"` | `"#7f4e22"` |
| `"fods"` | `""` | `"#78fc4e"` | `"#28541a"` |
| `"fodt"` | `""` | `"#2dcbfd"` | `"#16667e"` |
| `"frag"` | `""` | `"#5586a6"` | `"#40647c"` |
| `"fs"` | `""` | `"#519aba"` | `"#36677c"` |
| `"fsi"` | `""` | `"#519aba"` | `"#36677c"` |
| `"fsscript"` | `""` | `"#519aba"` | `"#36677c"` |
| `"fsx"` | `""` | `"#519aba"` | `"#36677c"` |
| `"gcode"` | `"󰐫"` | `"#1471ad"` | `"#0f5582"` |
| `"gd"` | `""` | `"#6d8086"` | `"#526064"` |
| `"gemspec"` | `""` | `"#701516"` | `"#701516"` |
| `"geom"` | `""` | `"#5586a6"` | `"#40647c"` |
| `"gif"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"git"` | `""` | `"#f14c28"` | `"#b5391e"` |
| `"glb"` | `""` | `"#ffb13b"` | `"#80581e"` |
| `"gleam"` | `""` | `"#ffaff3"` | `"#553a51"` |
| `"glsl"` | `""` | `"#5586a6"` | `"#40647c"` |
| `"gnumakefile"` | `""` | `"#6d8086"` | `"#526064"` |
| `"go"` | `""` | `"#00add8"` | `"#0082a2"` |
| `"godot"` | `""` | `"#6d8086"` | `"#526064"` |
| `"gpr"` | `""` | `"#6d8086"` | `"#526064"` |
| `"gql"` | `""` | `"#e535ab"` | `"#ac2880"` |
| `"gradle"` | `""` | `"#005f87"` | `"#005f87"` |
| `"graphql"` | `""` | `"#e535ab"` | `"#ac2880"` |
| `"gresource"` | `""` | `"#ffffff"` | `"#333333"` |
| `"gv"` | `"󱁉"` | `"#30638e"` | `"#244a6a"` |
| `"gz"` | `""` | `"#eca517"` | `"#76520c"` |
| `"h"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"haml"` | `""` | `"#eaeae1"` | `"#2f2f2d"` |
| `"hbs"` | `""` | `"#f0772b"` | `"#a04f1d"` |
| `"heex"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"hex"` | `""` | `"#2e63ff"` | `"#224abf"` |
| `"hh"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"hpp"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"hrl"` | `""` | `"#b83998"` | `"#8a2b72"` |
| `"hs"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"htm"` | `""` | `"#e34c26"` | `"#aa391c"` |
| `"html"` | `""` | `"#e44d26"` | `"#ab3a1c"` |
| `"http"` | `""` | `"#008ec7"` | `"#006a95"` |
| `"huff"` | `"󰡘"` | `"#4242c7"` | `"#4242c7"` |
| `"hurl"` | `""` | `"#ff0288"` | `"#bf0266"` |
| `"hx"` | `""` | `"#ea8220"` | `"#9c5715"` |
| `"hxx"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"ical"` | `""` | `"#2b2e83"` | `"#2b2e83"` |
| `"icalendar"` | `""` | `"#2b2e83"` | `"#2b2e83"` |
| `"ico"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"ics"` | `""` | `"#2b2e83"` | `"#2b2e83"` |
| `"ifb"` | `""` | `"#2b2e83"` | `"#2b2e83"` |
| `"ifc"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"ige"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"iges"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"igs"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"image"` | `""` | `"#d0bec8"` | `"#453f43"` |
| `"img"` | `""` | `"#d0bec8"` | `"#453f43"` |
| `"import"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"info"` | `""` | `"#ffffcd"` | `"#333329"` |
| `"ini"` | `""` | `"#6d8086"` | `"#526064"` |
| `"ino"` | `""` | `"#56b6c2"` | `"#397981"` |
| `"ipynb"` | `""` | `"#f57d01"` | `"#a35301"` |
| `"iso"` | `""` | `"#d0bec8"` | `"#453f43"` |
| `"ixx"` | `""` | `"#519aba"` | `"#36677c"` |
| `"jar"` | `""` | `"#ffaf67"` | `"#805834"` |
| `"java"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"jl"` | `""` | `"#a270ba"` | `"#6c4b7c"` |
| `"jpeg"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"jpg"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"js"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"json"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"json5"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"jsonc"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"jsx"` | `""` | `"#20c2e3"` | `"#158197"` |
| `"jwmrc"` | `""` | `"#0078cd"` | `"#005a9a"` |
| `"jxl"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"kbx"` | `"󰯄"` | `"#737672"` | `"#565856"` |
| `"kdb"` | `""` | `"#529b34"` | `"#3e7427"` |
| `"kdbx"` | `""` | `"#529b34"` | `"#3e7427"` |
| `"kdenlive"` | `""` | `"#83b8f2"` | `"#425c79"` |
| `"kdenlivetitle"` | `""` | `"#83b8f2"` | `"#425c79"` |
| `"kicad_dru"` | `""` | `"#ffffff"` | `"#333333"` |
| `"kicad_mod"` | `""` | `"#ffffff"` | `"#333333"` |
| `"kicad_pcb"` | `""` | `"#ffffff"` | `"#333333"` |
| `"kicad_prl"` | `""` | `"#ffffff"` | `"#333333"` |
| `"kicad_pro"` | `""` | `"#ffffff"` | `"#333333"` |
| `"kicad_sch"` | `""` | `"#ffffff"` | `"#333333"` |
| `"kicad_sym"` | `""` | `"#ffffff"` | `"#333333"` |
| `"kicad_wks"` | `""` | `"#ffffff"` | `"#333333"` |
| `"ko"` | `""` | `"#dcddd6"` | `"#494a47"` |
| `"kpp"` | `""` | `"#f245fb"` | `"#a12ea7"` |
| `"kra"` | `""` | `"#f245fb"` | `"#a12ea7"` |
| `"krz"` | `""` | `"#f245fb"` | `"#a12ea7"` |
| `"ksh"` | `""` | `"#4d5a5e"` | `"#3a4446"` |
| `"kt"` | `""` | `"#7f52ff"` | `"#5f3ebf"` |
| `"kts"` | `""` | `"#7f52ff"` | `"#5f3ebf"` |
| `"lck"` | `""` | `"#bbbbbb"` | `"#5e5e5e"` |
| `"leex"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"less"` | `""` | `"#563d7c"` | `"#563d7c"` |
| `"lff"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"lhs"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"lib"` | `""` | `"#4d2c0b"` | `"#4d2c0b"` |
| `"license"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"liquid"` | `""` | `"#95bf47"` | `"#4a6024"` |
| `"lock"` | `""` | `"#bbbbbb"` | `"#5e5e5e"` |
| `"log"` | `"󰌱"` | `"#dddddd"` | `"#4a4a4a"` |
| `"lrc"` | `"󰨖"` | `"#ffb713"` | `"#805c0a"` |
| `"lua"` | `""` | `"#51a0cf"` | `"#366b8a"` |
| `"luac"` | `""` | `"#51a0cf"` | `"#366b8a"` |
| `"luau"` | `""` | `"#00a2ff"` | `"#007abf"` |
| `"m"` | `""` | `"#599eff"` | `"#3b69aa"` |
| `"m3u"` | `"󰲹"` | `"#ed95ae"` | `"#764a57"` |
| `"m3u8"` | `"󰲹"` | `"#ed95ae"` | `"#764a57"` |
| `"m4a"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"m4v"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"magnet"` | `""` | `"#a51b16"` | `"#a51b16"` |
| `"makefile"` | `""` | `"#6d8086"` | `"#526064"` |
| `"markdown"` | `""` | `"#dddddd"` | `"#4a4a4a"` |
| `"material"` | `""` | `"#b83998"` | `"#8a2b72"` |
| `"md"` | `""` | `"#dddddd"` | `"#4a4a4a"` |
| `"md5"` | `"󰕥"` | `"#8c86af"` | `"#5d5975"` |
| `"mdx"` | `""` | `"#519aba"` | `"#36677c"` |
| `"mint"` | `"󰌪"` | `"#87c095"` | `"#44604a"` |
| `"mjs"` | `""` | `"#f1e05a"` | `"#504b1e"` |
| `"mk"` | `""` | `"#6d8086"` | `"#526064"` |
| `"mkv"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"ml"` | `""` | `"#e37933"` | `"#975122"` |
| `"mli"` | `""` | `"#e37933"` | `"#975122"` |
| `"mm"` | `""` | `"#519aba"` | `"#36677c"` |
| `"mo"` | `""` | `"#9772fb"` | `"#654ca7"` |
| `"mobi"` | `""` | `"#eab16d"` | `"#755836"` |
| `"mojo"` | `""` | `"#ff4c1f"` | `"#bf3917"` |
| `"mov"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"mp3"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"mp4"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"mpp"` | `""` | `"#519aba"` | `"#36677c"` |
| `"msf"` | `""` | `"#137be1"` | `"#0e5ca9"` |
| `"mts"` | `""` | `"#519aba"` | `"#36677c"` |
| `"mustache"` | `""` | `"#e37933"` | `"#975122"` |
| `"nfo"` | `""` | `"#ffffcd"` | `"#333329"` |
| `"nim"` | `""` | `"#f3d400"` | `"#514700"` |
| `"nix"` | `""` | `"#7ebae4"` | `"#3f5d72"` |
| `"norg"` | `""` | `"#4878be"` | `"#365a8e"` |
| `"nswag"` | `""` | `"#85ea2d"` | `"#427516"` |
| `"nu"` | `""` | `"#3aa675"` | `"#276f4e"` |
| `"o"` | `""` | `"#9f0500"` | `"#9f0500"` |
| `"obj"` | `"󰆧"` | `"#888888"` | `"#5b5b5b"` |
| `"odf"` | `""` | `"#ff5a96"` | `"#aa3c64"` |
| `"odg"` | `""` | `"#fffb57"` | `"#333211"` |
| `"odin"` | `"󰟢"` | `"#3882d2"` | `"#2a629e"` |
| `"odp"` | `""` | `"#fe9c45"` | `"#7f4e22"` |
| `"ods"` | `""` | `"#78fc4e"` | `"#28541a"` |
| `"odt"` | `""` | `"#2dcbfd"` | `"#16667e"` |
| `"oga"` | `""` | `"#0075aa"` | `"#005880"` |
| `"ogg"` | `""` | `"#0075aa"` | `"#005880"` |
| `"ogv"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"ogx"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"opus"` | `""` | `"#0075aa"` | `"#005880"` |
| `"org"` | `""` | `"#77aa99"` | `"#4f7166"` |
| `"otf"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"out"` | `""` | `"#9f0500"` | `"#9f0500"` |
| `"part"` | `""` | `"#44cda8"` | `"#226654"` |
| `"patch"` | `""` | `"#41535b"` | `"#41535b"` |
| `"pck"` | `""` | `"#6d8086"` | `"#526064"` |
| `"pcm"` | `""` | `"#0075aa"` | `"#005880"` |
| `"pdf"` | `""` | `"#b30b00"` | `"#b30b00"` |
| `"php"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"pl"` | `""` | `"#519aba"` | `"#36677c"` |
| `"pls"` | `"󰲹"` | `"#ed95ae"` | `"#764a57"` |
| `"ply"` | `"󰆧"` | `"#888888"` | `"#5b5b5b"` |
| `"pm"` | `""` | `"#519aba"` | `"#36677c"` |
| `"png"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"po"` | `""` | `"#2596be"` | `"#1c708e"` |
| `"pot"` | `""` | `"#2596be"` | `"#1c708e"` |
| `"pp"` | `""` | `"#ffa61a"` | `"#80530d"` |
| `"ppt"` | `"󰈧"` | `"#cb4a32"` | `"#983826"` |
| `"pptx"` | `"󰈧"` | `"#cb4a32"` | `"#983826"` |
| `"prisma"` | `""` | `"#5a67d8"` | `"#444da2"` |
| `"pro"` | `""` | `"#e4b854"` | `"#725c2a"` |
| `"ps1"` | `"󰨊"` | `"#4273ca"` | `"#325698"` |
| `"psb"` | `""` | `"#519aba"` | `"#36677c"` |
| `"psd"` | `""` | `"#519aba"` | `"#36677c"` |
| `"psd1"` | `"󰨊"` | `"#6975c4"` | `"#4f5893"` |
| `"psm1"` | `"󰨊"` | `"#6975c4"` | `"#4f5893"` |
| `"pub"` | `"󰷖"` | `"#e3c58e"` | `"#4c422f"` |
| `"pxd"` | `""` | `"#5aa7e4"` | `"#3c6f98"` |
| `"pxi"` | `""` | `"#5aa7e4"` | `"#3c6f98"` |
| `"py"` | `""` | `"#ffbc03"` | `"#805e02"` |
| `"pyc"` | `""` | `"#ffe291"` | `"#332d1d"` |
| `"pyd"` | `""` | `"#ffe291"` | `"#332d1d"` |
| `"pyi"` | `""` | `"#ffbc03"` | `"#805e02"` |
| `"pyo"` | `""` | `"#ffe291"` | `"#332d1d"` |
| `"pyw"` | `""` | `"#5aa7e4"` | `"#3c6f98"` |
| `"pyx"` | `""` | `"#5aa7e4"` | `"#3c6f98"` |
| `"qm"` | `""` | `"#2596be"` | `"#1c708e"` |
| `"qml"` | `""` | `"#40cd52"` | `"#2b8937"` |
| `"qrc"` | `""` | `"#40cd52"` | `"#2b8937"` |
| `"qss"` | `""` | `"#40cd52"` | `"#2b8937"` |
| `"query"` | `""` | `"#90a850"` | `"#607035"` |
| `"R"` | `"󰟔"` | `"#2266ba"` | `"#1a4c8c"` |
| `"r"` | `"󰟔"` | `"#2266ba"` | `"#1a4c8c"` |
| `"rake"` | `""` | `"#701516"` | `"#701516"` |
| `"rar"` | `""` | `"#eca517"` | `"#76520c"` |
| `"rasi"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"razor"` | `"󱦘"` | `"#512bd4"` | `"#512bd4"` |
| `"rb"` | `""` | `"#701516"` | `"#701516"` |
| `"res"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"resi"` | `""` | `"#f55385"` | `"#a33759"` |
| `"rlib"` | `""` | `"#dea584"` | `"#6f5242"` |
| `"rmd"` | `""` | `"#519aba"` | `"#36677c"` |
| `"rproj"` | `"󰗆"` | `"#358a5b"` | `"#286844"` |
| `"rs"` | `""` | `"#dea584"` | `"#6f5242"` |
| `"rss"` | `""` | `"#fb9d3b"` | `"#7e4e1e"` |
| `"s"` | `""` | `"#0071c5"` | `"#005594"` |
| `"sass"` | `""` | `"#f55385"` | `"#a33759"` |
| `"sbt"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"sc"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"scad"` | `""` | `"#f9d72c"` | `"#53480f"` |
| `"scala"` | `""` | `"#cc3e44"` | `"#992e33"` |
| `"scm"` | `"󰘧"` | `"#eeeeee"` | `"#303030"` |
| `"scss"` | `""` | `"#f55385"` | `"#a33759"` |
| `"sh"` | `""` | `"#4d5a5e"` | `"#3a4446"` |
| `"sha1"` | `"󰕥"` | `"#8c86af"` | `"#5d5975"` |
| `"sha224"` | `"󰕥"` | `"#8c86af"` | `"#5d5975"` |
| `"sha256"` | `"󰕥"` | `"#8c86af"` | `"#5d5975"` |
| `"sha384"` | `"󰕥"` | `"#8c86af"` | `"#5d5975"` |
| `"sha512"` | `"󰕥"` | `"#8c86af"` | `"#5d5975"` |
| `"sig"` | `"󰘧"` | `"#e37933"` | `"#975122"` |
| `"signature"` | `"󰘧"` | `"#e37933"` | `"#975122"` |
| `"skp"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"sldasm"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"sldprt"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"slim"` | `""` | `"#e34c26"` | `"#aa391c"` |
| `"sln"` | `""` | `"#854cc7"` | `"#643995"` |
| `"slnx"` | `""` | `"#854cc7"` | `"#643995"` |
| `"slvs"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"sml"` | `"󰘧"` | `"#e37933"` | `"#975122"` |
| `"so"` | `""` | `"#dcddd6"` | `"#494a47"` |
| `"sol"` | `""` | `"#519aba"` | `"#36677c"` |
| `"spec.js"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"spec.jsx"` | `""` | `"#20c2e3"` | `"#158197"` |
| `"spec.ts"` | `""` | `"#519aba"` | `"#36677c"` |
| `"spec.tsx"` | `""` | `"#1354bf"` | `"#1354bf"` |
| `"spx"` | `""` | `"#0075aa"` | `"#005880"` |
| `"sql"` | `""` | `"#dad8d8"` | `"#494848"` |
| `"sqlite"` | `""` | `"#dad8d8"` | `"#494848"` |
| `"sqlite3"` | `""` | `"#dad8d8"` | `"#494848"` |
| `"srt"` | `"󰨖"` | `"#ffb713"` | `"#805c0a"` |
| `"ssa"` | `"󰨖"` | `"#ffb713"` | `"#805c0a"` |
| `"ste"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"step"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"stl"` | `"󰆧"` | `"#888888"` | `"#5b5b5b"` |
| `"stories.js"` | `""` | `"#ff4785"` | `"#aa2f59"` |
| `"stories.jsx"` | `""` | `"#ff4785"` | `"#aa2f59"` |
| `"stories.mjs"` | `""` | `"#ff4785"` | `"#aa2f59"` |
| `"stories.svelte"` | `""` | `"#ff4785"` | `"#aa2f59"` |
| `"stories.ts"` | `""` | `"#ff4785"` | `"#aa2f59"` |
| `"stories.tsx"` | `""` | `"#ff4785"` | `"#aa2f59"` |
| `"stories.vue"` | `""` | `"#ff4785"` | `"#aa2f59"` |
| `"stp"` | `"󰻫"` | `"#839463"` | `"#576342"` |
| `"strings"` | `""` | `"#2596be"` | `"#1c708e"` |
| `"styl"` | `""` | `"#8dc149"` | `"#466024"` |
| `"sub"` | `"󰨖"` | `"#ffb713"` | `"#805c0a"` |
| `"sublime"` | `""` | `"#e37933"` | `"#975122"` |
| `"suo"` | `""` | `"#854cc7"` | `"#643995"` |
| `"sv"` | `"󰍛"` | `"#019833"` | `"#017226"` |
| `"svelte"` | `""` | `"#ff3e00"` | `"#bf2e00"` |
| `"svg"` | `"󰜡"` | `"#ffb13b"` | `"#80581e"` |
| `"svgz"` | `"󰜡"` | `"#ffb13b"` | `"#80581e"` |
| `"svh"` | `"󰍛"` | `"#019833"` | `"#017226"` |
| `"swift"` | `""` | `"#e37933"` | `"#975122"` |
| `"t"` | `""` | `"#519aba"` | `"#36677c"` |
| `"tbc"` | `"󰛓"` | `"#1e5cb3"` | `"#1e5cb3"` |
| `"tcl"` | `"󰛓"` | `"#1e5cb3"` | `"#1e5cb3"` |
| `"templ"` | `""` | `"#dbbd30"` | `"#6e5e18"` |
| `"terminal"` | `""` | `"#31b53e"` | `"#217929"` |
| `"test.js"` | `""` | `"#cbcb41"` | `"#666620"` |
| `"test.jsx"` | `""` | `"#20c2e3"` | `"#158197"` |
| `"test.ts"` | `""` | `"#519aba"` | `"#36677c"` |
| `"test.tsx"` | `""` | `"#1354bf"` | `"#1354bf"` |
| `"tex"` | `""` | `"#3d6117"` | `"#3d6117"` |
| `"tf"` | `""` | `"#5f43e9"` | `"#4732af"` |
| `"tfvars"` | `""` | `"#5f43e9"` | `"#4732af"` |
| `"tgz"` | `""` | `"#eca517"` | `"#76520c"` |
| `"tmpl"` | `""` | `"#dbbd30"` | `"#6e5e18"` |
| `"tmux"` | `""` | `"#14ba19"` | `"#0f8c13"` |
| `"toml"` | `""` | `"#9c4221"` | `"#753219"` |
| `"torrent"` | `""` | `"#44cda8"` | `"#226654"` |
| `"tres"` | `""` | `"#6d8086"` | `"#526064"` |
| `"ts"` | `""` | `"#519aba"` | `"#36677c"` |
| `"tscn"` | `""` | `"#6d8086"` | `"#526064"` |
| `"tsconfig"` | `""` | `"#ff8700"` | `"#aa5a00"` |
| `"tsx"` | `""` | `"#1354bf"` | `"#1354bf"` |
| `"ttf"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"twig"` | `""` | `"#8dc149"` | `"#466024"` |
| `"txt"` | `"󰈙"` | `"#89e051"` | `"#447028"` |
| `"txz"` | `""` | `"#eca517"` | `"#76520c"` |
| `"typ"` | `""` | `"#0dbcc0"` | `"#097d80"` |
| `"typoscript"` | `""` | `"#ff8700"` | `"#aa5a00"` |
| `"ui"` | `""` | `"#015bf0"` | `"#015bf0"` |
| `"v"` | `"󰍛"` | `"#019833"` | `"#017226"` |
| `"vala"` | `""` | `"#7b3db9"` | `"#5c2e8b"` |
| `"vert"` | `""` | `"#5586a6"` | `"#40647c"` |
| `"vh"` | `"󰍛"` | `"#019833"` | `"#017226"` |
| `"vhd"` | `"󰍛"` | `"#019833"` | `"#017226"` |
| `"vhdl"` | `"󰍛"` | `"#019833"` | `"#017226"` |
| `"vi"` | `""` | `"#fec60a"` | `"#554203"` |
| `"vim"` | `""` | `"#019833"` | `"#017226"` |
| `"vsh"` | `""` | `"#5d87bf"` | `"#3e5a7f"` |
| `"vsix"` | `""` | `"#854cc7"` | `"#643995"` |
| `"vue"` | `""` | `"#8dc149"` | `"#466024"` |
| `"wasm"` | `""` | `"#5c4cdb"` | `"#4539a4"` |
| `"wav"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"webm"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"webmanifest"` | `""` | `"#f1e05a"` | `"#504b1e"` |
| `"webp"` | `""` | `"#a074c4"` | `"#6b4d83"` |
| `"webpack"` | `"󰜫"` | `"#519aba"` | `"#36677c"` |
| `"wma"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"wmv"` | `""` | `"#fd971f"` | `"#7e4c10"` |
| `"woff"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"woff2"` | `""` | `"#ececec"` | `"#2f2f2f"` |
| `"wrl"` | `"󰆧"` | `"#888888"` | `"#5b5b5b"` |
| `"wrz"` | `"󰆧"` | `"#888888"` | `"#5b5b5b"` |
| `"wv"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"wvc"` | `""` | `"#00afff"` | `"#0075aa"` |
| `"x"` | `""` | `"#599eff"` | `"#3b69aa"` |
| `"xaml"` | `"󰙳"` | `"#512bd4"` | `"#512bd4"` |
| `"xcf"` | `""` | `"#635b46"` | `"#4a4434"` |
| `"xcplayground"` | `""` | `"#e37933"` | `"#975122"` |
| `"xcstrings"` | `""` | `"#2596be"` | `"#1c708e"` |
| `"xls"` | `"󰈛"` | `"#207245"` | `"#207245"` |
| `"xlsx"` | `"󰈛"` | `"#207245"` | `"#207245"` |
| `"xm"` | `""` | `"#519aba"` | `"#36677c"` |
| `"xml"` | `"󰗀"` | `"#e37933"` | `"#975122"` |
| `"xpi"` | `""` | `"#ff1b01"` | `"#bf1401"` |
| `"xslt"` | `"󰗀"` | `"#33a9dc"` | `"#227193"` |
| `"xul"` | `""` | `"#e37933"` | `"#975122"` |
| `"xz"` | `""` | `"#eca517"` | `"#76520c"` |
| `"yaml"` | `""` | `"#6d8086"` | `"#526064"` |
| `"yml"` | `""` | `"#6d8086"` | `"#526064"` |
| `"zig"` | `""` | `"#f69a1b"` | `"#7b4d0e"` |
| `"zip"` | `""` | `"#eca517"` | `"#76520c"` |
| `"zsh"` | `""` | `"#89e051"` | `"#447028"` |
| `"zst"` | `""` | `"#eca517"` | `"#76520c"` |
| `"🔥"` | `""` | `"#ff4c1f"` | `"#bf3917"` |

</details>

<details>
<summary>icon.conds — 12 条完整默认值</summary>

| if | text | fg（暗） | fg（亮） |
| --- | --- | --- | --- |
| `"orphan"` | `""` | `"#ffffff"` | `"#000000"` |
| `"link"` | `""` | `"#9e9e9e"` | `"#9e9e9e"` |
| `"block"` | `""` | `"#cddc39"` | `"#ffc107"` |
| `"char"` | `""` | `"#cddc39"` | `"#ffc107"` |
| `"fifo"` | `""` | `"#cddc39"` | `"#ffc107"` |
| `"sock"` | `""` | `"#cddc39"` | `"#ffc107"` |
| `"sticky"` | `""` | `"#cddc39"` | `"#ffc107"` |
| `"dummy"` | `""` | `"#f44336"` | `"#f44336"` |
| `"dir & hovered"` | `""` | `"#03a9f4"` | `"#03a9f4"` |
| `"dir"` | `""` | `"#03a9f4"` | `"#03a9f4"` |
| `"exec"` | `""` | `"#8bc34a"` | `"#8bc34a"` |
| `"!dir"` | `""` | `"#ffffff"` | `"#000000"` |

</details>

## 7. 反方查询、来源与验证边界

### 7.1 关键路径的反方查询记录

反主张针对的是“是不是还自动从相对配置根、当前项目、`~/.yazi` 或 macOS Application Support 读取”，不是泛泛找批评。

| 工具 | 完整 query／过滤条件 | 命中数／结果 | 结论与限定 |
| --- | --- | --- | --- |
| `mcp__search_tavily_tavily_search` | `site:yazi-rs.github.io/docs Yazi configuration current directory yazi.toml YAZI_CONFIG_HOME relative path ~/.yazi macOS Application Support`；include_domains=`["yazi-rs.github.io"]`，max_results=10，advanced | 请求失败，HTTP 风格状态 432，计划用量超限；没有可用命中数 | 不当作“0 条反证”；换工具查询。 |
| `web_search` | `site:yazi-rs.github.io/docs Yazi "YAZI_CONFIG_HOME" "relative" OR "Application Support" OR "current directory"`；请求 10 条 | 实际返回 7 条 | 1 条是 overview，其余是资源、插件 types/layout、theme、DnD、keymap；没有直接支持“默认 Application Support”“自动当前目录配置”或“相对 YAZI_CONFIG_HOME 生效”的官方命中。未找到反证本身不提高可信度。 |
| `mcp__grep_app_github_searchgithub` | query=`YAZI_CONFIG_HOME\|Application Support\|\.yazi\|current_dir\(`；useRegexp=true，repo=`sxyazi/yazi`，path=`yazi-fs/src/xdg.rs` | 1 个文件／1 个 snippet；命中来自 YAZI_CONFIG_HOME | 索引 URL 是 main，只作定位／反方线索，不作 v26.9.1 事实证据；未命中那些替代分支。原始正则 OR 查询串见下方代码块。 |
| `github file_read`（固定 tag 一手读） | repo=`sxyazi/yazi`，branch=`v26.9.1`，path=`yazi-fs/src/xdg.rs` | 读取 1 份具体文件 | 路径函数只有 absolute YAZI_CONFIG_HOME、Unix XDG／home 回退、Windows config_dir 分支；固定文件读取函数另外确认没有当前项目的自动主配置搜索。排除边界由源码证明，不由搜索无结果证明。[S1][S2] |

为避免 Markdown 表格中的 pipe 混淆，grep.app 反方 query 的原始字符串单独保留：

```text
YAZI_CONFIG_HOME|Application Support|\.yazi|current_dir\(
```

这次正反取证仍只有 Yazi 项目一个独立来源，全部关键事实维持 `[single-source]`。

### 7.2 关键官方来源与可信度

下列文档正文及源码均已读取；`shipped` 只在探路时用于发现，最终默认值均取固定 `v26.9.1` 链接。可信度高的理由是它们直接定义本版本配置；偏见／限制是同一上游维护者可优先描述理想用法或最新文档，不能用它们宣称第三方兼容性、性能优势或本机实际运行效果。每组多个链接仍只算一个独立项目来源。

#### 官方文档（文档声明）

- **D1 — 配置 overview、混合与自定义目录**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/configuration/overview/
  - https://yazi-rs.github.io/docs/configuration/overview/#mixing
  - https://yazi-rs.github.io/docs/configuration/overview/#custom-directory

- **D2 — 一般行为配置**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/configuration/yazi/

- **D3 — 按键与动作参考**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/configuration/keymap/

- **D4 — 外观与规则参考**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/configuration/theme/

- **D5 — VFS 注册及 SFTP**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/configuration/vfs/

- **D6 — Origin 全部枚举**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/plugins/aliases/#origin

- **D7 — 插件路径与同步 init.lua**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/plugins/overview/

- **D8 — flavor 路径与混合**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/flavors/overview/

- **D9 — package.toml 与锁版本**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://yazi-rs.github.io/docs/cli/#pm

#### 固定版本源码（一手直读）

- **S1 — 配置路径解析**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/xdg.rs

- **S2 — 四份 TOML 初始化与一般配置顶层**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/lib.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/yazi.rs

- **S3 — 一般配置完整默认值**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/yazi-default.toml

- **S4 — 八层全部默认 on/run/desc**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/keymap-default.toml

- **S5 — 暗／亮主题完整默认值**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/theme-dark.toml
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/theme-light.toml

- **S6 — mgr 类型与布局约束**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/mgr/mgr.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/mgr/ratio.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/mgr/mouse.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/sorting.rs

- **S7 — preview 类型、范围、缓存目录**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/preview/preview.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/preview/wrap.rs

- **S8 — tasks 完整字段和数值类型**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/tasks/tasks.rs

- **S9 — 弹窗全部字段和标题替换**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/popup/input.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/popup/confirm.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/popup/pick.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/popup/options.rs

- **S10 — 四种插件规则结构与匹配**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/plugin/plugin.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/plugin/fetcher.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/plugin/preloader.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/plugin/previewer.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/plugin/spotter.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/plugin/spotters.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/plugin/mod.rs

- **S11 — selector 与 glob 语义**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/selector.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/selectable.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/pattern.rs

- **S12 — 数组混合和通配兜底去重**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/mixing.rs

- **S13 — 按键各层、字段、混合、键 notation 与平台**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/keymap/keymap.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/keymap/chord.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/keymap/section.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/keymap/key.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/platform.rs

- **S14 — VFS 全部结构、合并和 SFTP 字段**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/vfs/vfs.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/vfs/sftp.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/vfs/service.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/vfs/lua.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/vfs/domains.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/vfs/authorities.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/auth/scheme.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/auth/domain.rs

- **S15 — 全部 Style 字段与未指定／false 区别**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-binding/src/style/style_flat.rs

- **S16 — 全部内置主题字段和 flavor 读取**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/theme.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/flavor.rs

- **S17 — icon 的完整字段、顺序与条件**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/icon.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/icon_names.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/icon_glob.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/icon_cond.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/icon.rs

- **S18 — filetype 字段、全部 is 枚举及首命中**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/filetype.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/filetype_rule.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/is.rs

- **S19 — package 路径和依赖字段**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-cli/src/package/package.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-cli/src/package/dependency.rs

- **S20 — 插件内置优先与插件子入口**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-runner/src/loader/loader.rs

- **S21 — init.lua 路径与执行**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-plugin/src/standard.rs

- **S22 — sort_fallback 的真实排序行为**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/sorter.rs

- **S23 — section／字段／样式值的覆盖粒度**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-codegen/src/lib.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shim/src/toml/traits.rs

- **S24 — TOML 路径字段展开与相对路径绝对化**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/path/normalize.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/path/expand.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/engine/local/absolute.rs

- **S25 — SFTP 认证顺序与用户证书／服务器 key 校验边界**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-vfs/src/engine/sftp/conn.rs

- **S26 — 真正的日志入口与级别**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shim/src/lib.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shim/src/log/level.rs

- **S27 — image_filter 额外值／回退与 JPEG 质量**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-adapter/src/image.rs

- **S28 — 文件缺失与缓存目录权限**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/fns.rs

- **S29 — opener 字段、名称覆盖及平台过滤**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/opener/opener_rule.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/opener/opener.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/opener/opener_rules.rs

- **S30 — open 全部字段与多文件共同 opener**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/open/open_rule.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/open/open.rs

- **S31 — run 动作数组、命令与参数语法**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/event/actions.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/event/action.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/event/cmd.rs

- **S32 — 弹窗 Origin／Offset 的真实数值约束**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-binding/src/position/origin.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-binding/src/position/offset.rs

- **S33 — 自定义主题 section 与字段**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/custom.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/custom_section.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/custom_field.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/kebab_cased_key.rs
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/snake_cased_key.rs

- **S34 — 完整 VFS 默认文件**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/vfs-default.toml

- **S35 — VFS 自定义选项的 Data 允许类型**。[可信度高，上游维护的配置契约／实现；不是独立第三方运行或性能证据]
  - https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/data/data.rs

[D1]: https://yazi-rs.github.io/docs/configuration/overview/
[D2]: https://yazi-rs.github.io/docs/configuration/yazi/
[D3]: https://yazi-rs.github.io/docs/configuration/keymap/
[D4]: https://yazi-rs.github.io/docs/configuration/theme/
[D5]: https://yazi-rs.github.io/docs/configuration/vfs/
[D6]: https://yazi-rs.github.io/docs/plugins/aliases/#origin
[D7]: https://yazi-rs.github.io/docs/plugins/overview/
[D8]: https://yazi-rs.github.io/docs/flavors/overview/
[D9]: https://yazi-rs.github.io/docs/cli/#pm
[D2#opener]: https://yazi-rs.github.io/docs/configuration/yazi/#opener
[D2#open]: https://yazi-rs.github.io/docs/configuration/yazi/#open
[D2#input]: https://yazi-rs.github.io/docs/configuration/yazi/#input
[D3#notation]: https://yazi-rs.github.io/docs/configuration/keymap/#notation
[D3#mgr.shell]: https://yazi-rs.github.io/docs/configuration/keymap/#mgr.shell
[D4#types.color]: https://yazi-rs.github.io/docs/configuration/theme/#types.color
[D4#types.style]: https://yazi-rs.github.io/docs/configuration/theme/#types.style
[D4#app.overall]: https://yazi-rs.github.io/docs/configuration/theme/#app.overall
[D4#filetype]: https://yazi-rs.github.io/docs/configuration/theme/#filetype
[D4#icon]: https://yazi-rs.github.io/docs/configuration/theme/#icon
[D5#usage]: https://yazi-rs.github.io/docs/configuration/vfs/#usage
[D7#sync-vs-async]: https://yazi-rs.github.io/docs/plugins/overview/#sync-vs-async
[D9#pm]: https://yazi-rs.github.io/docs/cli/#pm
[S1]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/xdg.rs
[S2]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/lib.rs
[S3]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/yazi-default.toml
[S4]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/keymap-default.toml
[S5]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/theme-dark.toml
[S6]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/mgr/mgr.rs
[S7]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/preview/preview.rs
[S8]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/tasks/tasks.rs
[S9]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/popup/input.rs
[S10]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/plugin/plugin.rs
[S11]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/selector.rs
[S12]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/mixing.rs
[S13]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/keymap/keymap.rs
[S14]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/vfs/vfs.rs
[S15]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-binding/src/style/style_flat.rs
[S16]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/theme.rs
[S17]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/icon.rs
[S18]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/filetype.rs
[S19]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-cli/src/package/package.rs
[S20]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-runner/src/loader/loader.rs
[S21]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-plugin/src/standard.rs
[S22]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/sorter.rs
[S23]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-codegen/src/lib.rs
[S24]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/path/normalize.rs
[S25]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-vfs/src/engine/sftp/conn.rs
[S26]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shim/src/lib.rs
[S27]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-adapter/src/image.rs
[S28]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/fns.rs
[S29]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/opener/opener_rule.rs
[S30]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/open/open_rule.rs
[S31]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/event/actions.rs
[S32]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-binding/src/position/origin.rs
[S33]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/theme/custom.rs
[S34]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/vfs-default.toml
[S35]: https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shared/src/data/data.rs

### 7.3 实际检索与判停边界

研究共三轮：

1. 宽读官方配置 overview，用 Context7 定位同页及扩展入口，确定文件分工与配置域。
2. 读取一般配置、按键、主题、VFS、插件、flavor、CLI、Origin 参考；读取固定 tag 的预设与配置类型。
3. 对文档缺口定向查源码：sort_fallback、spotters、next、完整主题字段、SFTP 字段、路径绝对化、混合粒度、日志入口；完成路径反方检索并记录其限制。

工具覆盖包括静态网页 `read`、Context7 文档索引、GitHub 文件与代码检索、grep.app、网页搜索。它们是多个获取渠道，但事实依据都限定在 Yazi 官方文档与 sxyazi/yazi；没有采用博客、其他 awesome-list、第三方教程或 DeepWiki 生成结论。

一条 VFS 补充搜索返回的是合成答案而非可审计结果列表，并声称移除了 18 个范围外来源；该内容**未作为事实或命中数使用**，已向工具反馈问题。另一 Tavily 请求因额度返回 432；没有把失败写成“0 命中”。关键结论由已直接读到的官方页面／固定 tag 源码支持。辅助定位命中已查但未逐条列入来源清单。


### 7.4 验证边界

- **已直接读取**：官方参考正文；v26.9.1 四类预设（包括暗／亮 theme）；对应 serde 结构、范围校验、路径解析、覆盖／混合、插件加载与包依赖路径；文档漏项已经依 tag 补齐。
- **本机观察仅环境**：HOME 与两个配置根环境变量。没有读取个性化配置内容、遍历用户插件、启动 Yazi 或确认另一现存进程的配置根。
- **未做运行验证**：SFTP 连接、终端字体与图形能力、外部 opener 程序、实际布局和性能仍依具体环境。配置语义来自官方说明或源码直读。
- **已完成交付自检**：键与配置域覆盖、完整默认绑定和默认值、TOML 示例语法、来源引用与表格结构已检查；这是本子任务的静态自检，不宣称经过独立第三方 QA。
- **运行效果限定**：字体是否具有默认图标、OSC 11／CSI u／Überzug 支持、实际布局和性能仍依终端与系统；本文给出文档语义或源码推断，不把它们冒充本机实测。
- **允许值边界**：数值范围来自 tag 类型／校验，Color 采用官方公开格式；没有借助非官方依赖资料扩大颜色契约。HOME 缺失时 dirs 的内部账户查找细节未独立读取；只陈述 Yazi 的函数调用与失败条件。
- **扩展边界**：自定义 opener 名称、Lua 插件选项、VFS provider opts 和自定义主题 section 是开放结构，统一固定键与数据类型已列；不假装能枚举第三方插件的全部私有参数。
- **安全边界**：password／key_passphrase 可明文保存；SFTP 服务器 key 校验与 no_cert_verify 的区别直接据 tag 说明，没有连接实测。cache_dir 在 Unix 创建／要求当前用户拥有的目录，拒绝最终路径 symlink，并设权限 0700；不要直接用属于别人的公共目录作为缓存根。[S7][S28]


轮次：3，判停：a——路径、v26.9.1 实际配置域与键、允许值、默认值、体验影响、反方检索与证据边界均已覆盖，并完成交付自检；未实测的外部环境／运行效果明确标出。
