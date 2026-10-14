# Agent Note: 用源码文本断言做架构护栏

Status: implemented

## Problem

这个项目的关键约定大多是**代码说不出来的**：取景框只由亮色框决定、切比例不许重置 viewport、主 CTA 只能有一处、左侧结果画廊不许长按钮、稳定性提示词四处必须一致、渐进式步骤不许提前禁用。这些约定横跨多个文件，类型系统看不见，又没有渲染测试基建（`package.json` 里没有 `test` script，也没有 jsdom / testing-library）。

结果是：一次「顺手重建的工作台布局」就能把架构意图改回去，而没有任何东西会变红。

## Decision

用 `node:test` 写**源码文本断言**作为架构护栏：读文件内容，断言某些字面量必须出现或必须消失。

- 位置与运行方式：`tests/*.test.mjs`，纯 `node --test tests/*.test.mjs`（`package.json` 里**没有** `test` script，`.github/workflows` 已随 Pages 部署一起删除，所以**没有 CI**）。注意 `node --test tests` 在 Node 26 下会把目录当模块解析而失败，必须给文件 glob。
- 断言对象是「接线与意图」，不是行为：例如 store 含 `clearDerivedState` 且不含 `setCanvasCropArea`；`CanvasFramingEditor` 含 `from "react-moveable"` 且不含 `Cropper`；`CanvasControls` 不含 `prepareCanvasImage`；`getRatioId` 之外的比例 setter 片段不得匹配 `\bcanvasFraming\s*:`；画廊不得出现 `t("common.download")`。
- 现有 18 个 case：`canvas-framing-regression.test.mjs`（9）、`ui-density-regression.test.mjs`（5）、`prompt-stability-regression.test.mjs`（4）。

**已知失效模式**：断言只看字面量，所以「保持字面量的重构」会继续绿（把 `clearRect` 注释掉照样通过），而「改名/移位的等价实现」会假红。因此它守住的是**决定不被无意回退**，不是正确性。

**2026-10-14 的清理**（本轮工作台重排时一并处理，此前 4 个 case 长期为红且无人发现，因为没有 CI）：

| 原本红的 case | 处理 | 原因 |
|---|---|---|
| `ui-radius-regression.test.mjs`（整文件） | 删除 | 前提已被后续决定推翻：它钉 `--radius: 0.375rem` 与 13 个文件的精确 className，而线上是 `0.5rem`，其中 `GenerateControls.tsx` 已被删除；文件级冻结无法表达「半径策略变了但仍有约束」 |
| `ui-density`：`WorkflowStepCard should keep a subtle rounded corner` | 删除该断言 | `62f9216`（步骤卡片去圆角）是更晚的决定，护栏停留在 2026-03 的取向 |
| `ui-density`：`Canvas workspace desktop surfaces should drop rounded corners` | 删除该断言 | 同上，线上画布区已回到 `rounded-lg` |
| `prompt-stability`：`version: 2` | 改成 `version: 3` | `7bf31615` 升版到 3；这条断言的意图（改默认文案必须 bump 版本以触发迁移）仍然成立，所以保留而不是删除 |
| `canvas-framing`：右栏持有 `setPreviewMode` / 下载 | 改为指向 `CanvasToolbar` | 动作搬家是刻意的（见 [工作台布局](../feature/2026-10-14-workbench-pinned-action-bar.md)），不变量「左画廊保持纯展示」保留 |

## Alternatives considered

- **引入真实渲染测试（vitest + @testing-library/react + jsdom）** — 能断言行为而不是文本，是长期正解。代价是新增一批依赖与一套构建配置，并且要先把「哪些行为值得测」定下来；本轮只清理了失效护栏，没有引入新基建。
- **把稳定提示词、半径、断点等抽成共享常量，用单元测试断言常量** — 单一来源，断言可以变成真正的行为测试（「拼出来的提示词包含约束」）。但提示词文案必须留在 `worker/`（英文）与 i18n 默认值（中英各一份）里，抽常量会把不同运行时的文案绑在一起；`useWorkflowStore` 的失效层级同理，抽成导出常量只是为了被测试读。
- **把校验脚本接进 CI** — 是真正的补救（本轮 4 个红 case 之所以长期存在，就是因为没有 CI）。但仓库当前的部署路径已经从 GitHub Pages 切到 Cloudflare Workers，且没有其它 workflow，加 CI 属于新的基础设施决定，没有在本轮一并做。
- **不写任何测试** — 这类「结构性约定」没有别的地方承载，删掉护栏等于把架构意图只留在提交信息里。

## Consequences

- **收益**：跨文件约定有了成本极低的护栏（无依赖、毫秒级、只读源码）；`node --test tests/*.test.mjs` 是唯一的验证入口，任何人（含 agent）都能立刻跑。
- **代价与已知上限**：
  - 断言与实现耦合在字面量上，重构会带来假红，而假红又会诱发「反正改字符串就行」的动手方式——必须在改字符串前先判断那是不是「决定回退」。
  - 没有 CI，红了的护栏可以长期无人发现（已发生过一次，四个 case）。
  - 覆盖的是静态文本，几何计算、导出包结构、Worker 契约、密钥脱敏这些真正有行为风险的区域**没有**测试。
- **重访信号**：护栏再次长期为红 → 说明需要 CI 或改渲染测试；某个 case 因为「改名」而红但决定本身没变 → 应把它重写成行为断言而不是更新字面量；开始有人靠改断言让测试变绿 → 这套护栏已经失效。

## Verification

- 跑：`node --test tests/*.test.mjs` → 当前 18 个 case 全绿（`tests/` 下三个 `.mjs`）。
- 断言方式自证：`head -8 tests/*.test.mjs` 只导入 `node:test` / `node:assert/strict` / `node:fs` / `node:path`，没有任何源码 import。
- 无 CI 的事实：仓库根目录不存在 `.github/`；`package.json` 的 scripts 只有 dev/typecheck/build/lint/check/format/preview/deploy 系列。
