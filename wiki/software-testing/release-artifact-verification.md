# 发布资产与镜像的验证方法

> Sources: GitHub Releases API 与 HTTP 探测；GitHub Actions 原始日志；Docker Registry manifest API；发布验收规则与本机检查，2026-11-21
> Raw: [发布资产与镜像验收](../../raw/software-testing/2026-11-21-release-artifact-verification.md)
> Updated: 2026-11-21

## Overview

发布验收需要分别回答三个问题：目标资产是否存在、CI 是否验证了预期行为、测试产物与发布产物是否具有相同的内容标识。workflow 成功、构建成功和版本检查通过各自只覆盖其中一部分。

## 用 release 元数据构造资产 URL

GitHub release tag 不统一带有 `v` 前缀。获取最新 release 时，可以读取 API 返回的 `tag_name`：

```bash
gh api repos/<owner>/<repo>/releases/latest --jq .tag_name
```

资产下载 URL 应使用这个 tag，再拼接 release 中实际存在的资产名称。根据版本号猜测前缀可能把存在的资产误报为缺失。

只需检查资产是否可访问时，可以使用 HEAD 请求：

```bash
curl -sSL -I -o /dev/null -w '%{http_code}' --max-time 15 <asset-url>
```

资产存在性检查与版本新旧检查分别进行。HEAD 返回成功状态说明该 URL 可访问，不能据此判断它就是目标版本。

## CI 需要逐项行为证据

对每个发布项同时检查目标版本和对应测试结果：

| 日志证据 | 对应检查 | 判定 |
|---|---|---|
| 目标版本出现 | `PASS` | 该项通过 |
| 目标版本出现 | `FAIL` 或版本不符 | 该项失败 |
| 工具名或目标版本未出现 | 无可用结果 | 未验证 |
| 目标版本出现 | 没有对应检查结果 | 未验证 |

workflow 总体成功只能说明 workflow 的完成状态。逐项结论必须来自原始 job 日志中的版本证据和行为检查，不能用构建成功或整体完成标记代替。

## 用 manifest digest 对照产物身份

CI 测试镜像与发布镜像使用不同 tag 时，可以比较发布 manifest 中目标平台的 digest 与测试产物的 manifest digest。相同 digest 建立的是该平台 manifest 的内容标识对应关系。

这项对照需要明确平台、镜像格式和比较字段。manifest index 中的其他平台、其他 tag 以及后续重新发布都要分别检查。

digest 一致不能替代行为测试：测试结论来自原始日志，产物对应关系来自 manifest。两类证据同时存在时，才能把已测试行为关联到相应的发布产物。

## 可复用验收记录

每次发布按发布项记录目标版本、原始日志是否出现、实际 `PASS`/`FAIL` 和最终结论；另记录测试产物 digest、发布 tag、目标平台及发布 manifest digest。缺少任何一项关键证据时，将对应项标为未验证。

## See Also

- [容器镜像中的 shell 选择与镜像层复用](../container-images/shell-selection-and-layer-reuse.md)
