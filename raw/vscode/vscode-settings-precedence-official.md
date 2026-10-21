# VS Code 官方设置文档：设置优先级与用户设置文件位置

> Source: https://code.visualstudio.com/docs/configure/settings
> Collected: 2026-10-21
> Published: Unknown

以下为官方文档相关小节的原文摘录，未改写措辞。

## Settings precedence

Configurations can be overridden at multiple levels by the different setting scopes. In the following list, **later scopes override earlier scopes**:

* Default settings - This scope represents the default unconfigured setting values.
* User settings - Apply globally to all VS Code instances.
* Remote settings - Apply to a remote machine opened by a user.
* Workspace settings - Apply to the open folder or workspace.
* Workspace Folder settings - Apply to a specific folder of a [multi-root workspace](/docs/editing/workspaces/multi-root-workspaces.md).
* Language-specific default settings - These are language-specific default values that can be contributed by extensions.
* Language-specific user settings - Same as User settings, but specific to a language.
* Language-specific remote settings - Same as Remote settings, but specific to a language.
* Language-specific workspace settings - Same as Workspace settings, but specific to a language.
* Language-specific workspace folder settings - Same as Workspace Folder settings, but specific to a language.
* Policy settings - Set by the system administrator, these values always override other setting values.

## User settings.json location

#### User settings.json location

Depending on your platform, the user settings file is located here:

* **Windows** `%APPDATA%\Code\User\settings.json`
* **macOS** `$HOME/Library/Application\ Support/Code/User/settings.json`
* **Linux** `$HOME/.config/Code/User/settings.json`

## Workspace settings

Workspace settings are specific to a project and override user settings. If you have specific settings that you want to apply to a specific project, you can use workspace settings. For example, for a backend server project, you might want to set the `files.exclude` setting to exclude the `node_modules` folder from the File Explorer.
