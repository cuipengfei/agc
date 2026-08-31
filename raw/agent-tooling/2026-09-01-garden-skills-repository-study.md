# Garden Skills 仓库证据

> Source: https://github.com/ConardLi/garden-skills
> Collected: 2026-09-01
> Published: Unknown

> Commit: `aaf9a82f5efd73e87cc0998edc398e75bfc35901`

## Confirmed

当前 `skills/` 下有 5 个 Skill：

- `web-video-presentation`：把文章或口播稿制作为点击推进的 16:9 网页演示，可选 TTS。
- `web-design-engineer`：制作或重构 Web UI、页面、可视化与交互原型。
- `gpt-image-2`：图像生成、编辑和 prompt 模板，可直接调用 API、委托宿主图像工具或只输出 prompt。
- `kb-retriever`：按约定目录结构检索本地知识库。
- `beautiful-article`：把 URL、文档或素材制作成可离线分享的单文件 HTML 长文。

这些 Skill 多数定义了 source、planning、checkpoint、generation 和 review 流程。它们本身主要是 workflow/prompt contract；是否具备正式 schema、runtime 或持久化能力取决于宿主和目标项目。

## Boundary

Garden Skills 展示的是复杂产物的工作流封装，不等于 OpenMAIC 那样拥有统一、版本化的领域 DSL 与 renderer。
