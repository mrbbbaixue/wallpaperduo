# Agent Note: 工作台布局——主操作常驻底栏 + 画布工具条

Status: implemented

## Problem

工作台是「左画布 + 右栏」两栏，而右栏是一个整体滚动的长列：四张可折叠的步骤卡片，主 CTA（生成/取消）藏在**第 4 张卡片展开后的 body 里**，预览模式与单张下载又挂在整列的**最底部**。结果是：想点「生成」要先展开步骤 4 再滚到那一段；生成中想取消，还得先找回来。动作的可见性取决于滚动位置，而不是取决于它属于哪个对象。

同类工具的做法正好相反：生成类应用把「输入 + 主操作」固定在面板底部或画布旁（Krea 的提示词与生成入口常在视口内；Leonardo 的左侧导航 + 中央画布 + 右侧设置，设置滚动但动作不在滚动流里），编辑器类应用把「作用于当前选中对象的动作」放在对象旁边（Recraft 的右侧 context panel 就是「对选中图能做什么」的归宿，其左侧面板才负责生成）。本仓库的原布局把两类动作都塞进了滚动流中部。

## Decision

动作按「作用于谁」重新分家：批次级动作常驻右栏底栏，画布级动作贴在画布上。

**1. 右栏 = 滚动区（步骤卡片）+ 常驻底栏**

- `src/components/control/CreationActionBar.tsx`：`sticky bottom-0` 的主操作栏，含主 CTA（「生成 N 个版本」/「取消生成」）、队列进度（`完成 x/y` + `成功 · 失败` + 细进度条）、错误行。它是 ControlPanel 根节点的**最后一个子元素，且不在 `overflow-hidden` 包裹层内**——`overflow-hidden` 会成为最近的 scrollport 从而让 sticky 失效。
- 第 4 张步骤卡片只剩「本次批量生成」摘要（选中时段 pill、供应方、并发/重试说明）+ `TaskQueue`，不再承载 CTA。
- 生成执行逻辑从组件里抽到 `src/hooks/useGenerationRunner.ts`：构建任务、入队、终态合并、toast、`AbortController` 全在这里，返回 `{ generating, error, run, cancel, canRun }`。`src/components/control/GenerateControls.tsx` 随之删除（它的 `showAnalyze` 只有 `false` 一种用法）。

**2. 画布 = 顶部工具条 + 舞台**

- `src/components/canvas/CanvasToolbar.tsx`：① 比例标签与源图信息（比例原本只在右栏步骤 1 里出现）；② 结果计数；③ `sm` 以上显示预览模式分段控件（目标画布 / 单图预览 / 前后对比）；④ 下载当前结果。
- `CanvasWorkspace` 的桌面栅格从 `minmax(0,1fr) [auto]` 改为 `[auto] minmax(0,1fr) [auto]`（工具条 / 舞台 / 结果画廊），工具条仅在已有源图时渲染；移动端则叠在舞台上方。
- `ControlPanel` 不再持有任何画布动作（`setPreviewMode`、`t("common.download")` 已移出）。
- 顺手把空态上传块的 `rounded-2xl` 收到 `rounded-lg`，让新工具条与空态一并落在既有的「紧凑工作台不使用大圆角」约束里。

## Alternatives considered

- **维持现状，只把第 4 张卡片默认展开** — 零改动、零风险；但动作的可见性仍然取决于滚动位置，生成中取消依旧要滚回底部，问题只是被减轻而不是被解决。
- **右栏改成全宽标签页（生成 / 结果 / 导出三页）** — 与同类应用的「面板分工」最接近，且本仓库已有先例（设置弹窗就是三个 Tab）。但步骤卡片之间是**顺序依赖**（分析→选时段→提示词→生成），拆成互斥的标签页会切断这条链路；而且这批状态（`selectedSlots`、`prompts`、`detectedTimeOfDay`）全在 `ControlPanel` 内，拆页需要把状态上提到页面级，改动面远超收益。
- **把 CTA 放进 Header** — 最常驻，永远不会滚走。但它离输入（时段选择、提示词）最远，且 Header 里已经有语言/主题/设置三个图标，语义上不属于「全局导航」。底栏离输入最近，符合「输入在上、执行在下」的阅读顺序。
- **给底栏用 `position: fixed` + 手算偏移** — 能摆脱 sticky 的父块边界限制。但要手工同步滚动容器、Header 高度与移动端布局，容易在断点处错位；sticky 由浏览器按滚动容器自动处理，成本更低。

## Consequences

- **收益**：主 CTA 与队列进度在任何滚动位置都可见；画布级动作（比例、预览模式、下载）回到画布旁边，与「目标画布/单图/对比」这三个预览状态一一对应；生成逻辑不再属于某个组件，后续要在别处触发生成只需用同一个 hook。
- **代价与已知上限**：
  - sticky 的可见范围**等于 ControlPanel 这个块的高度**：继续往下滚到导出区时按钮会随块一起离开视口，那时主导动作变成导出。若将来需要「面板内任何位置都能生成」，得把底栏提到滚动容器这一层（即把 `selectedSlots` / `prompts` 状态上提）。
  - 移动端下 sticky 依附的是窗口滚动，键盘弹出时的视口收缩会让它上浮，需要真机确认。
  - 预览模式分段控件在 `<sm` 被隐藏，小屏仍只能用「目标画布」与单张结果，对比模式需要更宽的屏。
  - 删除 `GenerateControls.tsx` 后，`tests/` 里指向它的断言（半径护栏）随之失效——护栏同步见 [源码文本回归护栏](../testing/2026-03-20-source-text-regression-guards.md)。
- **重访信号**：用户反馈「滚到导出区后还要回头生成」→ 把底栏提到页面级；需要「只重试失败项」「删除单个结果」→ 底栏是这些批量动作的落点；新增画布级动作（缩放适配、网格、吸附）→ 加到 `CanvasToolbar`，不要再放回右栏。

## Verification

- 结构：`src/components/control/CreationActionBar.tsx` 与 `src/components/canvas/CanvasToolbar.tsx` 存在；`src/components/control/GenerateControls.tsx` 已不存在；`CanvasWorkspace` 的 `gridTemplateRows` 由 `[showToolbar, 1fr, hasResults]` 拼出。
- 守卫测试：`node --test tests/*.test.mjs`（18 个 case 全绿），其中 `canvas-framing-regression.test.mjs` 的 `desktop workflow keeps left gallery presentation-only and pins result actions to the canvas toolbar` 断言动作已移到工具条、且不再出现在 `ControlPanel` 与左画廊；`ui-density-regression.test.mjs` 已把两个新组件纳入「不使用 `rounded-xl`/`rounded-2xl`」的清单。
- 构建期：`npm run typecheck` 与 `npm run build` 通过；`vite` dev 下逐个请求 `main.tsx` / `ControlPanel.tsx` / `CanvasWorkspace.tsx` / `CanvasToolbar.tsx` / `CreationActionBar.tsx` / `useGenerationRunner.ts` 均返回 200 且无 transform 错误。
- **未做视觉验证**：本轮按用户要求没有做浏览器截图核对，只验证到「模块可加载 + 构建通过 + 断言绿」。布局在真实视口下的贴合度（底栏高度、工具条与画廊的合计高度、移动端 sticky）仍需要一次人工过目。
