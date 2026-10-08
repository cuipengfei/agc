# HyperFrames：HTML 写视频的 agent 管线

> Sources: heygen-com/hyperframes README 与 GitHub API, 2026-10-08; npm registry 逐包实测, 2026-10-08; 本机 CLI 0.8.141 实测
> Raw: [hyperframes-html-video 实测](../../raw/video-generation/2026-10-08-hyperframes-html-video.md)
> Updated: 2026-10-08

## Overview

HyperFrames 是 HeyGen 开源的「写 HTML 渲染视频」框架，面向 coding agent：把整部视频定义成一个 HTML 文件（时间轴标注 + 任意 Web 动画），在无头浏览器里确定性渲染成 MP4。与 Remotion（React 组件、有构建步骤）相对，它以纯 HTML 为接口、零构建步骤，同一输入永远同一输出，可进 CI。

## 为什么值得关注

- 热度和生态：59K+ stars（2026-10-08 API 实测 59005），14 个包 13 个发布 npm（0.8.141 统一版本）；skills.sh 页面 2026-10-08 快照显示 52 个技能、累计安装 11.4M（目录快照，随页面变动）
- 定位精确：README 首行 "Write HTML. Render video. Built for agents."；catalog 覆盖产品发布、无脸讲解、PR 预告片、音乐节拍同步、动效图形、Remotion 迁移
- 设计三支柱：确定性（同输入同输出，CI 可测）、无构建（index.html 即作品，浏览器直接播）、不锁技术栈（GSAP/CSS/Lottie/Three.js/WebGL 都挂）

## 安装与使用

- CLI：`npx hyperframes init` + `preview`（浏览器 Studio 实时预览）+ `render`（MP4）；前置 Node 22+ 与 FFmpeg
- agent 集成：Claude Code 用插件；其他 agent 用 `npx skills add heygen-com/hyperframes`（core set 10 技能：router + hyperframes-* 域技能 + media-use）；核心装法 `npx hyperframes skills update`（无参数只保 core set）
- 无需逐个装 `@hyperframes/*` 包，它们是 CLI 依赖

## 组合契约（写 HTML 视频的核心规则）

- 画布：根元素 `data-composition-id` + `data-start/duration/width/height`；GSAP 时间轴挂 `window.__timelines["main"]`
- 时间轴：elements 用 `data-start`/`data-duration`/`data-track-index` 定时
- **禁 `opacity: 0` 初始态**：框架自管 clip 时间窗显隐；动画用 GSAP fromTo 做在子节点；clip 本身禁 tween autoAlpha/visibility/display（真实踩坑：首版全黑即因此）
- **禁正文 `<br>`**（determinism），换 block span 或子元素
- 字体 lint：非自动解析列表字体名触发 error；OS 系统字体声明 `src: local(...)` 即可

## WSL/本机实操结论

- 预览不需要 headless Chrome（走用户浏览器 + Studio 服务器）；渲染才需要
- WSL 无 Linux Chrome 时 render 卡在浏览器下载（本机 TLS 握手失败）；`usage` 返回 `unknown: no_subscription_login`
- lint 是可靠的离线验证：`hyperframes lint`（0 errors）+ `hyperframes timeline --json`（场景解析完整）；无 headless 时缩略图/渲染无法自证画面

## See Also

- [Plain Language Skills: ASD-STE100 与 ISO 24495-1](../agent-tooling/plain-language-skills-asd-ste100-iso24495.md) — agent 输出写作的受控/简明语言约束，与视频文案层同源思路