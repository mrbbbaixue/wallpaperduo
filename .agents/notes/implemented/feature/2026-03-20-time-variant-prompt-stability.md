# Agent Note: 逐时段变体的提示词稳定约束

Status: implemented

## Problem

生图模型会把「换光照」理解成「重画场景」：主体被替换、构图漂移、天际线与地标变形。一旦发生，同一原图的 day/night 变体就无法叠成一张会切换的壁纸（`AlignmentResult` 的 `score` 会掉下去，DDW 主题包也失去意义）。

单点约束不够：约束文本写在提示词里就只在**那一条**提示词里生效，用户改配置、走本地兜底、或 Worker 侧另拼一次 prompt，约束就丢了。`e612e22` 之前只有一句 `keepComposition`，且只在「当前时段之外」的变体上追加——同一个批次的提示词约束强度不一致。

## Decision

「不许动的东西」被提升为跨入口复制的硬约束文本，同时用系统提示词在模型侧再钉一遍。

**两道保险，四个入口**：

1. **模型侧（不依赖用户配置）**：`worker/providers.ts` 的 `composeGenerationPrompt` 在每个生图请求前无条件前置 `stabilityInstruction`（含 `Keep the core subject, silhouette, background landmarks, skyline, camera angle, and composition fixed.` / `Only change lighting, sky tone, shadows, practical lights, and small time-dependent details.`）；`analyzeImage` 的 systemPrompt 要求返回 `summary/subjects[]/foreground[]/background[]/lighting/palette[]/risks[]` 并用 summary 与 risks 识别 `immutable anchors`。OpenRouter 分支尾部固定 `Reference image fidelity is more important than novelty.`，`negativePrompt` 由前端拼出漂移词表（`subject replacement, composition change, camera shift, layout drift, skyline change, landmark deformation, tower shape change, ...`）。
2. **UI 侧模板**：`ControlPanel.generatePromptSuggestions` 对每个时段拼 `[generationPrefix, summary, subjectAnchors, 时段描述, stabilityConstraint, allowedTemporalChanges]`，其中 `stabilityConstraint`（「保持核心主体、主体轮廓、背景主地标、天际线、相机视角和主构图不变」）与 `allowedTemporalChanges` 对**所有**变体恒出现，不再区分当前时段。
3. **默认值**：`useSettingsStore.promptSettings` 的 `analysisUserPrompt` / `generationPrefix` / `defaultNegativePrompt` 内嵌同样的约束措辞，用户不配置也成立。
4. **迁移**：旧默认值保留为 `legacyPromptSettingsV1`，`migratePromptSettings` 逐字段比对——等于旧默认值就替换为新默认值，否则保留用户自定义；因此改默认文案必须同步 bump persist `version`（当前 3）。

**领域粒度**：`ThemeVariant = dark | light` 与 `TimeVariant = dawn | day | dusk | night` 是两条正交轴，而 UI 实际只产出一维——每个选中时段一个任务（上限 4），`theme` 由 `slot === "night" ? "dark" : "light"` 推导。`GenerationTask extends PromptVariant`，即「任务 = 变体 + 执行态」，`task.id` 就是变体 id。

## Alternatives considered

- **只在 Worker 侧约束** — 一处维护、所有请求都吃到。但用户看到的提示词里没有约束，编辑时会把约束删掉；且本地兜底分析（`source: "local-fallback"`）不经过 Worker，那条路径就完全没有约束。保留「UI 模板 + 模型侧前置」两道。
- **把约束抽成共享常量/包，四入口统一引用** — 单一来源，最不容易分叉。但前端、Worker 与 i18n 默认值分属三个运行环境（`worker/` 独立 tsconfig，中英文各一份文案是刻意的），抽常量会把中文文案与 Worker 英文提示词绑在一起；一期选择了重复文本 + 字符串断言把四处钉住（见下）。
- **让用户自己写死一段 system prompt** — 灵活，但把「不漂移」这项产品承诺变成用户责任，默认体验会碎；默认值里仍然带约束，用户可改。

## Consequences

- **收益**：约束在用户配置、本地兜底、Worker 远程三条路径上都成立；迁移逻辑让老用户自动获得新默认值而不丢自定义；`tone`/`timeOfDay` 缺失时由本地启发式回填，识图失败也不阻断流程（`source: "local-fallback"` + 警告）。
- **代价与已知上限**：
  - 约束是**复制粘贴的字符串**，四个文件各一份，没有共享常量；任何一处被改写而测试没同步就会悄悄分叉，而护栏只是文本包含断言。
  - `src/services/prompt/promptPlanner.ts`（`buildVariants` 枚举 2×4=8 个变体 + `buildPromptPlan`）**已是死代码**：`promptPlan`、`replaceTasksFromPromptPlan`、`updatePromptVariant` 全无调用方，只有回归测试读它的文本。它代表与现行 UI 不同的粒度模型（8 变体 vs ≤4 任务），留着会增加理解成本，且「测试保护的是非活代码」。
  - `tone` 的本地推断阈值（128 / 60 / 100 / 120 + 暖色比例）是经验值，夜景、雪景、单色图容易误判，会连带影响推荐时段。
  - 改默认文案必须 bump persist `version`，否则老用户永远拿不到新默认值。
- **重访信号**：出现主体替换/构图漂移/地标变形 → 先核对四处稳定串是否仍对齐；修改 persist `version` 或新增 settings 字段 → 会打破字符串断言（已发生一次）；若重新启用 `promptPlanner` 路径 → 必须与 `ControlPanel` 的模板共用同一套约束，不能并存两套。

## Verification

- 跑 `node --test tests/prompt-stability-regression.test.mjs`（4 个 case 全绿）：分别读 `useSettingsStore.ts`（约束文案 + `const legacyPromptSettingsV1` + `version: 3`）、`ControlPanel.tsx`（两条中文恒出现约束）、`promptPlanner.ts`（英文锚点句）、`worker/providers.ts`（`immutable anchors` + 两句 stabilityInstruction）。
- 人工确认：识图后每个变体的提示词都同时包含「保持不变」与「只允许变化」两段；断网触发本地兜底后，生成的提示词仍带这两段（因为模板在 UI 侧）。
