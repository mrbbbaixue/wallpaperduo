# Agent Note: 派生状态的两级失效边界

Status: implemented

## Problem

工作流状态里既有「用户操作现场」（取景框、比例、源图），也有「由现场派生的昂贵产物」（预处理图、识图结果、提示词计划、生成任务、对齐结果、导出映射）。如果所有改动一律全清，用户微调一次取景框就会丢掉已经花钱生成的结果；如果一律保留，改了比例之后旧的分析与旧的任务会与新输出形状不一致，界面会显示「不属于当前输入」「的结果。

这两种错误都在真实使用里发生过：`98fdcd4` 引入全清（`clearDerivedState`）解决后者，`2a88b58` 拆出只清分析链的一级解决前者。

## Decision

`src/store/useWorkflowStore.ts` 维护两个失效层级，按「改动是否改变输出形状」选择：

- `clearDerivedAnalysis` = `{ preparedImage, sceneAnalysis, promptPlan }`：**清分析链，保留已生成结果**。用于 `setCanvasViewport`、`resetCanvasFraming`——取景框变了，旧分析不再代表当前构图，必须重算；但已经生成出来的图片仍是用户资产，属于历史。
- `clearDerivedState` = `clearDerivedAnalysis + { tasks: [], alignmentResults: {}, exportMapping: defaultExportMapping, activeResultId: undefined, previewMode: "single" }`：**全清**。用于 `setSourceImage`、`setRatioId`、`setCustomRatio`、`resetRun`——这些改动会改变输出形状（比例决定输出像素尺寸与取景框形状），旧任务与新输出不可比。

**绝不清 `canvasFraming` 的动作**：`setRatioId` / `setCustomRatio` 的 setter body 里不出现 `canvasFraming`，这是刻意的——切换比例只改变亮色取景框，图片位置与大小必须保持不变（见 [取景框坐标系统](../architecture/2026-05-27-canvas-framing-coordinate-system.md)）。`setPreparedImage` 是第三种：只清它自己的下游（`sceneAnalysis`、`promptPlan`、`tasks`、`alignmentResults`、`exportMapping`、选中态），因为它由分析动作写入。

配套的 id 契约：`task.id` 同时是变体 id、`AlignmentResult.variantId`、`ExportMapping.*[]` 的元素和 React key。换源图或比例后任务被清空，正是为了不让这些按 id 关联的映射指向已消失的任务。

## Alternatives considered

- **一律全清（单一 `clearDerivedState`）** — 语义最简单，任何「输入变了」都不会留下脏数据。但它把「拖一下取景框」也当成换输入：用户调整构图后已生成的结果全部消失，`2a88b58` 因此把它降级为「形状变化时才用」。
- **一律不清（靠 UI 标记结果过期）** — 不丢数据，代价是把过期判断推给每个消费点，且导出映射仍指向旧任务，`ExportPanel` 与 DDW 包会出现「图与分析不是同一版」的静默错配。`98fdcd4` 选择了在 store 层显式失效。
- **把失效规则写进各个 action 的实现里（不抽常量）** — 少一层间接，但「哪些字段一起失效」会散落在六处 setter 中，改一处漏一处；抽成两个常量后，测试也才能用 `const clearDerivedState` / `preparedImage: undefined` 这类字面量守住边界。

## Consequences

- **收益**：重塑构图不丢已生成结果；换比例/换源图不会留下与新输出形状不一致的任务；失效规则单点可读，新增 action 时只需选一级。
- **代价与已知上限**：这是**隐式契约**——新增派生字段时必须手动决定归到哪一级，漏加就会留下脏状态，编译器不会提醒；`previewMode` 与 `activeResultId` 只属于全清一级，重置取景后当前预览仍停在某个结果上（有意保留）。`setPreparedImage` 的清理列表是手写第三份，与两个常量有重叠但不共用。
- **重访信号**：出现「分析结果与当前取景不匹配」或「任务列表里混着上一张源图的条目」→ 说明某个 action 选错了层级；`state.promptPlan` / `replaceTasksFromPromptPlan` 这条死路径若被重新启用，它的失效规则必须一起接进来。

## Verification

- `tests/canvas-framing-regression.test.mjs` 的 `ratio changes invalidate derived analysis state without resetting the viewport` 直接断言：store 含 `const clearDerivedState`、`preparedImage: undefined`、`sceneAnalysis: undefined`，并且 `setRatioId:`→`setCustomRatio:` 与 `setCustomRatio:`→`setActiveResultId:` 两段都不匹配 `\bcanvasFraming\s*:`。
- 人工确认：拖图/重置取景 → 已生成结果仍在；改比例 → 任务与分析都被清空，但左侧图片位置未动。
