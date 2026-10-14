# Agent Note: 取景框坐标系统——画布全尺寸放置 + 亮色取景框分离

Status: implemented

## Problem

用户无法控制构图。最早左侧只是「静态预览 + 生成基准图」按钮，真正的裁剪发生在无 UI 的自动居中裁剪里（`fe69c52` 的 PLAN 原文：「当前左侧区域只是上传和结果预览；真正的裁剪发生在 CanvasControls 调用 prepareCanvasImage 时，而且是"自动居中裁剪"」）。

而这里的需求本质不是裁剪，而是**让图片可以小于目标画布、留出 AI 可延展的扩充区域**。若把裁剪与比例绑在一起：切换目标比例会让整张图按新比例重新裁剪/缩放，用户摆好的构图丢失；也无法表达「留白交给 AI 补全」。

## Decision

画布永远占满左侧，比例只决定亮色取景框的形状；图片几何完全由用户拖拽/缩放决定，二者在结构上互不影响。

**三层 DOM**（`src/components/canvas/CanvasFramingEditor.tsx`）：宿主 → 画布层 `absolute inset-0`（不再按比例缩进）→ 图片层（`react-moveable` 的唯一 target）→ 亮色取景框层 `pointer-events-none border-2 border-white/90`，用 `boxShadow: 0 0 0 9999px rgba(0,0,0,0.32)` 做画布遮罩，带 `transition-[left,top,width,height] duration-200`。取景框几何来自 `resolveOutputAreaBox({canvas, ratio})`，图片几何来自 `resolveImageBoxOnCanvas({canvas, source, viewport})`——**ratio 不进入图片几何**，所以「切比例图片不动」是结构性的，不是靠回调顺序保证的。

**纯函数唯一真源**：`src/services/canvas/framing.ts` 无 DOM、无 React，14 个导出 + 5 个常量（`OUTPUT_AREA_PADDING_FRACTION = 0.88`、`MIN_SCALE = 0.35`、`MAX_SCALE = 4`、`MAX_OUTPUT_EDGE = 2480`、`EPSILON = 0.5`）。三套坐标系互不混用：

1. **画布 CSS px**：`canvasSize` 由 editor 的 ResizeObserver 测得，经 `onCanvasSizeChange` 写回 `store.canvasSize`；`resolveOutputAreaBox` / `resolveImageBoxOnCanvas` / `hasExpansionArea` 都在此坐标系返回 `BoxLike`。
2. **归一化 viewport**：`CanvasViewport = {cx, cy, scale}`，`cx/cy` 是图片中心相对画布的归一化坐标、`scale` 是相对「图片 contain 到画布」的倍数；`resolveViewportFromImageBox` 是唯一反向换算，且把 `cx/cy` 夹在 `[0,1]`（注释原文：防止图片被拖丢），`clampEditorScale` 在 editor 侧二次校正。
3. **源图像素**：只在 `resolveOutputPixelSize` 与烘焙时使用；`resolveImageDrawBoxInOutput` 以 `factor = outputSize.width / outputBox.width` 把画布 px 线性映射到输出像素。

**单一烘焙点**：只有 `ControlPanel.onPreprocess`（「分析当前构图」）调用 `prepareCanvasImage`——`clearRect` 保留 alpha → 按 `resolveImageDrawBoxInOutput` 绘制 → 超过 2480 长边时 pica 缩放 → PNG blob → `setPreparedImage`。**没有模糊背景铺底**，取景框外是真正的透明区。之后 `preparedImage.blob` 同时喂：识图、生图（data URL）、对齐的参考图、DDW 包的 baseline 图。

**交互期不烘焙**：拖拽/缩放途中只改 DOM style（`liveBoxRef`），`handleInteractionEnd` 才把最终 box 反向归一化写回 store；`setCanvasViewport` / `resetCanvasFraming` 只清分析链（见 [两级派生状态失效](../feature/2026-05-27-two-level-derived-state-invalidation.md)）。缩放上下限用 `event.setMin/setMax` 施加，范围是 `baseImageSize × 0.35 / 4`。

## Alternatives considered

- **在左画布内直接接入 react-easy-crop，固定框代表 AI 输入画布**（`fe69c52` 的 Option A，当日被采纳）— 优势真实存在：依赖已装、拖拽/滚轮/缩放交互成熟、风险最低。但它把「图片必须铺满裁剪框」当作前提，无法表达「图片小于画布、四周留白可见」，最终被换掉。
- **自己在 Canvas 上手写拖拽/缩放/裁剪框**（同日被否的 Option B）— 当日理由是「手势、边界、缩放中心、移动端行为都要自己维护，明显比当前需求贵」。两个月后实际走的正是这条路（`8246eb9` 换上手柄层 + `2a88b58` 重写几何），因为只有自绘才能让图片超出取景框完整可见。
- **保持左侧静态预览，点「生成基准图」时弹裁剪弹窗**（Option C）— 实现最省；但违背「左侧画布改成取景功能」的目标，也削弱所见即所得，未采用。
- **crop/pad 双模式 + 模糊背景填充** — 曾实现（`prepareMode: "crop" | "pad"`，pad 模式 `ctx.filter = "blur(36px) brightness(0.82)"` + 半透明蒙层）。它想让两种语义都可用，但取景框一改就得重做 baseline，且模糊底与「透明外扩」语义冲突。`79d0ee7` 删掉模式开关，改由几何判断：`hasExpansionArea` 直接算「图片是否盖满亮色框」。

## Consequences

- **收益**：切比例零成本且不丢构图；所有下游只认 `preparedImage.blob`，不存在「编辑器所见 ≠ 送 AI 像素」的分叉；透明 PNG 让扩充区成为真的 alpha 留白。
- **代价与已知上限**：
  - `cx/cy` 夹在 `[0,1]` 意味着「图片中心不能拖出画布」，想要完全自由的裁切必须重访该函数。
  - viewport 依赖运行时测得的 `canvasSize`，未就绪时图片层不渲染、moveable 不挂载；`store.canvasSize` 初值是 `{0,0}`，任何在首帧就调 `prepareCanvasImage` 的路径会退化为空画布。
  - 输出长边硬顶 2480（`MAX_OUTPUT_EDGE`，源自 ark API 的体积限制），超大源图会被下采样；`MIN_SCALE = 0.35` 也是硬下限，不能无限缩小。
  - 遗留死物：`react-easy-crop` 仍在 `package.json`（已无任何 import）；`src/constants/layout.ts` 的 `desktopWorkspaceHeight` 全库无引用。
- **重访信号**：需要不规则取景或图片中心可出画布 → 改夹取范围；输出被 2480 截断引发抱怨 → 调整上限；取景框需要贴边或可调 padding → 改 0.88；有人改 `framing.ts` 的导出名或 editor 的字面量 → 回归测试直接红（见 [源码文本回归护栏](../testing/2026-03-20-source-text-regression-guards.md)）。

## Verification

- 跑 `node --test tests/canvas-framing-regression.test.mjs`（9 个 case 全绿），它 pin 住分层与接线：`framing.ts` 含 `resolveOutputAreaBox`/`resolveImageBoxOnCanvas`/`resolveImageDrawBoxInOutput`；editor 含 `className="absolute inset-0"`、`from "react-moveable"`、`keepRatio`，且**不含** `Cropper`、`type="range"`；`CanvasControls` 不含 `prepareCanvasImage` 与 `setPrepareMode`；store 的 `setRatioId`/`setCustomRatio` 片段不匹配 `\bcanvasFraming\s*:`。
- 烘焙点唯一性：`grep -rn "prepareCanvasImage" src/` 只应命中定义处与 `ControlPanel.tsx`。
- 几何正确性**没有**自动化覆盖（测试是文本断言，不执行 framing 计算），改动几何后需要人工过一遍取景/比例切换/导出。
