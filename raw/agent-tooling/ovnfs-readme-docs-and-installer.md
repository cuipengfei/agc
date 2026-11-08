# ovnfs：README、官方文档与安装脚本摘录

> Source: https://github.com/stencil-hq/ovnfs （README、docs/limitations.md、docs/configuration.md、docs/checkouts.md、docs/remote.md、install.sh、update.go、daemon.go）; https://stencil.so/ovnfs.sh; https://build.stencil.so/api/products/ovnfs/latest/linux-x86_64
> Collected: 2026-11-08
> Published: Unknown

## README

> Checkouts for agents: isolated, copy-on-write views of any folder, a git
> repository or not, opened without copying it. Agents work in
> the checkout; you review with `diff` and merge back with a three-way `apply`.
> Checkouts can be snapshotted, forked, and attached to another machine, where
> their content arrives on first read.
>
> One daemon serves every checkout as a folder of a single mount: NFSv3 on
> macOS, FUSE on Linux, SMB or WinFsp on Windows. No root, and no kernel
> extension beyond WinFsp where you install it.

安装段落原文：

> The installers download the latest release binary (Linux, macOS and Windows on
> amd64 and arm64) from `build.stencil.so`, check its SHA-256 and put it in
> `~/.local/bin`, or on Windows in `%LOCALAPPDATA%\Programs\ovnfs`, added to the
> user PATH. `OVNFS_INSTALL_DIR` picks another folder, `--version v0.2.3`
> (`-Version` on Windows) another release. With Go (see `go.mod`):
>
> `go install github.com/stencil-hq/ovnfs@latest`
>
> `go build -o bin/ovnfs .` builds a clone. ovnfs runs git, and on Linux needs
> `fusermount3` (the `fuse3` package). `ovnfs version` prints the build;
> `ovnfs update` replaces it with the latest, through `go install` when that
> built it, and `ovnfs restart` then moves the daemon onto it.

快速开始原文：

```sh
cd ~/src/app
cd "$(ovnfs new)"              # starts the daemon, prints the checkout's path
git status                     # same status as ~/src/app; nothing is written there
# ...let the agent work...
ovnfs diff app -p              # what changed
ovnfs apply app                # merge it back into ~/src/app
cd ~/src/app && ovnfs rm app   # remove the checkout; its snapshots stay
```

其他动词原文：

```sh
ovnfs run -- make test         # a disposable checkout: run, then remove
ovnfs new --rev main           # start from a revision instead of the working tree
ovnfs attach app --to devbox   # the same checkout on another machine, fetched lazily
ovnfs send . devbox:src/app    # attach over ssh, installing ovnfs and joining the mesh there first
ovnfs push app                 # copy what devbox still reads from here, so it works with this machine off
ovnfs grep 'TODO' app          # search in the daemon, without traversing the mount
ovnfs glob '*.go' app          # matching paths, recursively and ignore-aware
ovnfs ls .                     # the checkouts of this folder
ovnfs prune . --idle 7d        # remove those untouched for a week (--dry-run first)
```

工作方式原文：

> Opening a folder sorts every path into a class. `source` paths are captured:
> they are what `diff`, `apply` and snapshots see, and the only bytes that leave
> the machine. `cache` and `local` paths (build outputs, ignored files, secrets)
> show the live folder until the checkout writes them: a path it writes or
> deletes stays its own from then on, and `apply` never carries it back.
> `hidden` paths are absent. Built-in rules handle the common cases;
> `.o2/ovnfs.yml` and `--rule` override them, and `ovnfs explain PATH` says which
> rule decided.
>
> Writes go to the checkout's own copy-on-write layer, so the folder is never
> written until you `apply`. In a git repository the checkout gets a private git
> directory: commit freely, then `apply --branch NAME` to bring the commits back.
>
> ovnfs isolates files, not processes: it is not a sandbox.

## docs/limitations.md

- This is not a sandbox: absolute paths and symlinks can reach the host.
- The view is best effort, not a frozen snapshot: a source file the user rewrites while the agent is reading it can show either version, and cache and local paths always show the folder as it is.
- A tracked file the user changes after open is read from the repository's objects; pruning those objects can make it unreadable.
- Remote checkouts have no git directory and cannot be attached onward. Bring their edits back with `pull` on the source machine, then `apply` the local checkout to its folder. `fstat` on a lazily fetched open file reports the cached blob's metadata; path-based stat is exact.
- A link is one stream per checkout (QUIC over the mesh, or ssh); cold reads of many files are bound by its throughput.
- The mesh does not move a relayed connection to a direct path in place ...; it races direct ways first when it connects and re-dials when a connection ends or stalls (three seconds without hearing the peer). Two machines that can only see each other through NAT stay on the relay.
- NFSv3 locks are client-local. ...
- NFSv3 cannot push cache invalidations: folder edits in cache and local paths, `pull`, and reattach can remain cached until the client's attribute timeout (up to 60 s). ...
- One SMB daemon per Windows logon session: ...
- WinFsp mounts get no recalls or change notifications for changes made behind them (`pull`, reattach, folder edits): they show once the one-second metadata cache expires, and directory watchers miss them.

## docs/configuration.md

守护进程位置表：

| | state | mount |
| --- | --- | --- |
| macOS, Linux | `~/.local/state/ovnfs` (or `$XDG_STATE_HOME/ovnfs`) | `~/checkouts` |
| Windows | `%LOCALAPPDATA%\ovnfs` | drive `O:` |

> On Linux, distribution FUSE confinement only allows mounts below `$HOME`,
> `/mnt`, `/media` and `/tmp`; on Windows the mount must be a free drive letter.
> `state` and `mount` in `~/.o2/ovnfs.yml` replace the defaults,
> `OVNFS_STATE`/`OVNFS_MOUNT` replace those, and `--state`/`--mount` win over
> all. Keep state on the volume holding your repositories: `new` warns when they
> differ, since files are then copied instead of cloned.
>
> `serve -memory SIZE` (`OVNFS_MEMORY`, default `1G`) and `serve -blob-cache
> SIZE` (`OVNFS_BLOB_CACHE`, default `512M`) size the memory tiers described in
> [internals](internals.md#memory-tiers); `start` passes the environment on.

路径分类表：

| class | in the checkout | in a snapshot | on another machine |
| --- | --- | --- | --- |
| `source` | as captured at open | hashed: the snapshot's identity | sent by content id |
| `cache` | the folder, live until the checkout writes the path | not hashed | an empty directory, rebuilt there |
| `local` | the folder, live until the checkout writes the path | not hashed | absent |
| `hidden` | absent | — | absent |

> Nothing is copied to make this view. A source file is the folder's own file
> while its size, mtime and inode still match the capture, and its captured
> content (from the store or the repository's objects) once they do not; a file
> the user adds later stays out. Cache and local paths are the folder as it is
> now. Writes in the checkout copy up into its own upper, so the folder is never
> written: a cache or local path the checkout wrote or deleted is its own from
> then on, no longer follows the folder, and is ignored by `diff` and `apply`.

内置规则原文：

```
hidden   .DS_Store | ._* | Thumbs.db | desktop.ini
local    secret
cache    cachedir | dir & (node_modules | .venv | __pycache__ | .next | .nuxt | .turbo | .gradle | .pytest_cache | .mypy_cache | .ruff_cache | .tox)
cache    ignored & dir
local    ignored
local    size > 100MB
source   *
```

`local secret` 覆盖的凭据名（原文节选）：

> `secret` | credential names: `.env`, `.env.*` (not `.example`, `.sample`, `.template`, `.dist`), `.netrc`, `.npmrc`, `.pypirc`, `.git-credentials`, `credentials`, `credentials.json`, `credentials.toml`, `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519`, `*.pem`, `*.key`, `*.p12`, `*.pfx`; directories `.ssh`, `.gnupg`, `.aws`, `.kube`, `.docker`

## docs/checkouts.md

git 仓库原文：

> A checkout of a repository gets a private git directory: HEAD, refs, config and
> the index are copies taken at open, and objects borrow the repository's through
> alternates. Inside the checkout, `git status` matches the folder's, commits land
> in the checkout, and nothing is written to the user's repository until
> `ovnfs apply CHECKOUT --branch NAME` fetches the checkout's commits as a branch.

耗时原文：

> On a 49k-file repository, opening a checkout takes about a second and
> `git status` inside it under three. Later creates of the same folder reuse that
> capture while the folder has not changed in a way a checkout shows, and take a
> checkout prepared ahead of time: on a 3,000-file repository on Windows, a create
> returns in about 15 ms, and after a source edit the folder is captured again in
> about 50 ms, once for all the creates waiting on it (see
> [internals](internals.md#fast-creates)).

`--rev` 原文：

> `ovnfs new [DIR] --rev REV` starts with REV's tracked files and index. ... Untracked nonignored files disappear from the checkout, while ignored files and build directories remain available. ... The source folder and its git state are never changed.

`run` 原文：

> `ovnfs run [DIR] -- CMD [ARGS]...` opens a checkout, runs CMD directly in the
> caller's matching subdirectory, and removes the checkout even when CMD fails or
> is interrupted.

快照与 fork 原文：

> `snap` renames the upper into an immutable layer in O(1) and hashes its source
> paths into a git-format tree in the background (`--wait` blocks); hashing
> touches only changed paths. ... `fork` snapshots a checkout and opens a second
> one on that snapshot; parent and child diverge. `new --from SNAP` opens a
> checkout on any snapshot ... Nothing replaces the content of a live folder:
> rollback means a new checkout from a snapshot.

diff 与 apply 原文：

> `diff CHECKOUT [SNAP] [-p]` compares the checkout now with its base capture (or
> a snapshot); `--binary` prints the patch as `git diff --binary` does, with git
> headers, full blob ids, modes and binary content, so `git apply` takes it whole,
> also with `--cached`.
>
> `apply CHECKOUT` snapshots the checkout and merges each changed source path into
> the folder against the base: a path the user left alone takes the checkout's
> version, and a text file changed on both sides is merged with `git merge-file`.
>
> Where both sides changed the same lines, the file gets git-style conflict
> markers (`<<<<<<< folder` … `>>>>>>> checkout NAME`, in your
> `merge.conflictStyle`) and apply exits 1 ... Applying twice is a no-op.

## docs/remote.md

attach 原文：

> `ovnfs attach CHECKOUT|DIR --to MEMBER|HOST` snapshots the checkout (a folder
> is captured first) and opens a link to the other machine: a QUIC stream over
> the [mesh](#mesh) when `--to` names a member, otherwise `ssh HOST ovnfs link`,
> which relays the session into HOST's daemon, starting it if needed.
>
> The remote rebuilds the snapshot's tree from the offered entries, checks it
> hashes to the offered id, and shows the checkout at once: listing and stat
> never move content. The first open of a file fetches its blob over the link,
> verifies it against its id, and keeps it in the remote's content-addressed
> store, shared by every checkout there; ... Cache roots arrive as
> empty directories; local and hidden paths never leave.

断线与 push 原文：

> The link reconnects with backoff while the source daemon runs. Without it,
> cached content stays readable and uncached reads fail with EIO; [push](#push)
> first to cache all of it.

push 原文：

> `ovnfs push [CHECKOUT] [--to HOST]` makes attached machines independent of this
> one: each fetches, over its link, every blob it would still read from here, so
> its checkouts keep working after this machine sleeps, leaves the network or
> stops its daemon.

send 与 pull 原文：

> `ovnfs send [DIR|CHECKOUT] HOST[:PATH]` attaches to a machine you reach by ssh,
> preparing it first, so one command takes a folder to a fresh box ... Without
> ovnfs on HOST ... send downloads the release binary for HOST's `uname` ... and
> installs it as `~/.local/bin/ovnfs` over ssh, so HOST needs no network access
> of its own. ... It starts HOST's daemon and, unless HOST is already a member,
> joins it to this machine's [mesh](#mesh) ... The two machines must then reach
> each other directly or through the relay.
>
> `ovnfs pull CHECKOUT [--from HOST] [--dry-run]` brings the attached remote
> checkout's source edits into the local checkout, not the original folder. ...
> the link must be up.

mesh 成员与传输原文：

> A node is its Ed25519 key (`<state>/mesh/node_key`, PKCS#8, and a self-signed
> `node_cert.der`) ... A member is reached over a direct UDP way (port 8377,
> Tailscale and private addresses first, raced 250 ms apart) or, when none
> answers, through the Stencil relay ... `mesh setup` ... 32 random bytes, single
> use, valid ten minutes, kept only as a hash.

## install.sh（153 行全文核对）

固定地址与目标名：

- 最新版：`$BUILD_URL/api/products/ovnfs/latest/$TARGET?channel=stable`
- 指定版本：`$BUILD_URL/api/products/ovnfs/versions/${VERSION#v}/$TARGET`
- `$BUILD_URL` 默认 `https://build.stencil.so`，可用 `OVNFS_BUILD_URL` 覆盖，结尾斜杠会被循环剥掉。
- `$TARGET` 取值 `linux-x86_64`、`linux-arm64`、`macos-x86_64`、`macos-arm64`。

行为清单（按脚本顺序）：

1. `set -e`；解析 `--version` 与 `--version=`，值须匹配 `^v?[0-9]+\.[0-9]+\.[0-9]+$`；未知参数退出 1。
2. `uname -s` 判定 Linux/Darwin，其余报错并指向 `https://stencil.so/ovnfs.ps1`。
3. `uname -m` 判定 `x86_64|amd64` 与 `aarch64|arm64`；macOS 额外用 `sysctl -in hw.optional.arm64` 纠正 Rosetta。
4. 要求 `sha256sum` 或 `shasum` 至少一个。
5. 元数据请求：`curl -fsSL --connect-timeout 10 --max-time 60 --retry 3`。
6. `sed` 取字段，不依赖 jq；响应先去 `\r\n`；下载地址里的 `\u0026` 还原为 `&`。
7. 校验版本非空、下载地址非空、`sha256` 匹配 `^[0-9a-f]{64}$`。
8. `mkdir -p "$INSTALL_DIR"`，默认 `$HOME/.local/bin`，可用 `OVNFS_INSTALL_DIR` 覆盖。
9. 暂存文件 `$INSTALL_DIR/.ovnfs.download.$$`，`trap` 退出时清理。
10. 下载：`curl -fsSL --connect-timeout 10 --speed-limit 1024 --speed-time 30 --retry 3`。
11. 比对 SHA-256，不一致退出；`chmod 755`；执行 `"$STAGED" version` 验证可运行。
12. 目标文件存在则记 `UPGRADE=1`；`mv -f "$STAGED" "$INSTALL_DIR/ovnfs"`。
13. 输出安装位置；四条提醒：安装目录不在 PATH、升级时守护进程仍跑旧版需 `ovnfs restart`、缺 git、Linux 缺 `fusermount3`。

脚本不做：sudo、修改 shell 配置、自动改 PATH、启动守护进程、写配置。

## 构建服务实测（2026-11-08）

请求 `https://build.stencil.so/api/products/ovnfs/latest/linux-x86_64?channel=stable` 返回：

- `build.version`：`0.2.6`
- `build.id`：`20261108-102355-2ae7674`
- `file.name`：`ovnfs-linux-amd64`，`platform` `linux`，`arch` `x86_64`，`kind` `archive`
- `file.size`：`14799008`
- `file.sha256`：`116cbfc09211b4606223bfd28db6c2b995e7aa58e9958bef132d542f3fdabc3c`
- `file.url`：`/d/ovnfs/20261108-102355-2ae7674/ovnfs-linux-amd64`
- 顶层 `download`：预签名地址，主机为 `https://d4c085d38fe197a3f20bbeb20222b8b3.r2.cloudflarestorage.com`，路径 `/ompcast/builds/ovnfs/20261108-102355-2ae7674/ovnfs-linux-amd64`，后跟查询参数（签名会过期）。

## update.go

> // runUpdate replaces this binary with the latest ovnfs, then points out a
> // daemon still running the old one.
>
> A binary go install built, which records the module's checksum unlike a build in a clone, is rebuilt with go install from the latest module version; a release binary is replaced by the latest release's from the build service. A build in a clone is refused: pulling and rebuilding there updates it.

替换过程：新二进制先放在可执行文件同目录的临时目录，执行一次 `version` 验证，再用 `replaceExe` 改名覆盖；Windows 先把旧文件改名为 `.old`。

## daemon.go

> // runRestart replaces the running daemon with a fresh one spawned from this
> // invocation's binary, which is how a rebuilt or upgraded ovnfs takes over. It
> // starts the daemon when none runs, and leaves the old one untouched if it
> // refuses to stop.

`runStop` 在没有守护进程时打印 `not running` 并返回成功。
