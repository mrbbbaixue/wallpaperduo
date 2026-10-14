# Agent Note: 视觉令牌的唯一真源，以及 DESIGN.md 的参考地位

Status: implemented

## Problem

项目需要一个统一的视觉语言，于是 `837a5d6` 一次性引入了 `DESIGN.md`（281 行 OpenCode 设计系统摘录：暖黑 `#201d1d`、唯一字体 Berkeley Mono、4px 圆角、无阴影）。但同一时期实际生效的样式入口是另一套：`src/styles/globals.css` 的 shadcn 风格 HSL 令牌 + Google Fonts。若把 `DESIGN.md` 当成规范去遵守，写出来的界面与线上界面会不一致——这个歧义本身才是问题。

## Decision

**运行时样式真源是 `src/styles/globals.css` + `tailwind.config.ts` 的两层结构**，`DESIGN.md` 只是灵感参考，不是可执行规范。

- `main.tsx` **只** import `@/styles/globals.css`。
- 令牌三层：`globals.css` 的 `:root` / `.dark` 定义 HSL 数值 → `tailwind.config.ts` 把它们映射成语义色名（`hsl(var(--x))`）并把 `--radius` 展开为 `lg/md/sm` → 组件只写语义类名（`rounded-lg`、`bg-card`、`text-muted-foreground`）。
- 圆角：`--radius: 0.5rem`（8 / 6 / 4px 三级）；输入与常规控件用 `h-11 rounded-md`。
- 字体（实际生效）：`globals.css` 的 Google Fonts `Plus Jakarta Sans` + `Noto Sans SC` + `Inter` 无衬线栈；等宽栈（`Berkeley Mono` → `IBM Plex Mono` → 系统等宽）只保留在 tailwind `fontFamily.mono`，目前只有 `input.tsx` 的 `font-mono` 使用。
- **与 `DESIGN.md` 的三处冲突是既成事实**：圆角（4px 全站 vs 8/6/4 三级）、字体（唯一 Berkeley Mono vs 无衬线为主）、主色（暖黑 `#201d1d` vs HSL `--primary: 330 65% 48%`）。按 `DESIGN.md` 写新界面会与现有组件不一致。
- **`src/index.css` 是孤儿文件**（全库无 import）：里面是 `--ui-ivory/charcoal/bronze/mist` 令牌与 `MiSans` 优先字体栈——即 `b3395c0`「add MiSans as primary font」的全部成果，实际从未生效。中文字体的实际承担者是 `Noto Sans SC`。
- `tailwind.config.ts` 里另有一组 `opencode` / `semantic` 十六进制字面量（`bg-opencode-dark` 之类），只有 `button.tsx` 的 `default`/`destructive` 变体在用，其余已成遗留。

## Alternatives considered

- **完全照搬 `DESIGN.md`（单一等宽字体 + 4px 全站圆角 + 纯暖黑）** — 视觉身份最强，代码里已经把它作为参考写下来了。但整站换字体与色板是一次全局重构，且与 shadcn 组件的既有默认（`hsl` 令牌、多级圆角）冲突；`62f9216` 之后的取向反而是保留多级圆角。至今未执行。
- **删除 `DESIGN.md`** — 消除歧义最彻底。但它记录了「打开读一眼就知道想要的调性」的信息，且 `a60c88f`、`837a5d6` 这些提交以它为参照；留作参考、不用作规范的成本更低。
- **保留 MiSans 字体方案（`src/index.css`）** — 中文显示效果好、是刻意选的。但它从未被引入（无 import），成了「写了两套字体栈、只有一套在线」的困惑源；要么让 `main.tsx` 引入它，要么删掉它——当前状态（留着）是两者中最差的。
- **把圆角收紧到 6px 上限** — 曾经有回归测试按这个意图钉死 `--radius: 0.375rem` 与 13 个文件的精确 className，但代码后来回到 `0.5rem`，护栏因此长期为红，最终在 2026-10-14 随工作台重排一并删除（见 [源码文本回归护栏](../testing/2026-03-20-source-text-regression-guards.md)）。

## Consequences

- **收益**：改视觉只需动两处（`globals.css` 的令牌值 + `tailwind.config.ts` 的映射），组件层不出现裸色值；语义类名让明暗主题（`.dark`）自动成立，`color-scheme` 跟随系统；`DESIGN.md` 仍在，读它能快速理解「为什么要这么收紧」的调性来源。
- **代价与已知上限**：
  - 文档与实现分叉是**已知且持续的**：`DESIGN.md` 里三个关键值与线上不一致，任何按它写的新界面都要重新对一遍令牌。想彻底消除，需要么重写 `DESIGN.md` 只保留仍成立的部分，要么把它移出仓库。
  - `src/index.css` 的死令牌与 MiSans 栈会让人误以为中文字体是 MiSans。
  - `opencode` / `semantic` 十六进制与 HSL 语义令牌**并存**，同一份 UI 里有两套取色途径。
- **重访信号**：有人按 `DESIGN.md` 提交了与线上不一致的界面 → 先修文档；要统一中文字体 → 决定 MiSans 是引入还是删除；新增颜色/圆角 → 加到 `globals.css` 令牌而不是组件里写字面量。

## Verification

- 唯一样式入口：`grep -rn "index.css\|globals.css" src` 只应命中 `src/main.tsx` 对 `globals.css` 的 import。
- 令牌存在性：`grep -n "\-\-radius" src/styles/globals.css` → `0.5rem`；`grep -n "borderRadius" tailwind.config.ts` → `lg/md/sm` 三级算术。
- 字体分层：`grep -n "fontFamily" tailwind.config.ts`（等宽栈）与 `globals.css` body 的无衬线栈；`grep -rn "font-mono" src` 只命中 `src/components/ui/input.tsx`。
- 人工确认：切换明暗模式后语义色全部跟随（`.dark` 覆盖 `:root`），且没有组件写死十六进制（`bg-opencode-*` 除外）。
