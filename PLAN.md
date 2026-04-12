# Left Canvas Framing Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将左侧画布从“静态预览 + 一键生成基准图”改成“固定比例画布上的图像构图编辑器”，让用户可以拖拽、放大、缩小上传图片，而外层裁剪框代表实际送给 AI 的基准画布。

**Architecture:** 在 [`src/components/canvas/CanvasWorkspace.tsx`](F:/mrbbbaixue/wallpaperduo/src/components/canvas/CanvasWorkspace.tsx) 中引入基于 `react-easy-crop` 的固定比例裁剪/构图层，使用 Zustand 保存当前构图状态，并让 [`src/services/canvas/prepareCanvas.ts`](F:/mrbbbaixue/wallpaperduo/src/services/canvas/prepareCanvas.ts) 按“用户当前构图”而不是“默认居中裁剪”输出 `preparedImage`。`crop` 模式要求图片铺满框，`pad` 模式允许图片小于框以支持扩充/留白构图，并继续沿用现有背景填充策略。

**Tech Stack:** React 19, Zustand, react-easy-crop, HTML Canvas, Pica, i18next, node:test regression tests

---

## Context And Key Assumptions

1. 当前左侧区域只是上传和结果预览；真正的裁剪发生在 [`src/components/canvas/CanvasControls.tsx`](F:/mrbbbaixue/wallpaperduo/src/components/canvas/CanvasControls.tsx) 调用 [`prepareCanvasImage`](F:/mrbbbaixue/wallpaperduo/src/services/canvas/prepareCanvas.ts) 时，而且是“自动居中裁剪”。
2. 你的描述里有一个潜在歧义：如果“扩充”意味着图片可以缩小到小于裁剪框、让 AI 看到外部延展区域，那么这不是传统裁剪，而是“固定画布上的构图编辑”。本计划按这个更完整的解释来写。
3. 为避免一次改动过大，本计划默认保留现有 `prepareMode`：
   - `crop`：图片必须覆盖裁剪框，输出纯裁剪结果。
   - `pad`：图片可以小于裁剪框，输出带背景填充的扩充画布。
4. 当前仓库已有 `react-easy-crop` 依赖，无需新增第三方库。Context7 文档确认可用 `onCropComplete` 获取像素区域，且 `restrictPosition` 可用于 `zoom < 1` 的场景。

## Approach Comparison

### Option A: 在左画布内直接接入 `react-easy-crop`，固定框代表 AI 输入画布

- 优点：项目已安装依赖，拖拽/滚轮/缩放交互成熟；固定比例框天然匹配“实际送给 AI 的画布”；能通过 `restrictPosition`、`minZoom` 和 `onCropComplete` 同时覆盖裁剪与扩充构图。
- 缺点：`pad` 模式不能只靠 `croppedAreaPixels`，还要额外把“图片相对画布的位置和缩放”传给渲染层。
- 结论：**推荐**。风险最低，最符合你的界面目标。

### Option B: 自己在 Canvas 里手写拖拽/缩放/裁剪框

- 优点：对“扩充留白”渲染最可控，最终输出和编辑器视觉模型完全一致。
- 缺点：手势、边界、缩放中心、移动端行为都要自己维护；明显比当前需求贵。
- 结论：只有在 `react-easy-crop` 的边界行为无法满足时才升级到这条路。

### Option C: 保持左侧静态预览，只在点击“生成基准图”时弹出裁剪弹窗

- 优点：改动最小。
- 缺点：违背“左边画布改成裁剪选择功能”的目标，也削弱“所见即所得”。
- 结论：不推荐。

## File Map

- Modify: [`src/components/canvas/CanvasWorkspace.tsx`](F:/mrbbbaixue/wallpaperduo/src/components/canvas/CanvasWorkspace.tsx)
  - 左侧主舞台改为“上传空态 / 构图编辑 / 结果预览”三态。
- Create: [`src/components/canvas/CanvasFramingEditor.tsx`](F:/mrbbbaixue/wallpaperduo/src/components/canvas/CanvasFramingEditor.tsx)
  - 封装 `react-easy-crop`、固定比例框、缩放条、重置按钮、模式提示。
- Create: [`src/services/canvas/framing.ts`](F:/mrbbbaixue/wallpaperduo/src/services/canvas/framing.ts)
  - 放纯计算逻辑：比例、最小缩放、构图状态归一化、从编辑器状态推导最终绘制参数。
- Modify: [`src/services/canvas/prepareCanvas.ts`](F:/mrbbbaixue/wallpaperduo/src/services/canvas/prepareCanvas.ts)
  - 从“自动居中裁剪/填充”升级为“按用户构图输出”。
- Modify: [`src/store/useWorkflowStore.ts`](F:/mrbbbaixue/wallpaperduo/src/store/useWorkflowStore.ts)
  - 保存当前构图状态，并在源图变更时重置。
- Modify: [`src/types/domain.ts`](F:/mrbbbaixue/wallpaperduo/src/types/domain.ts)
  - 为构图状态和 `PreparedImage` 增加明确字段。
- Modify: [`src/components/canvas/CanvasControls.tsx`](F:/mrbbbaixue/wallpaperduo/src/components/canvas/CanvasControls.tsx)
  - “生成基准图”按钮直接消耗当前左侧构图状态。
- Modify: [`src/components/control/ControlPanel.tsx`](F:/mrbbbaixue/wallpaperduo/src/components/control/ControlPanel.tsx)
  - 摘要文案补充“已应用构图”状态，避免用户误以为仍是自动居中裁剪。
- Modify: [`src/i18n/locales/zh/common.json`](F:/mrbbbaixue/wallpaperduo/src/i18n/locales/zh/common.json)
- Modify: [`src/i18n/locales/en/common.json`](F:/mrbbbaixue/wallpaperduo/src/i18n/locales/en/common.json)
  - 新增裁剪框、缩放、重置、扩充提示等文案。
- Create: [`tests/canvas-framing-regression.test.mjs`](F:/mrbbbaixue/wallpaperduo/tests/canvas-framing-regression.test.mjs)
  - 针对关键文件接线与文案的回归测试。

## Data Design

建议引入下面这组领域模型，避免把“交互态”和“AI 输入态”混在一起：

```ts
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasCropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasFraming {
  viewport: CanvasViewport;
  cropAreaPixels?: CanvasCropArea;
}
```

在 [`src/types/domain.ts`](F:/mrbbbaixue/wallpaperduo/src/types/domain.ts) 里把 `PreparedImage` 扩成：

```ts
export interface PreparedImage {
  id: string;
  sourceImageId: string;
  blob: Blob;
  width: number;
  height: number;
  objectUrl: string;
  mode: PrepareMode;
  ratioId: string;
  framing?: CanvasFraming;
}
```

在 [`src/store/useWorkflowStore.ts`](F:/mrbbbaixue/wallpaperduo/src/store/useWorkflowStore.ts) 里新增：

```ts
canvasFraming: CanvasFraming;
setCanvasViewport: (viewport: CanvasViewport) => void;
setCanvasCropArea: (cropAreaPixels?: CanvasCropArea) => void;
resetCanvasFraming: () => void;
```

默认值：

```ts
const defaultCanvasFraming = {
  viewport: { x: 0, y: 0, zoom: 1 },
  cropAreaPixels: undefined,
} satisfies CanvasFraming;
```

## Rendering Rules

1. 左侧画布永远展示“固定比例框”，框的比例跟 `ratioId`/`customRatio` 同步。
2. `crop` 模式：
   - 最小缩放必须让原图完整覆盖裁剪框。
   - 最终 `preparedImage` 只包含框内图像。
3. `pad` 模式：
   - 允许缩小到小于裁剪框，支持扩充式构图。
   - 框内未被原图覆盖的区域继续使用当前 `pad` 背景策略。
4. 一旦用户重新上传源图，构图状态、分析结果、任务列表、对齐结果都要像现在一样一起清空。
5. 当已有 `preparedImage` 且还没有结果时，左侧默认仍显示构图编辑器，而不是自动切成静态预览；否则用户会感觉“裁剪器消失了”。结果预览只在选中生成结果或手动切换到对比模式时出现。

## Manual QA Checklist

- 上传横图、竖图、超宽图，各自检查固定框比例是否正确。
- `crop` 模式下将图片拖到边缘，确认不会露底。
- `pad` 模式下将图片缩小，确认裁剪框外部代表最终 AI 画布，生成的基准图与预览一致。
- 切换比例预设与自定义比例时，确认框尺寸和构图状态按预期重置或夹紧。
- 重新上传图片后，确认旧的结果和分析状态被清空。
- 移动端检查触摸拖拽和缩放手势不会和页面滚动严重冲突。

### Task 1: Lock The Framing Data Contract

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/store/useWorkflowStore.ts`
- Create: `tests/canvas-framing-regression.test.mjs`

- [ ] **Step 1: 写一个失败中的回归测试，锁定新字段和 store API**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("workflow store exposes framing state and reset hooks", () => {
  const source = readFileSync("src/store/useWorkflowStore.ts", "utf8");
  assert.ok(source.includes("canvasFraming"), "store should keep canvas framing state");
  assert.ok(source.includes("setCanvasViewport"), "store should expose viewport updates");
  assert.ok(source.includes("setCanvasCropArea"), "store should expose crop-area updates");
  assert.ok(source.includes("resetCanvasFraming"), "store should expose framing reset");
});
```

- [ ] **Step 2: 运行测试，确认它先失败**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: FAIL with missing `canvasFraming`/`setCanvasViewport` assertions.

- [ ] **Step 3: 在类型和 store 里补齐构图领域模型**

```ts
export interface CanvasFraming {
  viewport: { x: number; y: number; zoom: number };
  cropAreaPixels?: { x: number; y: number; width: number; height: number };
}
```

```ts
setCanvasViewport: (viewport) =>
  set((state) => ({
    canvasFraming: { ...state.canvasFraming, viewport },
  })),
setCanvasCropArea: (cropAreaPixels) =>
  set((state) => ({
    canvasFraming: { ...state.canvasFraming, cropAreaPixels },
  })),
```

- [ ] **Step 4: 再跑一次测试**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add tests/canvas-framing-regression.test.mjs src/types/domain.ts src/store/useWorkflowStore.ts
git commit -m "feat: add canvas framing state contract"
```

### Task 2: Build The Left-Side Framing Editor

**Files:**
- Create: `src/components/canvas/CanvasFramingEditor.tsx`
- Modify: `src/components/canvas/CanvasWorkspace.tsx`
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/en/common.json`
- Test: `tests/canvas-framing-regression.test.mjs`

- [ ] **Step 1: 扩展回归测试，先锁定组件接线和关键文案**

```js
test("workspace mounts framing editor for source images", () => {
  const workspace = readFileSync("src/components/canvas/CanvasWorkspace.tsx", "utf8");
  assert.ok(workspace.includes("CanvasFramingEditor"), "workspace should render the framing editor");
  assert.ok(workspace.includes("setCanvasViewport"), "workspace should wire editor state back to store");
});
```

- [ ] **Step 2: 运行测试，确认新断言失败**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: FAIL with missing `CanvasFramingEditor` assertions.

- [ ] **Step 3: 新建构图编辑器组件**

```tsx
<Cropper
  image={sourceImage.objectUrl}
  crop={viewport}
  zoom={zoom}
  aspect={ratio.width / ratio.height}
  minZoom={minZoom}
  maxZoom={4}
  restrictPosition={prepareMode === "pad"}
  onCropChange={(crop) => setCanvasViewport({ ...viewport, ...crop })}
  onCropComplete={(_, areaPixels) => setCanvasCropArea(areaPixels)}
  onZoomChange={(nextZoom) => setCanvasViewport({ ...viewport, zoom: nextZoom })}
/>
```

- [ ] **Step 4: 把 `CanvasWorkspace` 改成三态舞台**

实现顺序：
1. 无图时保留现有上传空态。
2. 有 `sourceImage` 且优先编辑时，渲染 `CanvasFramingEditor`。
3. 有结果并进入 `single`/`compare` 结果模式时，再显示现有预览逻辑。

- [ ] **Step 5: 加上缩放滑条、重置按钮和固定框说明文案**

新增文案建议：

```json
"framingTitle": "构图框",
"framingHint": "框内内容就是实际送给 AI 的基准画布",
"zoom": "缩放",
"resetFraming": "重置构图"
```

- [ ] **Step 6: 再跑测试**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: PASS

- [ ] **Step 7: 提交这一小步**

```bash
git add src/components/canvas/CanvasFramingEditor.tsx src/components/canvas/CanvasWorkspace.tsx src/i18n/locales/zh/common.json src/i18n/locales/en/common.json tests/canvas-framing-regression.test.mjs
git commit -m "feat: add left-side framing editor"
```

### Task 3: Render Prepared Images From User Framing

**Files:**
- Create: `src/services/canvas/framing.ts`
- Modify: `src/services/canvas/prepareCanvas.ts`
- Modify: `src/components/canvas/CanvasControls.tsx`
- Modify: `src/types/domain.ts`
- Modify: `src/store/useWorkflowStore.ts`
- Test: `tests/canvas-framing-regression.test.mjs`

- [ ] **Step 1: 先为 prepare 流程补一条失败测试，锁定“必须接收 framing 状态”**

```js
test("prepare flow passes framing data into prepareCanvasImage", () => {
  const controls = readFileSync("src/components/canvas/CanvasControls.tsx", "utf8");
  assert.ok(controls.includes("canvasFraming"), "prepare button should consume current framing");
  assert.ok(controls.includes("framing:"), "prepare flow should pass framing into service");
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: FAIL with missing `framing:` assertion.

- [ ] **Step 3: 在 `framing.ts` 提炼纯计算函数**

至少提供这些函数：

```ts
export const getAspectRatio = (ratio: { width: number; height: number }) => ratio.width / ratio.height;
export const getCoverMinZoom = (image: Size, frame: Size) => Math.max(frame.width / image.width, frame.height / image.height);
export const getContainMinZoom = (image: Size, frame: Size) => Math.min(frame.width / image.width, frame.height / image.height);
```

再补一个把 editor 状态转成最终绘制参数的函数，例如：

```ts
export const resolveFramingRender = (input: ResolveFramingInput) => ({
  drawX,
  drawY,
  drawWidth,
  drawHeight,
  outputWidth,
  outputHeight,
});
```

- [ ] **Step 4: 改造 `prepareCanvasImage`，让它吃用户构图**

执行规则：
1. `crop` 模式优先使用 `cropAreaPixels` 输出最终图。
2. `pad` 模式使用 `viewport` + 目标画布尺寸绘制前景图，并沿用现有模糊背景铺底。
3. 如果 `framing` 缺失，回退到现在的居中裁剪/填充逻辑，避免老流程直接炸掉。

- [ ] **Step 5: 在 `CanvasControls` 里把 store 里的构图状态传给 prepare 服务，并把它写回 `PreparedImage.framing`**

```ts
const canvasFraming = useWorkflowStore((s) => s.canvasFraming);

const output = await prepareCanvasImage({
  source: sourceImage.blob,
  ratio,
  mode: prepareMode,
  framing: canvasFraming,
});
```

- [ ] **Step 6: 再跑回归测试**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: PASS

- [ ] **Step 7: 做一次类型检查**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 8: 提交这一小步**

```bash
git add src/services/canvas/framing.ts src/services/canvas/prepareCanvas.ts src/components/canvas/CanvasControls.tsx src/types/domain.ts src/store/useWorkflowStore.ts tests/canvas-framing-regression.test.mjs
git commit -m "feat: prepare baseline from framing editor state"
```

### Task 4: Keep Workflow Messaging And Preview Behavior Coherent

**Files:**
- Modify: `src/components/control/ControlPanel.tsx`
- Modify: `src/components/canvas/CanvasWorkspace.tsx`
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/en/common.json`
- Test: `tests/canvas-framing-regression.test.mjs`

- [ ] **Step 1: 先写失败测试，锁定“控制面板不再暗示自动居中裁剪”**

```js
test("control panel describes prepared image as framing-derived", () => {
  const panel = readFileSync("src/components/control/ControlPanel.tsx", "utf8");
  assert.equal(panel.includes("自动居中"), false);
  assert.ok(panel.includes("modeLabel"), "control panel should still summarize the current mode");
});
```

- [ ] **Step 2: 跑测试，确认失败或至少暴露当前文案缺口**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: FAIL or reveal missing framing summary assertions.

- [ ] **Step 3: 补摘要和状态文案**

建议在摘要 pill 中加入类似文案：

```ts
isZh ? "构图已锁定" : "Framing locked"
```

当 `pad` 模式且缩放低于 cover 阈值时，再加一条：

```ts
isZh ? "包含扩充留白" : "Includes expansion area"
```

- [ ] **Step 4: 调整左侧预览优先级**

规则：
1. 编辑构图时优先显示 `sourceImage` 编辑器。
2. 结果浏览时才切换到 `preparedImage`/result 预览。
3. “基准图”按钮要能回到构图结果或基准预览，不要让用户丢失编辑入口。

- [ ] **Step 5: 再跑回归测试**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: PASS

- [ ] **Step 6: 提交这一小步**

```bash
git add src/components/control/ControlPanel.tsx src/components/canvas/CanvasWorkspace.tsx src/i18n/locales/zh/common.json src/i18n/locales/en/common.json tests/canvas-framing-regression.test.mjs
git commit -m "feat: align framing copy and preview flow"
```

### Task 5: Final Verification

**Files:**
- No new feature files
- Re-check: `src/components/canvas/CanvasWorkspace.tsx`
- Re-check: `src/components/canvas/CanvasControls.tsx`
- Re-check: `src/services/canvas/prepareCanvas.ts`
- Re-check: `tests/canvas-framing-regression.test.mjs`

- [ ] **Step 1: 跑回归测试**

Run: `node --test tests/canvas-framing-regression.test.mjs`
Expected: PASS

- [ ] **Step 2: 跑现有回归测试**

Run: `node --test tests/ui-radius-regression.test.mjs tests/ui-density-regression.test.mjs tests/prompt-stability-regression.test.mjs`
Expected: PASS

- [ ] **Step 3: 跑完整质量检查**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: 手工验证**

按本文 “Manual QA Checklist” 逐项走一遍，尤其检查：
1. `crop` 模式不露底。
2. `pad` 模式缩小时最终 `preparedImage` 和左侧框内预览一致。
3. 移动端缩放不会把结果抽屉或页面滚动搞乱。

- [ ] **Step 5: 整理并提交**

```bash
git add src/components/canvas/CanvasWorkspace.tsx src/components/canvas/CanvasFramingEditor.tsx src/components/canvas/CanvasControls.tsx src/components/control/ControlPanel.tsx src/services/canvas/framing.ts src/services/canvas/prepareCanvas.ts src/store/useWorkflowStore.ts src/types/domain.ts src/i18n/locales/zh/common.json src/i18n/locales/en/common.json tests/canvas-framing-regression.test.mjs
git commit -m "feat: add framing-based baseline editor"
```

## Notes For The Implementer

1. 不要把“编辑器临时状态”只放在 `CanvasFramingEditor` 本地 state；那样比例切换、右侧按钮触发 prepare、以及返回编辑时都会丢状态。
2. `pad` 模式是这次最容易做歪的地方。它不是简单裁掉 `cropAreaPixels`，而是要把“图片相对固定画布的位置和大小”真正渲染进输出图。
3. 如果 `react-easy-crop` 在 `pad` 模式下的缩小交互表现不稳定，再退到 Option B，自绘固定画布编辑器；不要把一个半成品交互硬塞上线。
4. 一个跳出当前思路但很值得一起做的小增强：在裁剪框角落显示最终输出分辨率预估，例如 `1920 × 1080`。这能明显降低用户对“AI 实际收到什么”的不确定感。
