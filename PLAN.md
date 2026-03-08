# WallpaperDuo UI 升级计划 v4.0（高端现代衬线版）

## 1. 目标与边界

### 1.1 核心目标
- 将当前工作台升级为“高端现代”视觉风格，强调克制、秩序和高级质感。
- 全局字体改为衬线体系，兼顾中文与英文显示质量。
- 保留现有业务链路（上传、分析、生成、导出、设置），本次以 UI/UX 重构为主，不改核心能力。

### 1.2 设计方向
- 视觉关键词：`Editorial`、`Luxury Minimal`、`Soft Glass`、`Spatial Rhythm`。
- 页面气质从“工具面板”升级为“创作工作台”。
- 保持 3:1 画布主导布局，但提升信息层级和留白节奏。

---

## 2. 代码现状审计（基于当前仓库）

### 2.1 可见问题
- 主题字体仍是无衬线（`IBM Plex Sans` + `Syne`），与“高端衬线”目标冲突。
- 大量组件使用内联 `sx`，视觉规则分散，后续维护成本高。
- `SectionCard` 间距与圆角较紧，信息密度偏高，不符合高端感所需的呼吸感。
- 顶栏（`AppShell`）结构偏功能化，品牌层级和视觉重心不足。
- `ResultsAndExport`、`ProviderSettingsPanel` 信息堆叠较重，缺少分组节奏与强调层级。
- `src/App.css` 仍保留 Vite 模板样式，疑似遗留文件，易引入风格噪音。

### 2.2 风险点
- 全局字体改造会影响中英文字符宽度，需重新校准按钮高度、输入框行高和断行。
- 玻璃模糊和渐变叠层过多会增加绘制开销，需控制 blur 层数量和范围。
- 设置面板字段较多，若只换皮不重排，视觉仍会显得拥挤。

---

## 3. 改造方案

### 3.1 建立统一设计令牌（Design Tokens）
- 在 `src/theme/theme.ts` 建立高端化 token：
  - 颜色：`ivory` / `charcoal` / `bronze` / `mist` 体系。
  - 间距：8pt 基础上新增 `12/20/28/40` 的节奏层。
  - 阴影：分离 `soft`, `elevated`, `hero` 三档。
  - 圆角：收敛为 `12 / 18 / 28` 三档，不再随处自定义。
- 将可复用样式从组件内联 `sx` 提升到主题 `components` 覆盖层，减少样式漂移。

### 3.2 全局衬线字体系统
- 字体策略：
  - 中文主字体：`Noto Serif SC`。
  - 英文/数字主字体：`Source Serif 4`（或 `Cormorant Garamond` 作为标题强调）。
- 应用策略：
  - `body`、`button`、`input`、`chip` 统一衬线族。
  - `h1/h2/h3` 使用更高对比的衬线字重与更紧的字距。
  - 代码/技术字段（如 provider id）保留等宽字体以提升识别性。
- 调整 `line-height` 与 `letter-spacing`，避免中文衬线在小字号下发灰。

### 3.3 页面骨架与空间重构
- `MainPage`：
  - 保持左 9 右 3 的主结构，但引入明确的垂直节奏分区。
  - 下方结果区与上方工作区建立视觉分割（细线 + 光晕 + 间距）。
- `AppShell`：
  - 顶栏改为更轻量但更有品牌感的“悬浮带”。
  - 标题与 tagline 形成主副层级，操作按钮弱化为次级视觉。
- 画布区：
  - 保持 `3:1` 主画幅，强化“展板感”（更精致边框、阴影和底部柔光）。

### 3.4 关键组件重设计
- `SectionCard`：
  - 增加留白，优化标题区（标题、副标题、操作按钮）对齐规则。
  - 卡片层级统一到主题，不在业务组件重复定义边框阴影。
- `ControlPanel`：
  - 由“线性堆叠”改为“步骤组块”（选择时段 -> 分析 -> Prompt -> 生成队列）。
  - 每组块加简洁编号或小标题，提升扫描效率。
- `ResultsAndExport`：
  - 画廊卡片采用统一比例和更干净标签样式。
  - 导出映射区改为更紧凑但层次清晰的矩阵布局。
- `SettingsModal` / `ProviderSettingsPanel`：
  - 增加分区标题与说明文本密度控制，减少“长表单压迫感”。
  - 对高频项（Provider 路由、模型、API Key）做优先级前置。

### 3.5 高端氛围细节
- 背景：采用低饱和多层渐变 + 轻颗粒纹理，避免纯平背景。
- 模糊：只保留 2-3 个关键高斯层，避免全局泛滥。
- 动效：
  - 页面进入、卡片浮现、按钮悬停采用统一缓动曲线。
  - 动效时长收敛到 `160ms / 240ms / 420ms` 三档。
- 暗色模式与亮色模式都保持“高端一致性”，不出现“换肤但换气质”问题。

---

## 4. 实施步骤（按优先级）

1. 基线清理
- 清理遗留样式文件与无效规则（重点检查 `src/App.css`）。
- 盘点内联 `sx` 的重复样式，列出可主题化项。

2. 主题与字体落地
- 更新 `src/index.css` 字体导入与全局变量。
- 重构 `src/theme/theme.ts` 的排版、颜色、阴影、组件覆盖。

3. 骨架与卡片系统
- 重构 `src/components/layout/AppShell.tsx`、`src/pages/MainPage.tsx`、`src/components/common/SectionCard.tsx`。
- 先统一骨架和卡片，再进入业务面板样式。

4. 业务面板视觉重排
- 依次改造：
  - `src/components/canvas/CanvasWorkspace.tsx`
  - `src/components/control/ControlPanel.tsx`
  - `src/components/results/ResultsAndExport.tsx`
  - `src/components/settings/SettingsModal.tsx`
  - `src/components/settings/ProviderSettingsPanel.tsx`

5. 微交互与性能校准
- 统一转场与悬停动效。
- 控制 blur 与阴影开销，检查低端设备流畅度。

6. 验证与收口
- 运行 `npm run lint`、`npm run build`。
- 做中英文、亮暗模式、移动端到桌面端的视觉回归检查。

---

## 5. 验收标准

- [ ] 全局字体为衬线体系，中文和英文显示稳定、无明显错位。
- [ ] 页面整体视觉达到“高端现代”目标：层级清晰、留白充足、质感统一。
- [ ] 画布区域仍为 `3:1` 且视觉重心明确。
- [ ] 顶栏、卡片、设置弹窗、结果区风格统一，不再出现“拼装感”。
- [ ] 内联重复样式显著减少，主题 token 覆盖率提升。
- [ ] 亮色/暗色模式均保持一致审美，不发生明显破版。
- [ ] `npm run lint` 通过。
- [ ] `npm run build` 通过。

---

## 6. 超出当前思路的建议（可选）

- 引入“品牌叙事元素”：例如每个时段（晨/昼/昏/夜）对应一套微色调标签，让结果区更具收藏感。
- 增加“演示模式”（Presentation Mode）：隐藏复杂控制，仅展示画布与结果，适合对外演示或截图传播。
- 后续可考虑把 UI token 独立为 `theme/tokens.ts`，为未来多主题（Classic / Luxe / Studio）打基础。
