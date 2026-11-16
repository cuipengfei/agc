# Azul Zulu CA 包语义与本机 headless AWT 症状

> Source: https://docs.azul.com/core/install/linux-ca-deb; 本机 `dpkg`、文件系统检查、`jshell` 与 Xvfb 实测
> Collected: 2026-11-17
> Published: Unknown（Azul 文档无发布日期）

## Azul 文档：CA 的含义

> **Community Availability (CA)** distributions are Azul Zulu Builds of OpenJDK that are free to download and use.

包表原文：

| Package | Description |
|---|---|
| `zulu<X>-ca-jdk` | Java Development Kit (including graphic components). |
| `zulu<X>-ca-jdk-headless` | Headless Java Development Kit (without GUI support). |
| `zulu<X>-ca-jre` | Java Runtime Environment including graphic components. |
| `zulu<X>-ca-jre-headless` | Headless Java Runtime Environment (without GUI support). |

文档同时说明：不带 `-ca-` 后缀的同名包是空包，依赖 `-ca-` 对应包；两种写法安装同一套 Zulu。

## 本机安装前状态

`dpkg -l` 中与 Zulu 相关的包：

```text
ii  zulu25-ca-jdk-headless                            25.0.5.0.3-5  amd64
ii  zulu25-ca-jre-headless                            25.0.5.0.3-5  amd64
ii  zulu25-jdk-headless                               25.0.5.0.3-5  amd64
ii  zulu25-jre-headless                               25.0.5.0.3-5  amd64
```

系统 `java` 指向：

```text
zulu25-ca-jre-headless: /usr/lib/jvm/zulu25-ca-amd64/bin/java
```

`/usr/lib/jvm/zulu25-ca-amd64/lib/` 中的 AWT 库：

```text
644  libawt.so          794.5K
644  libawt_headless.so  31.2K
```

没有 `libawt_xawt.so`。

## headless 判定

在 `xvfb-run` 提供的虚拟显示里运行 `jshell`：

```text
DISPLAY=:99
xwininfo: Window id: 0x21f (the root window) (has no name)
  Width: 1280
...
-> true
```

`true` 来自 `java.awt.GraphicsEnvironment.isHeadless()`。

同一环境下启动 `uml-viewer --restart library.edn`，进程退出并输出：

```text
Cannot run sketch without a display. Read this for possible solutions:
https://github.com/processing/processing/wiki/Running-without-a-Display
```

## 补装图形组件后

安装包：

```bash
sudo apt-get install -y zulu25-ca-jre
```

装到的版本：

```text
zulu25-ca-jre 25.0.5.0.3-5 install ok installed
```

`apt-get -s install zulu25-ca-jre` 显示只新增一个包，不升级、不移除其他包：

```text
The following NEW packages will be installed:
  zulu25-ca-jre
0 upgraded, 1 newly installed, 0 to remove and 8 not upgraded.
```

同一 Xvfb 测试再次运行 `uml-viewer --restart library.edn`，`xdotool search --name "^UML viewer$"` 找到窗口：

```text
xwininfo: Window id: 0x200007 "UML viewer"

  Absolute upper-left X:  -110
  Absolute upper-left Y:  52
  Width: 1500
  Height: 920
  Depth: 24
  Visual Class: TrueColor
  Map State: IsViewable
  -geometry 1500x920+-110+52
```

窗口尺寸 1500×920，测试结束前由测试脚本关闭进程。

## 证据边界

- 本机检查证明：只有 headless Zulu 包时，`GraphicsEnvironment.isHeadless()` 返回 `true`，sketch 拒绝启动。
- 补装带图形组件的 JRE 后，同一启动路径能创建窗口。
- 这组记录不覆盖真实桌面、WSLg 或其他显示通道的可见性。
