# WallpaperDuo UI 升级计划 v5.1（Edge-to-Edge + Collapsible Gallery）

更新时间：2026-03-09

## 1. 本轮目标

1. 把整体界面从“功能可用”升级为“高级创作工作台”（更强层级、更好留白、更统一气质）。
2. 在左侧画布区域新增“可伸缩画廊缩略图”（可展开/收起），让用户在主视觉区完成选图与对比。
3. 不改核心业务链路（上传、预处理、分析、生成、导出），只做 UI/UX 与交互组织升级。
4. 布局改为 edge-to-edge：左右区域不做圆角、直接占满，左侧画布区采用无边界视觉。

## 2. 现状快照（基于当前代码）

1. 主布局在 [`src/pages/MainPage.tsx`](src/pages/MainPage.tsx) 中采用 `9/3`，左侧为画布，右侧为流程与导出。
2. 左侧 [`src/components/canvas/CanvasWorkspace.tsx`](src/components/canvas/CanvasWorkspace.tsx) 只有主画布预览，没有内嵌缩略图带。
3. 缩略图已存在于 [`src/components/results/ResultsRail.tsx`](src/components/results/ResultsRail.tsx)，当前在桌面端显示在左侧下方，移动端放到底部 Drawer。
4. 主题基础已是衬线方向（[`src/theme/theme.ts`](src/theme/theme.ts)、[`src/index.css`](src/index.css)），但组件层仍有较多局部 `sx` 规则，视觉一致性还不够高。

## 3. 设计方向（高级感）

视觉关键词：`Studio Editorial`、`Focused Canvas`、`Edge-to-Edge`。

1. 强化“主舞台”：画布是第一视觉中心，控制区与导出区保持次级存在感。
2. 控制“玻璃感”剂量：减少泛滥的 blur/阴影，把强调聚焦到主卡片和关键操作。
3. 统一节奏系统：标题层级、卡片间距、按钮高度、边角半径保持一套规则。
4. 提升品牌感：顶部 AppShell 更像“产品头部”，不是普通工具栏。
5. 视觉边界最小化：去掉左右主区圆角和卡片感，改为平齐铺满式布局。

## 4. 关键新增：左侧画布画廊缩略图

结论：可以做，而且当前状态模型已经支持，改造成本可控。

### 4.1 交互定义

1. 生成成功后，缩略图自动出现在画布区域下方（桌面端）。
2. 点击缩略图切换 `activeResultId`，主画布即时更新。
3. 保留“基准图/单图/对比”模式；切回基准图时取消结果高亮。
4. 键盘仍支持左右切换（沿用 ResultsRail 的可访问性行为）。
5. 新结果到达时自动滚动到可见区域并高亮一次（轻动效）。
6. 缩略图区支持展开/收起：
- 展开：显示完整缩略图带与计数信息。
- 收起：保留一行轻量栏（标题 + 数量 + 展开按钮），最大化主画布可视空间。

### 4.2 布局策略

1. 桌面端：画布区改为两段结构
- 上段：3:1 主画布。
- 下段：可伸缩横向缩略图带（展开时固定高度，超出横向滚动；收起时仅保留工具栏高度）。
2. 移动端：继续保留底部 Drawer 结果入口，避免挤压主画布高度。
3. 若结果为 0，缩略图区不占位。
4. 左右区域容器去圆角、去内缩边界，整体铺满父级宽度。
5. 左侧画布区采用无边界视觉（不加外边框，不做独立卡片边界）。

### 4.3 技术落点

1. 新增组件：`src/components/canvas/CanvasGalleryStrip.tsx`（建议）。
2. 在 [`src/components/canvas/CanvasWorkspace.tsx`](src/components/canvas/CanvasWorkspace.tsx) 内组合主画布 + 画廊缩略图。
3. 复用 `useWorkflowStore` 中已有状态：`tasks`、`activeResultId`、`previewMode`、`setActiveResultId`。
4. [`src/components/results/ResultsRail.tsx`](src/components/results/ResultsRail.tsx) 转为“移动端底部胶片”专用，避免桌面端重复呈现两套缩略图。
5. 画廊展开态建议新增本地 UI 状态：`isGalleryExpanded`（可放在 `CanvasWorkspace`，如需持久化再迁移到 store）。

## 5. 分阶段实施

### Phase 1：视觉基线（高级感统一）

涉及文件：
- [`src/theme/theme.ts`](src/theme/theme.ts)
- [`src/components/common/SectionCard.tsx`](src/components/common/SectionCard.tsx)
- [`src/components/layout/AppShell.tsx`](src/components/layout/AppShell.tsx)

动作：
1. 收敛圆角、阴影、边框透明度，减少局部自定义“漂移”。
2. 统一标题/副标题/说明文字的层级与行高。
3. 顶栏强化品牌层级，弱化图标按钮噪音。
4. 主工作区改为 edge-to-edge：去掉左右主区圆角和容器边框式包裹。

### Phase 2：左侧画廊缩略图落地（核心）

涉及文件：
- [`src/components/canvas/CanvasWorkspace.tsx`](src/components/canvas/CanvasWorkspace.tsx)
- [`src/components/canvas/CanvasGalleryStrip.tsx`](src/components/canvas/CanvasGalleryStrip.tsx)（新增）
- [`src/pages/MainPage.tsx`](src/pages/MainPage.tsx)
- [`src/components/results/ResultsRail.tsx`](src/components/results/ResultsRail.tsx)

动作：
1. 拆分原画布内容，抽出“缩略图带”子组件。
2. 主画布与缩略图形成一个完整卡片，提高“左侧工作区闭环”体验。
3. `MainPage` 中移除桌面端独立 ResultsRail，只保留移动端结果抽屉能力。
4. 为缩略图带加入展开/收起交互，并在收起态保留最小控制条。
5. 左侧主画布改为无边界视觉，不使用外层卡片轮廓。

### Phase 3：流程区与导出区精修

涉及文件：
- [`src/components/control/ControlPanel.tsx`](src/components/control/ControlPanel.tsx)
- [`src/components/results/ExportPanel.tsx`](src/components/results/ExportPanel.tsx)

动作：
1. 降低步骤块视觉噪声（边框、底色、分割线密度）。
2. 优化导出映射区域信息密度，减少“表单墙”观感。
3. 统一按钮组和标签样式，提升可扫描性。

### Phase 4：验收与回归

动作：
1. `npm run lint`
2. `npm run build`
3. 视觉回归：中英文、亮暗主题、桌面/移动端。
4. 交互回归：上传后预处理、生成、切图、对比、导出全链路。

## 6. 风险与对策

1. 缩略图过多导致性能压力
- 对策：缩略图固定尺寸、`loading="lazy"`、限制一次性动效数量。
2. 左侧区域高度被压缩
- 对策：桌面端优先保证主画布高度，缩略图带高度固定且可滚动。
3. 两套结果入口引发认知重复
- 对策：桌面端只留画布内画廊，移动端保留 Drawer 入口。
4. 无边界视觉导致区域分界不清
- 对策：使用轻量分隔（色阶、间距、细线）替代卡片边框。

## 7. 验收标准

1. 左侧画布区域在有结果时出现可伸缩缩略图画廊，支持展开/收起，点击可切换主预览。
2. 桌面端不再出现“画布下方一套 + 独立 ResultsRail 一套”的重复胶片区。
3. 主画布仍保持 `3:1` 视觉主导，移动端不破版。
4. 左右区域无圆角且占满布局，左侧画布呈现无边界视觉。
5. 主题与样式节奏统一，页面观感明显提升为“高级创作台”。
6. `npm run lint` 与 `npm run build` 通过。
