# Yazi 配置路径、预设与边界的官方依据

> Source: Yazi 官方配置文档与 sxyazi/yazi v26.9.1 源码，具体 URL 见各节
> Collected: 2026-11-22
> Published: Unknown

本文件保存本次研究直接读取的关键原文和源码摘录。完整逐键研究笔记位于仓库 `docs/research/2026-11-22-yazi-configuration.md`。

## 配置总览与默认路径

来源：https://yazi-rs.github.io/docs/configuration/overview/

页面显示版本 `26.9.1`。配置总览列出三份主配置：

```text
yazi.toml - General configuration.
keymap.toml - Keybindings configuration.
theme.toml - Color scheme configuration.
```

默认目录原文：

```text
~/.config/yazi/ on Unix-like systems.
%AppData%\yazi\config\ on Windows.
```

自定义目录原文：

```text
You can change the Yazi configuration directory by exporting the YAZI_CONFIG_HOME environment variable.
```

覆盖规则原文：

```text
The options from your configuration file will be used to override the default.
```

按键混合原文：

```text
And instead want to customize your keys upon the default, you can use prepend_* or append_* directories to prepend or append them to the default.
```

## 配置根的实际解析

来源：https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-fs/src/xdg.rs

```rust
fn load_config_dir() -> PathBuf {
	if let Some(p) = env::var_os("YAZI_CONFIG_HOME").map(PathBuf::from)
		&& p.is_absolute()
	{
		return p;
	}

	#[cfg(windows)]
	{
		dirs::config_dir().map(|p| p.join("yazi\\config")).expect("Failed to get config directory")
	}
	#[cfg(unix)]
	{
		env::var_os("XDG_CONFIG_HOME")
			.map(PathBuf::from)
			.filter(|p| p.is_absolute())
			.map(|p| p.join("yazi"))
			.or_else(|| dirs::home_dir().map(|h| h.join(".config/yazi")))
			.expect("Failed to get config directory")
	}
}
```

这段实现只接受绝对路径形式的 `YAZI_CONFIG_HOME` 与 `XDG_CONFIG_HOME`。Unix 回退到用户家目录下 `.config/yazi`；Windows 回退到系统配置目录下 `yazi/config`。

## 初始化读取的配置文件

来源：https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/src/lib.rs

```rust
yazi = parse("yazi.toml", yazi.deserialize_over(&yazi::Yazi::read()?))?;
keymap = parse("keymap.toml", keymap.deserialize_over(&keymap::Keymap::read()?))?;
vfs = parse("vfs.toml", vfs.deserialize_over(&vfs::Vfs::read()?))?;
theme = parse("theme.toml", theme.deserialize_over(&Theme::read()?))?;
```

`v26.9.1` 初始化还读取 `vfs.toml`。官方 vfs 参考：https://yazi-rs.github.io/docs/configuration/vfs/

## 内置主题与覆盖

来源：https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-config/preset/README.md

```text
theme-dark.toml: Dark color scheme (loaded when your terminal is in dark mode)
theme-light.toml: Light color scheme (loaded when your terminal is in light mode)

These files are already included with Yazi when you install the release, so you don't need to manually download or copy them to your Yazi configuration directory.
```

同一份 README 说明用户 `theme.toml` 可以覆盖 `theme-light.toml` 和 `theme-dark.toml`。

flavor 文档：https://yazi-rs.github.io/docs/flavors/overview/

```text
Behind the scenes, Yazi merges the user's theme.toml with the flavor's flavor.toml automatically, and the user's always takes precedence over the flavor.
```

flavor 默认放在配置目录的 `flavors` 子目录，插件放在 `plugins` 子目录。插件文档：https://yazi-rs.github.io/docs/plugins/overview/

配置总览还说明自定义目录可以包含 `init.lua`：

```text
will start Yazi with ~/.config/yazi-alt as the configuration directory, and can have its own yazi.toml, keymap.toml, init.lua, etc. files within it.
```

包管理文档：https://yazi-rs.github.io/docs/cli/#pm

```text
it will automatically clone them from GitHub, copy them to your plugins directory, and update the package.toml to lock their versions
```

因此 `init.lua` 负责 Lua 初始化，`package.toml` 记录 `ya pkg` 管理的插件和 flavor 版本。

## 日志入口

来源：https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shim/src/lib.rs

```rust
log::LOG_LEVEL.replace(<_>::from(std::env::var("YAZI_LOG").unwrap_or_default()));
```

来源：https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-shim/src/log/level.rs

```rust
match s.as_str() {
	"ERROR" => Self::Error,
	"WARN" => Self::Warn,
	"INFO" => Self::Info,
	"DEBUG" => Self::Debug,
	_ => Self::None,
}
```

`YAZI_LOG` 是环境变量，识别 `ERROR`、`WARN`、`INFO`、`DEBUG`，其他字符串和空值映射为 `None`。

## SFTP 服务器密钥边界

来源：https://github.com/sxyazi/yazi/blob/v26.9.1/yazi-vfs/src/engine/sftp/conn.rs

```rust
async fn check_server_key(
	&mut self,
	_server_public_key: &PublicKeyOrCertificate,
) -> Result<bool, Self::Error> {
	Ok(true)
}
```

同一文件仅在 `no_cert_verify` 为 false 时验证用户证书签名和有效期。`check_server_key` 直接返回 true，未执行服务器 host key 校验。
