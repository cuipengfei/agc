# uml-viewer 的图形界面、依赖与启动面

> Source: https://github.com/unclebob/uml-viewer/blob/master/README.md; https://github.com/unclebob/uml-viewer/blob/master/scripts/get-uml-viewer; https://github.com/unclebob/uml-viewer/blob/master/deps.edn; https://github.com/unclebob/uml-viewer/blob/master/src/uml_viewer/adapters/core.clj; https://github.com/unclebob/uml-viewer/blob/master/src/uml_viewer/adapters/sketch.clj; https://github.com/unclebob/uml-viewer/blob/master/src/uml_viewer/adapters/source_window.clj; https://github.com/unclebob/uml-viewer/blob/master/src/uml_viewer/domain/log.clj; https://repo.clojars.org/quil/quil/4.3.1563/quil-4.3.1563.pom; https://repo.clojars.org/quil/processing-core/4.2.3/processing-core-4.2.3.pom
> Collected: 2026-11-17
> Published: Unknown

采集时 `git ls-remote https://github.com/unclebob/uml-viewer.git refs/heads/master` 返回：

```text
ad6c36d964ef4dab07623ab98122d72010ecb5a6	refs/heads/master
```

## README：运行前提与启动方式

> ## Run
>
> Needs Clojure CLI and Java 21+.

> From **any Clojure project** you want to view (no local uml-viewer checkout
> needed):
>
> ```bash
> cd /path/to/the-project
> curl -fsSL https://raw.githubusercontent.com/unclebob/uml-viewer/master/scripts/get-uml-viewer -o get-uml-viewer
> chmod +x get-uml-viewer
> ./get-uml-viewer               # fetch, write ./uml, start
> ./uml                          # later fresh starts (returns immediately)
> ./uml --restart                # companion only: new JVM, restore last view
> ```

> `scripts/get-uml-viewer` is in this repo. It clones uml-viewer into
> **gitignored** `.uml-viewer/uml-viewer/` (a nested `.git` there is invisible
> to the project's repo), writes `./uml`, and starts the viewer. `--install-only`
> skips the start.

> `./uml` returns immediately (`clojure` in the background, not `clj`/`rlwrap`).
> The diagram is its own JVM. Exceptions and JVM output append to
> **`uml-viewer-log.txt`** in the project directory (gitignored).

> A **tmux** session unique to the examined project starts interactive Grok in
> that directory (`--yolo --trust --rules …` plus a launch prompt).

## scripts/get-uml-viewer：安装与包装

脚本开头：

```zsh
#!/bin/zsh
# Fetch uml-viewer into this project and start it.
set -euo pipefail

repo_url="${UML_VIEWER_REPO_URL:-https://github.com/unclebob/uml-viewer.git}"
ref="${UML_VIEWER_REF:-master}"
tool_dir=".uml-viewer/uml-viewer"
quil_ver="4.3.1563"
```

`ensure_gitignore` 写入的标记：

```zsh
printf '%s\n' "$begin" ".uml-viewer/" "uml-viewer-log.txt" "$end" >> "$tmp_file"
```

生成的 `./uml` 中，依赖声明为：

```clojure
deps="{:deps {uml-viewer/uml-viewer {:local/root \"$abs\"} quil/quil {:mvn/version \"$quil_ver\"}}}"
```

生成的 `./uml` 中，EDN 查找函数：

```zsh
edn_path() {
  local name base f
  name="$(basename "$ROOT")"
  if [[ -f "examples/${name}.edn" ]]; then
    echo "examples/${name}.edn"
    return
  fi
  if [[ -d examples ]]; then
    for f in examples/*.edn(N); do
      [[ -f "$f" ]] || continue
      base="${f:t}"
      [[ "$base" == *.policy.edn ]] && continue
      echo "$f"
      return
    done
  fi
}
```

启动行为：

```zsh
nohup clojure -Sdeps "$DEPS" -M -m uml-viewer.main.uml-viewer "$@" >> "$LOG" 2>&1 </dev/null &
```

脚本注释说明：

```zsh
# `clj` is rlwrap on Homebrew; a background rlwrap stops (SIGTTOU) and
# never starts the JVM. `clojure` is the same CLI without the tty wrapper.
```

## deps.edn：项目依赖与别名

```clojure
{:paths ["src"]
 :deps {org.clojure/clojure {:mvn/version "1.12.0"}}
 :aliases
 {:spec {:extra-paths ["spec"]
         :extra-deps {speclj/speclj {:mvn/version "3.12.2"}
                      quil/quil {:mvn/version "4.3.1563"}}
         :jvm-opts ["-Dapple.awt.UIElement=true"]
         :main-opts ["-m" "speclj.main" "-c"]}
  :cov {:extra-paths ["spec"]
        :extra-deps {cloverage/cloverage {:mvn/version "1.2.4"}
                     speclj/speclj {:mvn/version "3.12.2"}
                     quil/quil {:mvn/version "4.3.1563"}}
        :jvm-opts ["-Dapple.awt.UIElement=true"]
        :main-opts ["-m" "speclj.cloverage"
                    "-c" "--tag" "~no-mutate" "spec"
                    "--" "-p" "src" "-s" "spec" "--lcov"]}
  :crap {:extra-deps {io.github.unclebob/crap4clj
                      {:local/root "../clojure/crap4clj"}}
         :main-opts ["-m" "crap4clj.core"]}
  :mutate {:extra-paths ["spec"]
           :extra-deps {io.github.unclebob/clj-mutate
                        {:git/url "https://github.com/unclebob/clj-mutate.git"
                         :git/sha "c8c0eedf34dafec270e13e74a106ff1703578d28"}
                        org.clojure/tools.reader {:mvn/version "1.4.2"}
                        speclj/speclj {:mvn/version "3.12.2"}
                        quil/quil {:mvn/version "4.3.1563"}}
           :jvm-opts ["-Dapple.awt.UIElement=true"]
           :main-opts ["-m" "clj-mutate.core"]}
  :ir {:main-opts ["-m" "uml-viewer.main.ir-generator"]}
  :run {:extra-deps {quil/quil {:mvn/version "4.3.1563"}}
        :main-opts ["-m" "uml-viewer.main.uml-viewer"]}
  :uml-viewer {:extra-deps {quil/quil {:mvn/version "4.3.1563"}}
               :main-opts ["-m" "uml-viewer.main.uml-viewer"]}
  :uml-viewer-restart {:extra-deps {quil/quil {:mvn/version "4.3.1563"}}
                       :main-opts ["-m" "uml-viewer.main.uml-viewer"
                                   "--restart" "examples/uml-viewer.edn"]}}}
```

## 图形界面的源码证据

`src/uml_viewer/adapters/sketch.clj` 的 namespace 声明：

```clojure
(ns uml-viewer.adapters.sketch
  (:require [clojure.java.io :as io]
            [clojure.string :as str]
            [quil.applet :as applet]
            [quil.core :as q]
            [quil.middleware :as m]
            [uml-viewer.application.detail :as detail]
            [uml-viewer.application.document :as document]
            [uml-viewer.adapters.draw :as draw]
            [uml-viewer.application.events :as events]
            [uml-viewer.engine.hit :as hit]
            [uml-viewer.engine.layout :as layout]
            [uml-viewer.domain.mailbox :as mailbox]
            [uml-viewer.application.overlay :as overlay]
            [uml-viewer.adapters.source-window :as source-window]
            [uml-viewer.domain.policy :as policy])
  (:import [java.awt Component Container Frame]
           [java.awt.event ActionListener]
           [javax.swing JMenuItem JOptionPane JPopupMenu SwingUtilities]
           [processing.event MouseEvent]))
```

窗口尺寸：

```clojure
(def window-width 1500)
(def window-height 920)
```

主窗口建立：

```clojure
(q/sketch
 :title "UML viewer"
 :size [window-width window-height]
 :features [:resizable]
 ...)
```

`start!` 的 fresh start 与 restart 分支：

```clojure
(defn start!
  ([path source-impl]
   (start! path source-impl false))
  ([path source-impl restart?]
   (swap! !bridge assoc :source source-impl)
   (let [root (overlay/metrics-root path)]
     (if restart?
       (remember-companion! root)
       (open-in-terminal! root)))
   (q/sketch ...)))
```

companion 的 tmux 启动参数：

```clojure
(defn new-session-args
  ([cwd] (new-session-args cwd (session-id cwd)))
  ([cwd session]
   ["new-session" "-d" "-s" session "-c" cwd
    "-e" "GROK_THEME=terminal"
    "-e" "GROK_TERMINAL_THEME=1"
    "-e" "COLORTERM=truecolor"
    (grok-executable) "--yolo" "--trust" "--rules" standing-rules
    launch-prompt]))
```

`grok-executable` 的候选路径：

```clojure
(defn grok-executable
  []
  (let [home (System/getenv "HOME")
        named (System/getenv "GROK_BIN")
        candidates (filter identity
                           [named
                            (when home (str home "/.grok/bin/grok"))
                            "/usr/local/bin/grok"
                            "/opt/homebrew/bin/grok"])]
    ...))
```

源码窗口 `src/uml_viewer/adapters/source_window.clj`：

```clojure
(ns uml-viewer.adapters.source-window
  (:require [clojure.string :as str]
            [uml-viewer.source :as source])
  (:import [java.awt Dimension]
           [java.util.regex Pattern]
           [javax.swing JEditorPane JFrame JScrollPane SwingUtilities]))
```

日志 `src/uml_viewer/domain/log.clj`：

```clojure
(def log-name "uml-viewer-log.txt")
```

## Quil 与 Processing 的依赖链

`quil/quil 4.3.1563` 的 POM 声明：

```xml
<groupId>quil</groupId>
<artifactId>quil</artifactId>
<version>4.3.1563</version>
```

依赖包括：

```xml
<dependency><groupId>org.clojure</groupId><artifactId>clojure</artifactId><version>1.11.1</version></dependency>
<dependency><groupId>quil</groupId><artifactId>processing-core</artifactId><version>4.2.3</version></dependency>
<dependency><groupId>quil</groupId><artifactId>processing-dxf</artifactId><version>4.2.3</version></dependency>
<dependency><groupId>quil</groupId><artifactId>processing-svg</artifactId><version>4.2.3</version></dependency>
<dependency><groupId>quil</groupId><artifactId>processing-pdf</artifactId><version>4.2.3</version></dependency>
<dependency><groupId>cljsjs</groupId><artifactId>p5</artifactId><version>1.7.0-0</version></dependency>
```

POM 的仓库声明：

```xml
<repository>
  <id>clojars</id>
  <url>https://repo.clojars.org/</url>
</repository>
```

`quil/processing-core 4.2.3` 的 POM：

```xml
<groupId>quil</groupId>
<artifactId>processing-core</artifactId>
<version>4.2.3</version>
<licenses><license><name>GNU Lesser General Public License</name></license></licenses>
```

采集时 Quil 官方资料对自身的描述：

> Quil is a Clojure library that combines Processing and Clojure to simplify the creation of drawings and animations.

> Quil provides support for the standard Processing API - currently Processing `4.3` and p5js `1.7.0`.
