# Agent Note: WinDynamicDesktop 主题包契约与两条导出路径

Status: implemented

## Problem

WinDynamicDesktop 不吃散图：它要的是一个 `.ddw`（zip）+ `theme.json` 清单 + 按序号命名的图片，且清单里必须同时给出 day/night 的图片列表，否则主题不加载或不切换。工具若只导出散图，用户还得手工拼包、手写清单、对序号。

另一个问题是画面漂移：同一参考图派生的变体叠成会切换的壁纸时，切换瞬间会跳（对齐能力见 [对齐在生成主流程之外](../architecture/2026-03-07-opencv-alignment-outside-generation.md)）。

## Decision

导出是「取 Blob → 打包 → 落盘」三段式，纯函数返回 `Blob`，落盘只发生在最后一刻。

**DDW 包结构**（`src/services/export/ddwExporter.ts`，扁平 zip，根目录无子文件夹，扩展名 `.ddw`）：

| 产物 | 说明 |
|---|---|
| `theme.json`（根，2 空格缩进） | 清单，见下 |
| `${fileStem}_${index}.png` | `index` 从 1 起，只覆盖 `status === "succeeded" && result.blob` 的任务，按过滤后顺序分配 |
| `${fileStem}_baseline.png` | 可选，有 `baselineImageBlob` 才写（当前=取景后的 `preparedImage.blob`） |

**`theme.json` 字段**：`imageFilename`（`` `${fileStem}_*.png` ``，通配 glob 而非具体文件名）、`dayImageList` / `nightImageList`（必填非空，`mapping` 的 variantId → 图片序号，查不到的 id 静默丢弃）、`sunriseImageList` / `sunsetImageList`（可选，**为空则 delete 掉键**而不输出空数组）。`ensureRequiredLists` 兜底：为空且已有图片时 `dayImageList = [1]`、`nightImageList = [1]`。无成功任务抛 `Error("NO_GENERATED_IMAGES")`。压缩用 `JSZip.generateAsync({ type: "blob" })` 默认 DEFLATE。

**时段桶名 ≠ 时段值**：`ExportMapping = { day, sunrise, sunset, night }`，而 `TimeVariant = dawn | day | dusk | night`；映射是 `day←day`、`sunrise←dawn`、`sunset←dusk`、`night←night`。归属在生成计划落地时由 store 预填，`ExportPanel` 只做勾选增删。

**共享规则**：`pickBlob` = 有对齐结果（`status === "succeeded"` 且有 `alignedBlob`）就用对齐图，否则用生成原图——`ddwExporter.ts` 与 `pngZipExporter.ts` 各存一份实现。两条路径都先 `await ensureAligned()`，都返回 `Blob`，由 `file-saver` 的 `saveAs` 落盘。

**两条路径的差异**：DDW 主题包用序号命名（供 `_*.png` glob 命中）并附 `theme.json` + baseline；PNG ZIP 用 `label` 派生文件名（去空格与非法字符，空则 `variant_N`），只有图。

**兼容层**：`src/services/export/ddwCompatibility.ts` 的 `validateDdwThemeShape` 只是最小 schema 冒烟校验——`imageFilename` 非空字符串、`dayImageList` 非空数组、`nightImageList` 非空数组，通过时返回一句「compatible with WinDynamicDesktop minimum schema」，由 `ExportPanel` 原样塞进 toast。**代码里没有任何 DDW 版本号、怪癖注释或 workaround。**

## Alternatives considered

- **在 `theme.json` 里写 `dayHighlight` / `nightHighlight` 自定义高亮色**（一期就有）— 让主题名带上作者选定的强调色，观感更可控；但 DDW 自己会算高亮，这两个字段在真实使用里没有收益。`b7af330` 删掉它们，并在同一次改动里把 baseline 图写进 zip，让包自包含。
- **只导出散图（PNG ZIP 一条路径）** — 实现最省，也让用户自己决定结构；但 DDW 用户必须手工拼包与手写清单，产品承诺（「导出即可用的主题包」）就断了。两条路径并存，PNG ZIP 服务「归档/二次加工」。
- **导出时按 `timeOfDay` 现场推断时段桶** — 少一份映射状态；但用户常把某张图放到别的时段（AI 出的「黄昏」更适合作白天），预填 + 可勾选更符合实际。映射因此落在 store，`ExportPanel` 只做增删。
- **导出前强制对齐** — 保证不跳变；代价是每次导出都要跑 OpenCV，且离线时整个导出流程被拖住。因此对齐保持可选手动/开关，`pickBlob` 负责在缺对齐结果时回落。

## Consequences

- **收益**：主题包可直接双击安装且自包含；导出逻辑纯函数、可复用于其它落盘方式；对齐可选，默认零 OpenCV 成本。
- **代价与已知上限**：
  - `pickBlob` 的规则**两份拷贝**，容易漂移。
  - baseline 图是 zip 里的孤儿：`theme.json` 不引用它，当前也无消费方；`ensureRequiredLists` 里 `Math.min(imageCount, 1)` 恒为 1，疑似原型残留。
  - `validateDdwThemeShape` 只查存在性，而且 `ExportPanel` 传进去的是 `mapping.day` / `mapping.night`（**variantId 字符串数组**）而非数字序号，所以实际退化成「用户是否勾过 day/night」的开关，无法发现「勾了但对应图不存在」这类断链（`mapIds` 会静默丢弃）。
  - DDW 的规范细节（图片是否可放子目录、`sunrise/sunset` 列表的时序语义、`imageFilename` 的 glob 行为）在仓库里没有任何出处，本地契约只有那三条断言。
  - 导出与对齐**没有自动化测试**（`tests/` 对 `theme.json` / `buildDdwBlob` / `buildPngZipBlob` 零命中）。
- **重访信号**：DDW 新版本报错或社区反馈主题不加载 → 需要补齐 `theme.json` 字段或目录结构；用户在 zip 里发现没用的 baseline → 移除或写进清单；需要校验「时段桶指向的图确实存在」→ 让 `validateDdwThemeShape` 接收序号而不是 id。

## Verification

- 字段契约：`grep -n "dayImageList\|nightImageList\|imageFilename\|theme.json" src/services/export/ddwExporter.ts` 命中接口与写盘两处；并确认 `ThemeJson` **不含** `dayHighlight` / `nightHighlight`（历史回归点）。
- 兼容层：`grep -n "missing imageFilename\|missing dayImageList\|missing nightImageList" src/services/export/ddwCompatibility.ts`。
- 人工端到端：生成 ≥2 个时段 → 导出 `.ddw` → 解压检查根目录文件命名与 `theme.json` 字段；把包喂给 WinDynamicDesktop 确认能识别并按时段切换。
