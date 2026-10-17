# Tern Web 设置存储原始材料

> Source: Tern 0.9.2 当前 WASM 初始内存中的设置实现摘录；本机 `tern --help` 与 `tern plugin dir`；官方 Packages and Manifests 文档
> Collected: 2026-10-17
> Published: Unknown

本材料不记录浏览器凭据或 URL token。

## 本机配置目录观察

本机 `printenv TERN_CONFIG_DIR` 无输出。`/home/cpf/.local/bin/tern plugin dir` 返回：

```text
/home/cpf/.config/tern/plugins
```

当时 `/home/cpf/.config/tern/` 的条目只有 `web-token` 和 `plugins/`，没有 `settings.json` 文件。

官方 Packages and Manifests 文档说明：Linux 的 `<config>` 为 `$XDG_CONFIG_HOME/tern`（`~/.config/tern`），设置 `TERN_CONFIG_DIR` 时 `<config>` 与 `<state>` 都为 `$TERN_CONFIG_DIR`。主机端 `<config>/settings.json` 中的 `plugins` 和 `plugins_disabled` 决定哪些插件加载，每台机器读取自己的设置。

## Tern 0.9.2 WASM 内嵌设置实现

以下英文代码来自当前模块初始内存的可读字符串，按原始含义整理：

```text
//! Settings persistence: loaded once, saved on every change.
//! Settings live in config_dir/settings.json, found the same way as
//! known_hosts and hosts.txt. The web tab keeps its own copy in the
//! browser's localStorage under the same file name.
//!
//! Only the delta from Default is stored: a fresh write of an unchanged
//! settings value produces "{}" rather than the full struct.

pub const FILE: &str = "settings.json";
```

```text
#[cfg(target_arch = "wasm32")]
fn load() -> (Settings, bool) {
    let mut settings = match web_storage::load() {
        Some(text) => match serde_json::from_str::<Settings>(&text) {
            Ok(s) => s,
            Err(e) => {
                console::warn(&format!("Settings: bad json in localStorage, using defaults: {e}"));
                Settings::default()
            }
        },
        None => Settings::default(),
    };
    settings.sanitize();
    let dirty = settings.keybinds_dirty;
    if dirty {
        settings.keybinds_dirty = false;
        console::info("Settings: loaded legacy keybinds, marking for migration");
    }
    console::info("Settings: loaded");
    (settings, dirty)
}
```

```text
#[cfg(target_arch = "wasm32")]
mod web_storage {
    use super::FILE;
    fn local_storage() -> Option<web_sys::Storage> {
        web_sys::window()?.local_storage().ok().flatten()
    }
    pub fn load() -> Option<String> {
        let raw = local_storage()?.get_item(FILE).ok().flatten()?;
        if raw.is_empty() { None } else { Some(raw) }
    }
    pub fn save(json: &str) {
        if let Some(storage) = local_storage() {
            if let Err(e) = storage.set_item(FILE, json) {
                console::warn(&format!("Settings: save failed: {e:?}"));
            }
        }
    }
}
```

同段还包含原生实现：

```text
#[cfg(not(target_arch = "wasm32"))]
fn load() -> (Settings, bool) {
    let mut settings = match super::config_dir() {
        Some(dir) => {
            let path = dir.join(FILE);
            match std::fs::read_to_string(&path) {
                Ok(text) => match serde_json::from_str::<Settings>(&text) {
                    Ok(s) => s,
                    Err(e) => {
                        console::warn(&format!(
                            "Settings: bad json in {}, using defaults: {e}",
                            path.display()
                        ));
                        Settings::default()
                    }
                },
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => Settings::default(),
                Err(e) => {
                    console::warn(&format!("Settings: read {}: {e}", path.display()));
                    Settings::default()
                }
            }
        }
        None => Settings::default(),
    };
    settings.sanitize();
    let dirty = settings.keybinds_dirty;
    if dirty {
        settings.keybinds_dirty = false;
        console::info("Settings: loaded legacy keybinds, marking for migration");
    }
    (settings, dirty)
}
```

```text
#[cfg(not(target_arch = "wasm32"))]
pub fn save(settings: &Settings) {
    let Some(dir) = super::config_dir() else { return };
    let json = match serde_json::to_string_pretty(settings) {
        Ok(j) => j,
        Err(e) => {
            console::warn(&format!("Settings: save failed: {e}"));
            return;
        }
    };
    let path = dir.join(FILE);
    if let Err(e) = std::fs::create_dir_all(&dir).and_then(|_| std::fs::write(&path, &json)) {
        console::warn(&format!("Settings: write {}: {e}", path.display()));
    }
}
```

## 行为解释边界

Web 实现使用浏览器 `localStorage` 的 `settings.json` 键。浏览器 localStorage 按浏览器配置文件和站点 origin 隔离；更换协议、主机或端口会进入不同的 origin 存储空间。原生实现使用配置目录下的 `settings.json`。

主机配置目录不存在该文件不表示 Web 设置未保存；两者是不同的存储位置。官方 Packages 页面关于 `plugins` 与 `plugins_disabled` 的说明只证明主机插件开关，不用于推断 Web 的全部设置内容。
