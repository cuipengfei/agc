# uv-bun 对 OMP Git 插件的检查与升级路径

> Source: 本机 `/home/cpf/.local/bin/uv-bun` 第 724–755 行；本会话 `uv-bun --check` 输出；`~/.omp/plugins/package.json`
> Collected: 2026-11-22
> Published: Unknown

脚本读取 `~/.omp/plugins/package.json` 的 `dependencies`，筛选以下前缀的 Git 源：

```js
/^(?:github:|https?:\/\/|git\+|git@)/
```

`--check` 时打印 Git 源，读取 registry 插件的 `bun outdated`，不执行升级。

`--up` 时对 registry 中过期的包执行：

```text
omp plugin install <package>@latest --force
```

之后逐个 Git 源执行：

```text
omp plugin install <source> --force
```

最后执行 `omp plugin upgrade` 更新 marketplace 插件。

本机 `uv-bun --check` 的 OMP 段输出：

```text
configured OMP Git plugin sources...
github:JYeswak/omp-kit-companion
github:dietrichgebert/ponytail
```

这次实际验证的是脚本识别了两个 Git 源。本次没有再次运行 `--up`，没有声称本轮升级流程已重新跑完。

`uv-bun` 不在 agc 的 `manifest.json` 中；脚本本身不随 `./pull.sh` 同步。OMP 的插件清单、锁文件与配置在同步范围内。