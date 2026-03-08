# WallpaperDuo 调整计划 v3.0（当前版本）

## 1. 本次改造目标

### 1.1 Provider 路由改造
- 将“视觉分析”与“图像生成”解耦为两套独立选择：
  - `analysisProvider`（视觉分析）
  - `generationProvider`（图像生成）
- 支持跨 Provider 组合：例如使用 OpenRouter 做视觉分析，同时使用 Ark 做图像生成。
- Provider 配置中明确区分：
  - 图像生成模型（Generation Model）
  - 视觉分析模型（Analysis Model）

### 1.2 安全与设置改造
- 去除本地密钥加密/解密流程（不再维护口令输入、密钥加解密按钮和对应状态）。
- 保留 BYOK（用户自行填写 API Key）模式，配置存于本地。
- 设置弹窗标题改为“模型与提示词设置”语义，避免“安全加密”误导。

### 1.3 提示词设置外露
- 在设置窗口新增 `Prompt Settings` 区块并落地到持久化配置：
  - 视觉分析附加提示词（analysis prompt）
  - 生成提示词前缀（generation prefix）
  - 默认负面提示词（default negative prompt）
- 预处理阶段与生成阶段均读取上述配置，形成可控默认行为。

### 1.4 UI 与布局改造
- 移除页面外层边距，改为接近 full-bleed 布局。
- 增大主画布占比（左侧画布区域更宽）。
- 默认画布比例改为 `3:1`。
- 增加高斯模糊氛围层（背景与画布区域的模糊视觉）。

---

## 2. 技术实现方案

### 2.1 状态管理（`useSettingsStore`）
- 新增字段：
  - `analysisProvider`
  - `generationProvider`
  - `promptSettings`
- 删除字段与行为：
  - `keysEncrypted`
  - `encryptAllKeys`
  - `decryptAllKeys`
  - `resolveApiKey`
- `persist` 版本升级并迁移：
  - 兼容旧 `selectedProvider`，迁移为分析/生成双路由默认值。
  - 补全新的 `promptSettings` 默认配置。

### 2.2 Provider 调用链
- `createProvider` 改为直接读取明文 API Key（移除口令参数与解密逻辑）。
- `testProviderConnectivity` 移除口令参数。
- 预处理逻辑使用 `analysisProvider`。
- 生成逻辑使用 `generationProvider`。

### 2.3 设置窗口结构
- 区块 A：模型路由与 Provider 配置
  - 选择分析/生成 Provider
  - 编辑各 Provider 的 Base URL / API Key / Generation Model / Analysis Model / Timeout / Concurrency / Extra Headers
  - 连通性测试
- 区块 B：提示词设置
  - 分析附加提示词
  - 生成前缀
  - 默认负面提示词
- 区块 C：运行选项
  - HEIC 实验开关
  - 本地回退开关

### 2.4 画布与布局
- 主页面网格改为左重右轻（画布优先）。
- 去除外层 `Container` 带来的边距。
- 画布容器添加 `aspect-ratio: 3 / 1`，并提高最小可视高度。
- 添加模糊发光层（高斯模糊视觉）。
- 预设比例列表将 `3:1` 作为默认首项，工作流默认比例同步为 `3:1`。

---

## 3. 验收标准

- [ ] 设置中可分别选择视觉分析 Provider 与图像生成 Provider。
- [ ] 可实际使用“OpenRouter 分析 + Ark 生成”链路发起任务。
- [ ] UI 不再出现密钥加解密相关控件与口令输入。
- [ ] 提示词设置可在设置窗口编辑并影响预处理与生成默认行为。
- [ ] 设置窗口标题已更新为新的语义标题。
- [ ] 页面外层边距显著缩减，画布区域可视面积增大。
- [ ] 默认比例为 `3:1`，画布呈现符合预期。
- [ ] 页面具备高斯模糊视觉效果。
- [ ] `npm run lint` 通过。
- [ ] `npm run build` 通过。

---

## 4. 变更影响说明

- 旧版“本地密钥加密”功能属于破坏性移除；若历史数据中存在加密密钥，需用户重新填入明文密钥。
- Provider 路由拆分后，分析与生成可独立优化，默认仍可保持同 Provider 以降低复杂度。
- 提示词设置前置后，Prompt 行为更加可解释、可复用，便于后续做模板化扩展。
