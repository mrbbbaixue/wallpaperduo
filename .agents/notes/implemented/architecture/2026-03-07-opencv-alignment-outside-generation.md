# Agent Note: 对齐（OpenCV）在生成主流程之外，按需从 CDN 加载

Status: implemented

## Problem

同一张参考图派生出的多张时段变体由不同次 AI 调用生成，主体位置会有位移；叠成一张会随时间切换的桌面壁纸时，切换瞬间画面会「跳一下」。这不动摇单张观感，但破坏了「同一场景昼夜变化」的产品承诺。

另一侧的压力是成本：对齐要在浏览器里跑特征匹配与透视变换（ORB + BFMatcher + RANSAC 单应 + warpPerspective），OpenCV 的 emscripten 构建接近十兆量级，塞进主 bundle 会让首屏为一个**可选**能力付费。

## Decision

对齐是一期就存在的可选能力，**不在生成/分析链路里**，且 OpenCV 不进 bundle。

- **调用点唯一**：`src/components/results/ExportPanel.tsx` —— 手动 `runAlignment()` 与导出前的 `ensureAligned()`。`alignToReference` 没有别的调用者；生成链路（`ControlPanel.onPreprocess` → `runSceneAnalysis`）完全不碰 OpenCV。
- **默认关闭**：`ensureAligned` 首行即 `if (!exportSettings.autoAlign) return;`，而 `autoAlign` 默认 `false`（`useSettingsStore.exportSettings`）。默认导出不做任何对齐。
- **参考图是取景后的像素**：`preparedImage.blob`（即 `prepareCanvasImage` 产出的透明 PNG），所以对齐比较的是「最终送 AI 的画面」。
- **算法链**：`imread` → `cvtColor(RGBA2GRAY)` → `ORB(2000)` → 特征/匹配各需 ≥8（否则抛 `ALIGNMENT_FEATURES_TOO_FEW` / `ALIGNMENT_MATCHES_TOO_FEW`）→ `BFMatcher(NORM_HAMMING, crossCheck)` → 按距离排序取前 80 → `findHomography(RANSAC, 5.0)`（空则 `ALIGNMENT_HOMOGRAPHY_FAILED`）→ `warpPerspective(INTER_LINEAR, BORDER_REFLECT)` 到参考图尺寸 → `score = clamp(inliers / selected, 0, 1)`。所有 cv 对象显式 `.delete()`。
- **加载方式**：`src/services/alignment/opencvLoader.ts` 在首次 `loadOpenCv()` 时动态插入 `<script src="https://docs.opencv.org/4.x/opencv.js">`，模块级 `readyPromise` 做单例记忆；`window.cv` 存在但 `Mat` 未就绪时挂 `onRuntimeInitialized` 等待。失败只 `reject(new Error("OPENCV_SCRIPT_LOAD_FAILED"))`。
- **降级粒度是「每张」**：单张对齐失败 → 该任务 `status: "failed"`、`score: 0`、`toUserError` 提示，导出仍然继续，`pickBlob` 回落到未对齐的原图。
- **`package.json` 里的 `@techstark/opencv-js` 没有任何 import**（真实加载走 CDN），是「避免把 OpenCV 打进 bundle」留下的化石。

## Alternatives considered

- **把对齐塞进生成队列（生成后立即对齐）** — 最「自动」，用户拿到的每张图都已对齐；但生成阶段的对齐成本会长在默认路径上（每张图都要等 ORB + warp），而多数用户只需要其中几张进 DDW 主题包；且对齐失败会污染生成任务的语义（生成成功但后续步骤失败）。留在导出前，用户既能手动触发，也能一开关切换。
- **用 `@techstark/opencv-js` 本地 wasm（依赖已在 package.json）** — 离线可用、不受 CDN 影响、版本可控。代价是 bundle 体积与初始化时机都要重新安排，`dfe7c98`→`ad113fa` 期间选择了 CDN 脚本 + 懒加载，之后没有回头（可能只是没人动）。这条路的收益至今仍然成立：只要出现「离线/被墙/证书问题导致对齐整体失效」的反馈，就应该走回来。
- **自己写特征匹配（不引 OpenCV）** — 省掉十兆依赖，可选点/单应都能用小型实现替代；但 RANSAC 单应与 warp 的实现与调参成本远超本工具的其他逻辑，一期直接复用成熟实现更合理。

## Consequences

- **收益**：默认零 OpenCV 成本；OpenCV 不进 bundle（`vendor-export` 只拆了 `jszip` + `file-saver`，`pica` 静态引入）；对齐逻辑纯 Blob 进出，与打包/落盘解耦。
- **代价与已知上限**：
  - 依赖外部 CDN：离线、被墙、证书问题都会让对齐能力整体失效；且 **rejected 的 `readyPromise` 被永久缓存**，同一会话内不再重试（当前缺陷）。
  - 如果 `<script data-opencv>` 早已 load 完成而 `window.cv.Mat` 仍缺失，`loadOpenCvScript` 会永久 pending。
  - 对齐是串行 for-loop（N 张即 N 次 ORB + warp），阻塞主线程；无 Worker。
  - 对齐与导出**没有任何自动化测试**：`tests/` 里检索 `alignToReference`/`loadOpenCv`/`theme.json` 为零命中。
- **重访信号**：用户抱怨昼夜切换跳变 → 考虑把对齐并进生成链路或默认打开；CDN 不可用投诉 → 改本地 wasm 并让失败可重试；打包体积告警 → 评估 `pica`/`jszip` 的加载时机。

## Verification

- 主流程不含对齐：`grep -rn "alignToReference\|loadOpenCv" src` 只应命中 `ExportPanel.tsx` 与 `alignmentService.ts` / `opencvLoader.ts`；`grep -rn "techstark" src worker` 应为空。
- 默认关闭：`grep -n "autoAlign" src/store/useSettingsStore.ts` → `false`。
- 加载方式：`grep -n "docs.opencv.org\|data-opencv\|readyPromise" src/services/alignment/opencvLoader.ts`。
- 端到端（人工）：设置里打开「导出前自动对齐」→ 导出 DDW，观察每张的 `score` 与失败提示；断网重试应看到 `OPENCV_SCRIPT_LOAD_FAILED`，且同会话不会恢复。
