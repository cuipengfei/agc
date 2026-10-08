# HyperFrames：写 HTML 渲染视频的 agent 框架（README 要点与实测）

> Source: https://github.com/heygen-com/hyperframes（README）；npm registry 逐包实测；skills.sh 页面；本机 hyperframes CLI 0.8.141 实测
> Collected: 2026-10-08
> Published: 2026-03-10（仓库创建时间, API 实测）

## 仓库实况（2026-10-08 GitHub API 实测）

- stars: 59005；forks: 5261；created_at: 2026-03-10T01:51:06Z；pushed_at: 2026-10-08T15:45:45Z
- 主语言 Python（GitHub repo 视图），但 CLI 为 Node/TypeScript 全栈
- Apache 2.0 license，开放核心（cloud rendering 为付费）

## README 核心定位（原文要点）

"Write HTML. Render video. Built for agents."

把视频定义成一个 HTML 文件（含动画、媒体、时间轴），在无头浏览器里逐帧渲染成 MP4。关键属性：

- **Deterministic**: same input, same frames, same output. Built for CI
- **No build step**: HTML 可以直接播放
- **Framework-agnostic**: GSAP/CSS animations/Lottie/Three.js 都能用

## npm 包（registry 逐包实测，2026-10-08）

仓库 14 个包，13 个发布到 npm（全部 0.8.141），1 个未发布：

| 包 | 角色 |
|---|---|
| hyperframes | CLI：创建、预览、渲染 |
| @hyperframes/core | 类型/解析/生成/编译/lint/运行时/帧适配器 |
| @hyperframes/engine | 可拖动定位的网页→视频引擎（Puppeteer + FFmpeg），自述 Seekable |
| @hyperframes/producer | HTML→视频渲染引擎，用 Chrome 的 BeginFrame API 推进渲染 |
| @hyperframes/studio | 浏览器编辑器 UI |
| @hyperframes/studio-server | Studio 后端服务 |
| @hyperframes/player | 可嵌入的播放组件 |
| @hyperframes/sdk | 无头、框架无关的组合编辑引擎 |
| @hyperframes/parsers | 解析器（GSAP、组合契约、媒体时长等） |
| @hyperframes/lint | 校验 |
| @hyperframes/shader-transitions | WebGL 转场 |
| @hyperframes/aws-lambda | AWS Lambda 分布式渲染适配器（handler + 客户端 SDK + CDK 构件） |
| @hyperframes/gcp-cloud-run | Cloud Run + Workflows 分布式渲染适配器（handler + 客户端 SDK + Terraform） |
| @hyperframes/sdk-playground | 仓库有但未发布，npm 404（SDK 试玩工程） |

（包职责描述来自各包 package.json description 自述，非仅包名推断；studio-server/lint/parsers 的 README 404，其内部实现未读源码。）

## skills.sh 技能分布：52 个技能，11.4M 总安装量（2026-10-08 页面快照）

以下 9 类分组按 README 的 router/creation workflows/domain skills 分类 + 名称推断，快照数据随页面变动；分类依据并非全部核实：

1. 入口/路由：hyperframes-read-first（2.4K）、hyperframes（834.5K）
2. 核心框架知识：hyperframes-core（711.8K）、-animation（721.1K）、-keyframes（565.5K）、-creative（680.7K）、-cli（869.0K）、-audio（420.6K）
3. 素材系统：media-use（743.2K）、hyperframes-media（141.7K）、hyperframes-tts（5）
4. 成品工作流：product-launch-video（393.8K）、faceless-explainer（382.4K）、pr-to-video（332.9K）、website-to-video（97.4K）、embedded-captions（340.8K）、talking-head-recut（298.5K）、motion-graphics（380.8K）、music-to-video（316.1K）、slideshow（300.5K）、general-video（473.9K）、graphic-overlays（29.1K）
5. 迁移：remotion-to-hyperframes（400.6K）、website-to-hyperframes（89.3K）
6. 动画引擎适配器：gsap（92.1K）、gsap-effects（27）、css-animations（72.3K）、waapi（68.7K）、animejs（70.0K）、three（69.3K）、lottie（69.1K）、typegpu（51.0K）、audio-reactive（7）
7. 设计/工具链：figma（230.2K）、tailwind（70.6K）、claude-design-hyperframes（2.0K）、contribute-catalog（55.5K）
8. Studio/编辑器：hyperframes-studio（225.7K）、hyperframes-compose（47）、compose-video（12）
9. 目录现成组件：cuboid-carousel、glass-shard-title、code-slice-hero、canopy-part-title、wireframe-portal-title、orbit-card、frost-sequence-camera-orbit、marker-highlight、transitions、hyperframes-captions、captions（各约 6.9K 或更低）

## core set（README 明确的最小安装集合）

router（hyperframes）+ 全部 hyperframes-* 域技能 + media-use。README 警告不要 `--all` 装全部 21 个。

- `npx hyperframes skills update`：无参数时只保证 core set + 已装的，不扩散成全部
- `hyperframes skills`（无参数）：安装全部
- `hyperframes skills update <名字>`：core set + 指定工作流技能

## 组合契约（hyperframes-core SKILL.md，实测 lint 强制）

- 单 HTML = 整部视频：`data-composition-id` + `data-start` + `data-duration` + `data-width/height` 声明画布
- 轨道片段：`data-track-index`，场景/元素用 `data-start`/`data-duration` 定时
- 8 场景组成实测：`window.__timelines["main"] = gsapTimeline` 是框架识别的播放轴
- **实测踩坑**（lint 强制）：
  - 禁正文 `<br>`（determinism 规则）→ 用 block span 或子元素
  - 场景元素禁设 CSS `opacity: 0` 初始态，框架自己管 clip 时间窗显隐；动画用 GSAP fromTo 做在子节点上；clip 本身禁 tween autoAlpha/visibility/display
  - 字体家族需满足 lint：非自动解析列表的中文字体名（PingFang SC 等）触发 font_family_without_font_face error；OS 系统字体用 `src: local('Exact Name')` 声明即可
  - 8+ 同轨元素触发 timeline_track_too_dense warning（子组合化建议）
- lint 命令 `hyperframes lint` 实测：0 errors + warning 列表

## CLI 命令（0.8.141 实测）

| 命令 | 作用 | 实测结果 |
|---|---|---|
| hyperframes --version | 版本 | 0.8.141 |
| hyperframes init <dir> | 建脚手架 | index.html + hyperframes.json + CLAUDE.md |
| hyperframes lint | 校验组合 | 0 errors |
| hyperframes preview | 起本地 Studio 服务器（含浏览器编辑器/时间轴） | HTTP 200, 热重载, 拖动时间轴 |
| hyperframes render | 出 MP4 | 需要 headless Chrome |
| hyperframes timeline --json | 时间轴解析 | 8 scenes + root 时长正确 |
| hyperframes usage --json | 配额/登录状态 | unknown: no_subscription_login（未验证功能范围） |
| hyperframes browser ensure | 下载 headless shell | TLS 握手失败（环境网络问题） |

## WSL 实测环境结论

- 无 Linux Chrome：`/usr/bin` 无 chrome/chromium/edge；Windows 侧有 msedge.exe
- 预览走用户自己的浏览器（URL + #project/），不需要 headless shell；渲染才需要
- `render` 失败时 `preview --status` 也报错（服务器在跑但 status 从仓库目录查询找不到项目），预览 HTTP 200 佐证服务器存活