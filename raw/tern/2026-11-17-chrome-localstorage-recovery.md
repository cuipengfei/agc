# 覆盖式写入丢失 Chrome 本地设置与 LevelDB 历史恢复

> Source: 本机 Windows Chrome profile `C:\Users\<USER>\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb` 的只读副本、`ccl_chromium_reader`（GitHub `cclgroupltd/ccl_chromium_reader`）、Google LevelDB `leveldbutil`、Tern web 端 `settings.json` 键
> Collected: 2026-11-17
> Published: Unknown

## 事故

在 Tern 页面 Console 执行

```js
localStorage.setItem('settings.json', JSON.stringify({ font_family: 'Maple Mono NF CN' }));
location.reload();
```

整个 `settings.json` 值被替换为 50 字节：

```
{"theme":"Dark","font_family":"Maple Mono NF CN"}
```

原有字段（主题偏好、光标样式、标签布局、材料与密度、面板标题、`files.auto_save` 等）全部丢失。`localStorage.setItem` 按整键替换，不做字段合并。

## Chrome Local Storage 的键格式

Chrome 把 Local Storage 存在 `Local Storage/leveldb` 下的标准 LevelDB 里，用户键编码为 `_<origin><script key>`：

```
_http://127.0.0.1:8378settings.json
_http://127.0.0.1:8378<REDACTED>
```

同名 origin 另有两类元数据键：`META:<origin>` 与 `METAACCESS:<origin>`。读取时按 `_<origin>` 前缀过滤即可。

## 取证步骤

**1. 一致副本**

Chrome 运行时 `LOCK` 文件无法直接复制（`cp` 报 `Input/output error`），逐文件复制 `.ldb`、`.log`、`CURRENT`、`MANIFEST-*` 并跳过 `LOCK`。副本对 LevelDB 可写打开会触发压缩并改写副本，需要恢复时保留一份只读副本。

**2. 工具选择**

| 工具 | 结果 |
|---|---|
| `leveldbutil dump <file>.ldb`（Google LevelDB 源码 `db/leveldbutil.cc`，`Table::Open` + `ParseInternalKey`） | 对 Chrome 的 `.ldb` 报 `Corruption: corrupted snappy compressed block length` |
| `python-snappy` 直接解压切口片段 | 报空错误，SSTable 数据块带块尾与压缩类型，不是独立 Snappy 流 |
| `plyvel` | 源码编译失败，无 wheel |
| `ccl_chromium_reader` | 可用，能读出全部历史版本 |

`ccl_chromium_reader` 不在 PyPI，从 GitHub 安装：

```bash
git clone --depth 1 https://github.com/cclgroupltd/ccl_chromium_reader.git
cd ccl_chromium_reader && pip install --break-system-packages -e .
```

**3. 读 internal keys**

`ccl_chromium_reader.storage_formats.ccl_leveldb.LdbFile` 直接按 SSTable 结构迭代，返回 `Record`，字段为 `user_key`、`value`、`seq`、`state`、`offset`、`origin_file`、`was_compressed`：

```python
from ccl_chromium_reader.storage_formats.ccl_leveldb import LdbFile

for rec in LdbFile(pathlib.Path('019306.ldb')):
    key = rec.user_key.decode('utf-8', errors='replace')
    if '8378' in key and 'settings' in key:
        print(rec.seq, rec.state, len(rec.value or b''), rec.value)
```

同一文件里 `_http://127.0.0.1:8378settings.json` 出现 5 条记录，长度分别为 30、50、30、778、655 字节，全部 `KeyState.Live`，seq 递增。`LocalStoreDb.iter_all_records()` 也可用，但字段是 `storage_key`、`script_key`、`value`、`leveldb_seq_number`、`is_live`，没有 `.key`。

**4. 取最长且可解析的版本**

778 字节记录的 seq 为 591348，内容覆盖了事故前全部字段；655 字节是其少了四个 `font_family_*` 的相邻版本。按 `len(value)` 与 `seq` 排序即可挑出完整版本。

## 找回的配置

778 字节记录解析后为 30 个字段：

```
theme, theme_dark, copy_on_select, cursor{shape, programs, smooth_blink, glide, trail, pulse},
pointer_shape, scrollbar, contrast, layout,
font_family, font_family_bold, font_family_italic, font_family_bold_italic,
tabs, pane_headers, dim_unfocused, widget_look, material, density,
surface_headings, surface_diffs, expand_thoughts, keep_composer_open,
surface_chat, prefs_width, msaa, files{auto_save{after_delay}}, agents{notify_turn_finished}
```

其中 `font_family` 系列已是 `Maple Mono NF CN`，说明事故前的配置里字体设置已生效。

## 恢复写法

合并而非替换。Console 里用立即执行函数避免 `const` 重复声明报 `Invalid or unexpected token`：

```js
(() => {
  const current = JSON.parse(localStorage.getItem('settings.json') || '{}');
  localStorage.setItem('settings.json', JSON.stringify({ ...current, ...restored }));
  location.reload();
})();
```

把找回的完整对象作为 `restored` 传入。直接写字符串字面量时注意换行：`const s =` 与 JSON 分行会被 REPL 当成两条语句，报 `Uncaught SyntaxError: Invalid or unexpected token`。

到本轮结束时浏览器侧的写回没有回执：用户最后一次执行时 Console 报 `Uncaught SyntaxError: Invalid or unexpected token`，后续合并命令尚未确认执行成功。本记录只声明「旧配置已从 LevelDB 提取并通过 JSON 校验」，不声明浏览器已恢复。

## 边界

- 恢复依赖 Chrome 尚未压缩掉历史版本。触发 compaction 后旧记录可能物理消失，届时只能按已知字段重建。
- 本记录不写 token 值；同名 origin 的凭据键以 `<REDACTED>` 表示，读取时按凭据处理。
- Chrome 不同版本的 Local Storage 编码可能变化，键前缀与 internal key 结构需按实际 profile 复核。
