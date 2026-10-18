# Anatomy skill：机制、工作流与交付方式摘录

> Source: 本机 `/home/cpf/.agents/skills/anatomy/`。实际读取范围：SKILL.md 全文（主代理经 skill://anatomy 直读）；references 的 craft.md、kit.md、motion.md、verify.md、walkthrough.md、react.md 分节（主代理直读，覆盖核心原则、绘制顺序、recorder/settle/audit、验证命令、React 拆分）；kit 的 iso-kit.mjs、audit.mjs、lathe.mjs、tube.mjs、gl.mjs、turn-*.mjs 接口说明与 scripts/capture.mjs、drive.mjs、lines.mjs、inline-kit.mjs 用法（三个 scout 调研：standalone 示例、WebGL、3D）；八个示例的文件清单与构建方式。未逐行读取：references 的 webgl.md、3d.md、publish.md 分节及 kit 全套源码。
> 摘录性质说明：本文件为声明的忠实摘录。原文件语言为英文，下列「原文」块是 SKILL.md 与 references 的逐字摘录（保留原标点与大小写）；节标题与行内中文注记是我加的导览文字，不是原文。制作实证数值段为本会话实际运行结果（非源文件文字）。
> Collected: 2026-10-18
> Published: Unknown

## 核心原则（原文）

> **The object is the explanation.** Don't draw boxes, arrows and labels. Invent a real, well-made physical thing whose working *is* the concept. Here is how earlier figures mapped:

| Concept | Object |
|---|---|
| One shared GPU context serving many canvases | A gantry plotter: one print head visiting 16 wells |
| A cache key that skips work when nothing changed | A pin-tumbler lock: when every pin matches, the plug turns and nothing is redrawn |
| Seven render targets with different bytes per texel | A chest of seven drawers, each as deep as its bytes |
| A separable blur (49 × 49 taps vs 49 + 49) | A bed-of-nails stamp beside two combs on rails |
| A spring that presses and leans | A test rig with springs, a probe and a dial gauge |
| A height profile | A profile (contour) gauge pressed against the edge |
| Light that depends on facing | A small photo studio: key and fill lamps around a turntable |

> Two ways this fails, both seen in practice:
> - **Too abstract.** Stacked plates, floating slabs or labelled boxes don't read as anything.
> - **Too flat and bland.** One big slab with a few lines on it has no volume, no parts and nothing to discover.
> The fix for both is the same: a recognisable machine, built from many small, precise, purposeful parts.

## 规模分级（原文）

> - **Figure**: one mechanism, 40–80 parts, SVG with at most one WebGL layer. Name the size and build it without asking. Do not quote a time to the user, since a Figure often finishes in well under an hour.
> - **Hero**: a dense object, several WebGL layers or one 3D subject, 80–150 parts. About 2–4 hours. Say so, then build it unless the user asked for something quick.
> - **Epic**: a whole vehicle, building or plant with many moving systems, or the 3D mode on more than one subject. 6 hours or more. Do not start it. Give the estimate, propose a Hero version that keeps the core of the idea, and list what the full version would add.

## 工作流十步（原文）

> 1. **Size it before you start.** Name the size before any other work, and tell the user roughly how long it will take when the tier below calls for an estimate.
> 2. **Truth first.** Collect the real numbers and behaviour of the thing being explained: sizes, counts, thresholds, curves. The readout, motion and caption must all be true. If you can, write the model as a small pure module, like `rig.ts` in the test-rig example, and drive everything from it.
> 3. **Invent the object.** Pick a machine, tool, instrument or piece of furniture whose mechanism maps one-to-one onto the concept. Say in one sentence what moves and what that motion means. Never copy a reference image: take its finish, not its object.
> 4. **Parts list.** Write at least 40 parts (40–80 for a Figure, 80–150 for a Hero, more for an Epic), grouped: base (plate, feet, groove, corner screws, label plate, ruler strip), structure (posts, rails, frame bars, end stops), mechanism (carriage, bushings, springs, plunger, needle), controls (knurled knob, thumb screw, crown) and the subject itself, which is the one lit part.
> 5. **Plan the world.** Use world units of about 1 px of the real thing: x and y on the floor, z up. Choose the camera: azimuth 45° by default, 35–60° to show the long side, elevation 30°.
> 6. **Build geometry once.** Precompute every static path in a geometry module with the kit… Moving parts are built once at a rest position and moved with `translateAlong`. Only parts whose shape changes are rebuilt per frame.
> 7. **Paint back to front, bottom to top.** Sort repeated parts with `depthOf`. Split anything that wraps another part into a back half and a front half… A moving part is drawn in the slot where it physically sits. …let `A.settle(R, P)` measure true depth wherever two items overlap and set the keys, and end the build with `A.auditOrExit(R, P)`.
> 8. **Frame it.** Put the figure in a card: `Fig n` at top left, a short title at top right, the interaction hint at bottom left and the live readout at bottom right. Legend keys and a true caption go under the card, and words stay out of the drawing apart from at most one tiny engraved label.
> 9. **Make it live.** Use calm time-based motion: exponential follow or real springs. An idle tour loops when nobody touches it. The figure responds to pointer and keyboard, stops when offscreen, and goes still under reduced motion.
> 10. **Verify like a critic.** The owner finds faults by zooming in, so you zoom in first. Read every PNG you make. … Run the audit to zero. … Run the line check to zero. … 4× close-ups of every junction in both themes (build `--light` too), assembled and apart. … Put your PNG next to the examples and ask: is it instantly a real object, rich in small parts with volume, with every line ending on something?

## kit 组件职责（原文表）

> | File | Use it for |
> |---|---|
> | `kit/iso-kit.ts` | The whole core in one file: camera, solids, a parts library, an SVG string renderer, card and page builders, and the CSS (`ISO_CSS`). |
> | `kit/lathe.mjs` | Round parts along any axis: `frameAlong`, `lathe` (smooth shading switches on by itself for any profile with a smooth knot), `solidOf`, `disc`, `ringBand`, `sphereOf`, `saddleOf`, `bandsOf`, visible arcs, ribs and bolt circles on round surfaces (`ribsOf` and `dotsOf` take `fade`), `rodOut` for a rod that slides out of a gland, and `fillet` for pipe routes. |
> | `kit/tube.mjs` | `tubePieces` splits a 3D pipe or cable into depth-sortable chunks (with `breaks`, `gaps` under collars and clamps, elliptical end caps, and `rings` for a braid, corrugation or wrap…), and `tubeSvg` draws one; `crossingsOf` finds where a route passes through a clamp, `runsOf` the drawn runs. |
> | `kit/audit.mjs` | `recorder(P, { order, spring })` collects items, shapes… as the helpers draw them; `settle(R, P)` ray-casts every overlapping pair for true depth… and sets the painter's keys (`overlapsOf`, `orderKeys`); `auditOrExit(R, P)` is the `--audit` hook that runs every check (`clearances`, `solidClearances`, `terminals`, `looseEnds`, `supports`, `folds`, `selfOverlaps`, `crowding` with slender solids as lines, `coverage` for stand-in shapes, `wobble`, `seats`, `depthOrder`) and exits non-zero on any problem. |
> | `kit/gl.mjs` | The WebGL layer for shaders inside the drawing: `GLSL_ISO` (the camera in GLSL…), `glCamera(P)`, `glLayer(...)`, and the JS envelopes `smooth`, `burst` and `settle`. |
> | `kit/turn.mjs`, `kit/turn-build.mjs`, `kit/turn-audit.mjs` | The optional 3D mode. `turn-build.mjs` has `turning(P, { recorder })`: groups (turn, slide, hinge, free), live layers, convex parts with materials, and `T.build`. `turn.mjs` is the runtime… `turn-audit.mjs` has `orbitOrExit`, the orbit audit over every turn angle and motion clip. |
> | `scripts/capture.mjs` | Headless Chrome screenshots, close-ups and console checks, with WebGL on. |
> | `scripts/drive.mjs` | Scripted headless Chrome with WebGL: move, click, key, slow motion, wait-until, eval, shots and contact sheets that catch pops; `--no-webgl` and `--preload`. |
> | `scripts/lines.mjs` | The line-end check on a built page, in headless Chrome: every texture line must end on a stroke, a dot or an outline. Rings the failures with `--out`; exits 1 on any. |

## 验证命令与门槛（原文）

> - Capture desktop, phone (390 wide), hover and several moments of motion with `scripts/capture.mjs`; use `scripts/drive.mjs` for sequences, the apart pose and the `--no-webgl` fallback.
> - **Run the audit to zero.** With pipes, cables or round parts, `node build.mjs --audit` must end `audit passed`, every failing line at 0…
> - **Run the line check to zero.** The audit never sees line markup. `node scripts/lines.mjs page.html --out shots/lines.png` (and on the `-light` page…) must print `line ends: 0`: every seam, rule, rib, tick and pointer ends on a stroke, a dot or an outline.
> - Fix an interlock in the geometry, never with a key bias.

## 交付形式（原文）

> - **Standalone HTML, a static SVG, a blog post or any non-React site.** Write a Node build script like `examples/dial-indicator/build.mjs`. It imports `kit/iso-kit.mjs`, assembles strings with `solidSvg`, `lineSvg`, `dotsSvg`, `wireSvg` and `faceTextSvg`, wraps them with `figureSvg` and `plateHtml`, and writes the page with `pageHtml({ script: kitScript() + live })`.
> - **React or Next.js.** Copy `kit/` into the project… build the static art in a server component with the `draw.tsx` components, and pass it as element props to one `"use client"` live component that moves things.
> - 社区 gallery：`references/publish.md` 说明用 `scripts/publish.mjs` 分享成品，「only when the user asks; nothing is pushed for them」。

主题：`data-theme="light"` 切换，图内不硬编码颜色（`data-tone`/`data-shade`）。（注记，来自 SKILL.md 示例说明）

## 八个示例（原文摘要）

> - `examples/dial-indicator/` is the smallest: a dial gauge on a stand, about 300 lines in all.
> - `examples/desk-computer/` is framework-free SVG: a desk computer with a keyboard you can type on… about 85 solids and 850 paths.
> - `examples/arcade-cabinet/` … a Hero of about 240 solids and 15 cables. A quarter flies into the slot, rolls down the coin chute… trips the coin-switch wire and drops into the cash box…
> - `examples/raptor-engine/` … round parts come from `kit/lathe.mjs` and pipes and harness from `kit/tube.mjs`. It comes apart into 11 assemblies… A WebGL plume, shock, splash and steam render between the back and front SVG.
> - `examples/ripple-tank/` … seen from 44° up. Two WebGL layers (lamp light, shadows and caustics on the paper, and the water's reflections and glass)… driven by a pure dispersion and optics model (`model.mjs`).
> - `examples/test-rig/` is a production figure from a real site (React/Next)… 53 solids and about 470 paths.
> - `examples/spot-plate/` is a second production figure from the same site: six pairs of glass drops on a spot plate, each pair drawn from one distance field…
> - `examples/turning-dial/` is the optional 3D mode: a combination dial that turns in true 3D with a small robot hand on it. It has about 90 live parts in metal materials… A WebGL LED, its light pool and sparks follow the moving parts.

## 3D 模式要点（原文）

> - **Live parts are the kit's own picture.** Each frame, convex kit primitives (prisms, rounds, domes, balls with flats, lathes, tubes) are re-projected and re-shaded by the kit's rules. A turn by θ is the kit drawing at azimuth `a − θ`.
> - **Order comes from separating planes.** … The audit proves there are no cycles at any angle or in any clip frame.
> - **Contacts are flush, tangent or rim-on-flat.** Joints are coaxial knuckle discs on the child group…
> - **Live tubes bend in near-horizontal planes or inside fittings, and never point along the view.** A bend needs R ≥ 2r / sin²(e − θmax), where θmax includes the pitch range of every hinge it rides…
> - **Materials remap the ramp.** Gold, chrome, steel, gunmetal, rubber, brass and copper each have a light and a dark set…
> - 性能（原文）：A small figure runs at 60 fps; a dense 380-part flexing hand measured about 20 fps at 1440 and 13–15 fps on a phone profile (390 px, 4× CPU throttle) on a heavily loaded machine.
> - 验证（原文）：Only a full run proves the figure, and it takes 15–20 minutes for 30 parts, so run it in the background.

## WebGL 要点（原文）

> - Use a shader only for what lines can't draw: fire and exhaust, water and caustics, real lamp light, glow, steam. The parts stay SVG.
> - **Three layers.** A back SVG holds what the effect covers, the canvas holds the effect (`pointer-events: none`), and a front SVG holds what covers it.
> - **World space, same camera.** Build every shader point from `onFloor`, `onWallX` and `onWallY`… Size everything in world units times `uK`.
> - **Nothing pops.** Every uniform follows an envelope with an attack and a decay… Phase changes are crossfades where colour shifts continuously with the physical quantity…
> - **No hard cut-offs.** Every term reaches zero before any `if`, bound or canvas edge…
> - **Light theme ships, and its shaders are designed for paper.** Use normal premultiplied alpha, never screen. Write the colour the paper should show and solve for the ink.

## 制作自发产物时的合规处理

`anatomy-skill-explainer.html` 的暗色版由一次性 Node build 脚本 `writeFileSync` 直接输出到仓库路径 `/home/cpf/code-inside/agc/anatomy-skill-explainer.html`（亮色版输出到 `/tmp`）。仓库规则禁止以程序化方式修改代码：生成文件进入仓库后，一切后续改动（许可证、来源说明、批注处理）必须用文件编辑工具手动修改成品 HTML，不得重新运行生成脚本覆盖。

## 制作实证的已核验数值（anatomy-skill-explainer.html，本会话实测）

- 单文件约 9.35MB，离线可打开。
- 仪器柜 geometry audit：136 个实体，`audit passed`，全部失败计数为 0。
- 明暗两版 line check：均输出 `line ends: 0`。
- browser smoke：八个抽屉依次加载对应示例（六 iframe srcdoc + 两 React bundle），主题切换后 iframe 重新注入对应用例，console 无报错。
- 六个独立 HTML 示例：dial-indicator、desk-computer、arcade-cabinet、raptor-engine、ripple-tank、turning-dial；两个 React 组件示例：test-rig、spot-plate（经 Bun `--target=browser` 打包后直接挂载当前页面）。