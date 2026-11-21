# 发布资产与镜像验收：API、日志和 digest 摘录

> Source: GitHub Releases API 与资产 HTTP 探测；GitHub Actions 原始 job 日志；Docker Registry manifest API；buntoolbox 仓库 `.claude/skills/upgrade-versions/SKILL.md` 的验收规则
> Collected: 2026-11-21
> Published: Unknown

本文件保存可复核的字段和输出，供通用发布验收方法引用。示例中的版本只用于说明字段关系，不作为其他项目的版本依据。

## Release tag 与资产 URL

GitHub Releases API 的 latest release 查询可读取 `tag_name`：

```bash
gh api repos/<owner>/<repo>/releases/latest --jq .tag_name
```

本次检查中的一个实际 release tag 为：

```text
0.21.2
```

同一资产使用两种 URL 前缀的探测结果：

```text
releases/download/0.21.2/<asset>  -> 200
releases/download/v0.21.2/<asset> -> 404
```

这说明 URL 中的 tag 应取自 release 元数据，不能根据版本号自行补充 `v` 前缀。

## 资产存在性探测

对实际存在的 release 资产使用 HEAD 请求：

```bash
curl -sSL -I -o /dev/null -w '%{http_code}' --max-time 15 <asset-url>
```

本次检查输出：

```text
200
```

HEAD 探测用于检查响应状态，不需要下载资产响应体。资产是否存在与当前版本是否最新是两个独立判断。

## CI 逐项验收

原始 job 日志中的一个工具检查示例：

```text
Bun 1.4.5 PASS
```

验收规则的必要摘录：

- 目标版本出现，且该工具对应的检查为 `PASS`：该项为 `OK`。
- 目标版本出现但检查为 `FAIL`，或版本不正确：该项失败。
- 工具名或目标版本未出现：该项未验证。
- 版本出现但没有对应检查结果：该项未验证。
- workflow 总体成功不能替代逐项检查。

这些规则要求同时保存版本证据和行为检查结果。只有 workflow 结论或构建成功时，不能填写逐项 `PASS`。

## 测试镜像与发布镜像的内容标识

CI 测试镜像的 build metadata：

```text
containerimage.digest = sha256:ad9cfe30673aef7cb19d024a9bf0d2aa881875384dd78434e95b663a3ac8d5ce
```

Docker Hub 发布 tag 的 manifest index 中，`linux/amd64` 条目的 digest：

```text
sha256:ad9cfe30673aef7cb19d024a9bf0d2aa881875384dd78434e95b663a3ac8d5ce
```

本次对照中两个值相同。因此可以记录：发布 tag 的 `linux/amd64` 条目与 CI 测试产物具有相同的 manifest digest。

该对照仅覆盖上述平台条目。manifest index 中的其他平台、其他 tag 和后续重新发布需要分别检查；digest 对照本身也不替代测试日志中的行为检查。
