# Anatomy skill：物理装置隐喻的交互式等距出图机制与自解释成品

> Sources: 本机 anatomy skill（SKILL.md 全文、references/{craft,kit,motion,verify,walkthrough,react} 分节、kit/{iso-kit,lathe,tube,audit,gl,turn-*} 接口说明、scripts 用法与八个示例），主代理直读 + 三个 scout 调研，2026-10-18；本会话制作实证（anatomy-skill-explainer.html，geometry audit 136 solids、line check 0、browser smoke 全过），2026-10-18
> Raw: [Anatomy skill 机制与交付方式摘录](../../raw/agent-tooling/2026-10-18-anatomy-skill-mechanics.md)
> Updated: 2026-10-18

## 一句话

Anatomy 以「**物体本身就是解释**」为作者模型：把软件或技术概念映射到一台做工精良、可交互的等距物理装置，让装置工作过程直接表达概念；SVG 负责实体零件，WebGL 只补充线画不了的效果，3D beta 处理深度运动，全部几何由自动审计把关。

## 与 diagram-design / archify / amwth / visual-explainer 的差异

该横评文章（`llm-diagram-authoring-models.md`）覆盖的是方框箭头类、JSON schema 类、Markdown 草稿类与整页叙述类的四类出图 skill。Anatomy 在这四类之外：

- **作者模型**：概念 → 物理装置的一对一映射，禁止方框、箭头、标签浮空。
- **零件门槛**：40–150+ 个真实零件（螺钉、轴套、弹簧、刻度），四档明暗、平滑曲面、正确遮挡。
- **数据真实性**：读数、运动、说明文字全部来自同一行为模型，杜绝「动画一种状态、文字另一种状态」。
- **审计**：几何 audit（穿插/支撑/端点/折叠/自交/拥挤/占位形状/抖动/贴合/深度顺序）+ line check（每条线必须结束在笔画、点或轮廓上）双重门槛，全部归零才算完成；修复在几何本身，不用 key bias 掩盖。
- **交付**：Standalone HTML、静态 SVG、React/Next.js 组件、社区 gallery 四种路径。

## 选择与边界

| 需求 | 适合 |
|---|---|
| 技术概念、算法、状态、机制、动态因果解释 | Anatomy（能映射成可信物理机构时） |
| 方框箭头、模块分层、部署拓扑、关系图 | 普通架构图/流程图更直接 |
| 静态依赖关系 | 关系图 |
| 精确物理运动、管道、爆炸图、曲面、火焰水面 | Anatomy + WebGL/3D |

约束：概念映射不成可信机构时，勉强制作会削弱表达；3D 是 beta，密集活动主体需要性能检查（380 件约 20fps）；WebGL 效果需要浏览器 WebGL，主体仍须在无 WebGL 时可读。

## 制作实证：anatomy-skill-explainer.html

单文件约 9.35MB、离线可打开，用 Anatomy 解释 Anatomy 自身：

- **仪器柜模型**：八个抽屉对应八个真实示例；抽屉开合、表盘指针、真实读数、闲置巡检灯共享同一个 selection 模型。geometry audit：**136 个实体**（最终核验值）。
- **八个示例的嵌入方式**：六例（dial-indicator、desk-computer、arcade-cabinet、raptor-engine、ripple-tank、turning-dial）保留原有独立 HTML，以 iframe `srcdoc` 内嵌；两例（test-rig、spot-plate）是 React 组件，经 Bun `--target=browser` 打包后直接挂载当前页面。
- **主题切换**：`data-theme` 切换给整个页面换肤，同时重新注入 iframe `srcdoc` 换对应主题的示例版本。
- **验证**：line check 明暗两版均 `line ends: 0`；browser smoke 依次加载八个示例并切换主题，console 无报错。按用户要求跳过截图与视觉检查。

## 合规流程（重要）

HTML 由一次性 Node build 脚本写入：暗色版 `writeFileSync` 直接输出到仓库路径 `/home/cpf/code-inside/agc/anatomy-skill-explainer.html`，亮色版输出到 `/tmp/anatomy-explainer/anatomy-skill-explainer-light.html`（供验证）。仓库规则禁止程序化方式修改代码：成品进仓库后，一切改动（MIT 许可证文本、示例来源说明、plannotator 批注处理）都用手动文件编辑工具直接改最终 HTML**，绝不重跑生成脚本覆盖。后续所有修正均按该方式执行，并每次重新运行非视觉检查确认行为未破坏。

## See Also

- [LLM 出图的作者模型：diagram-design、archify、answer-me-with-html 与 visual-explainer](llm-diagram-authoring-models.md) — 四 skill 横评，Anatomy 是其外的第五种作者模型。