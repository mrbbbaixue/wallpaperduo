# wallpaperduo 项目开发计划（可执行）

## 1. 目标与边界

### 1.1 核心目标

- 纯前端网页应用（可部署 GitHub Pages）。
- 全量采用 BYOK（Bring Your Own Key）：用户在网页端自行配置并本地保存 OpenRouter / Ark / ComfyUI 的凭据与地址。
- 用户上传一张壁纸后，调用 AI 生成深色/浅色版本，以及多时段（如晨/昼/昏/夜）版本。
- 生成前先做画面理解与提示词改写，支持用户追加元素描述与时段局部变化（例如白天太阳、夜晚月亮；时钟时间变化）。
- 解决比例与一致性问题：生成前支持画布比例、裁剪/填充；生成后做对齐以尽量保持元素位置一致。
- 导出 Windows WinDynamicDesktop 的 `.ddw`；HEIC 作为分阶段能力。

### 1.2 非目标（V1 不承诺）

- 不提供平台托管密钥模式（仅支持 BYOK，不内置项目私钥）。
- 不承诺 V1 即提供“生产级稳定”HEIC 编码（浏览器侧生态不稳定，先做实验能力）。

---

## 2. 调研结论（按你要求：Context7 + GitHub MCP + WebSearch MCP）

### 2.1 GitHub Pages 与 MUI 是否可用

- 可用。MUI 本质是 React 组件库，构建后是静态资源，可部署到 GitHub Pages。
- 关键点是 Vite 的 `base`：若部署到 `https://<user>.github.io/<repo>/`，`base` 需设置为 `/<repo>/`。
- 结论：`mui/material-ui` 在 GitHub Pages 没有架构阻塞。

### 2.2 OpenRouter / 火山方舟（豆包）/ ComfyUI 可接入性

- OpenRouter：支持 `POST /api/v1/chat/completions`，可用多模态请求（含图片输入）与图像生成输出。
- 火山方舟（官方 Python SDK 代码）显示：
  - Base URL 为 `https://ark.cn-beijing.volces.com/api/v3`
  - 支持 `chat.completions`（含视觉输入）与 `images.generate`。
- ComfyUI（自部署/本机）常见 API 流程：
  - `POST /prompt` 提交 workflow
  - `GET /history/{prompt_id}` 获取任务输出
  - `GET /view` 拉取生成图片
  - `GET /ws` 订阅任务状态（或轮询 history）
- 结论：三者都可纳入统一“Provider 适配层”；ComfyUI 需重点处理 CORS 与局域网可达性。

### 2.3 DDW 格式可落地

- 本地样本 `.ddw` 可直接按 zip 解包，包含：
  - 多张图片（如 `ES_House_1.png`...）
  - `theme.json`
- WinDynamicDesktop 源码验证逻辑显示：
  - 必填：`imageFilename`、`dayImageList`、`nightImageList`
  - 可选：`sunriseImageList`、`sunsetImageList`、`dayHighlight`、`nightHighlight`
- 结论：`.ddw` 导出可在前端通过 zip 生成实现。

### 2.4 HEIC 能力结论

- 已查到浏览器侧常用库 `heic2any` 侧重 HEIC/HEIF -> JPEG/PNG/GIF 转换，不是 HEIC 编码主路径。
- 存在 WASM 方案（如 `elheif`）提供编码接口，但生态成熟度和兼容性需单独验证。
- 结论：V1 先保证 DDW；HEIC 作为 V1.5 实验能力（WASM 或可选服务端转换）。

---

## 3. 技术栈选型

### 3.1 前端与工程化

- `React 18 + TypeScript + Vite`
- `MUI (@mui/material + @emotion/react + @emotion/styled)`
- 路由：`react-router-dom`（GitHub Pages 推荐 `HashRouter`，避免深链 404）
- 状态管理：`zustand`
- 异步与任务状态：`@tanstack/react-query`（可选，建议）
- 国际化：`i18next + react-i18next + i18next-browser-languagedetector + i18next-http-backend`
- 数据校验：`zod`

### 3.2 图像与导出

- 画布编辑：原生 `<canvas>`（必要时配 `react-easy-crop`）
- 图像处理：`pica`（高质量缩放）+ `opencv.js`（生成后对齐）
- 打包导出：`JSZip` + 浏览器下载（`FileSaver` 或原生 blob 下载）
- HEIC（实验）：`elheif`（WASM 编码）作为可开关模块

### 3.3 AI Provider 适配层

- 统一接口（建议）：
  - `analyzeImage(input): SceneAnalysis`
  - `generateVariants(input, promptPlan, options): Variant[]`
- Provider 实现：
  - `openrouterProvider`
  - `arkProvider`（火山方舟/豆包）
  - `comfyuiProvider`（Workflow API）
- 统一 BYOK 配置模型：
  - `baseUrl`、`apiKey`（按 Provider 可选）、`model`、`extraHeaders`、`timeout`、`concurrency`
  - ComfyUI 扩展项：`workflowTemplate`、`nodeMapping`

### 3.4 部署

- GitHub Pages + GitHub Actions（构建并发布 `dist`）
- Vite `base` 根据仓库名配置。

---

## 4. 功能模块拆分

### 模块 A：上传与画布准备

- 文件上传、预览、分辨率读取。
- 目标画布比例（16:9、16:10、21:9、32:9、自定义）。
- 比例不匹配时两种模式：
  - `Crop`：裁切
  - `Pad`：填充（颜色/模糊延展）
- 输出统一“生成基准图”。

### 模块 B：画面理解与提示词编排

- 先调用视觉模型获取场景结构（主体、前景、背景、光照、关键物体）。
- Prompt Planner 生成：
  - 深色/浅色改写 prompt
  - 多时段 prompt（晨/昼/昏/夜）
  - 用户自定义局部变化（时钟、太阳/月亮等）注入
- 输出结构化提示词 JSON，便于复现与调试。

### 模块 C：生成调度

- 选择 Provider（OpenRouter / Ark / ComfyUI）和模型。
- 并发/串行策略、重试、超时、取消任务。
- 统一结果结构（URL 或 base64 统一转 Blob）。
- ComfyUI 特有编排：将 Prompt Planner 输出映射到 workflow 节点并提交队列。

### 模块 D：一致性对齐

- 预对齐：强制相同尺寸与构图参数。
- 后对齐（OpenCV.js）：
  - 特征点匹配（ORB）+ RANSAC 估计仿射/透视变换
  - 对生成结果做 `warp` 到基准图坐标系
- 质量门槛：
  - 关键区域误差超限时标记“需手动调整”。

### 模块 E：导出

- `DDW 导出`
  - 生成 `theme.json`
  - 打包图片与 json 为 zip，再保存为 `.ddw`
- `HEIC 导出`
  - V1.5 提供实验开关；失败时回退为 PNG/JPEG 并提示。

### 模块 F：多语言与 UI

- 中英文文案资源分离（`locales/zh`、`locales/en`）。
- MUI 主题（亮/暗）与品牌色。
- 关键页面：
  - 工作台（上传/比例/裁剪填充）
  - Prompt 编辑器（全局 + 分时段 + 局部变化）
  - 生成结果对比与对齐面板
  - 导出向导（DDW/HEIC）

### 模块 G：设置与安全

- BYOK 本地存储（用户自带，`localStorage` + 可选口令加密）。
- Provider 配置、模型配置、并发配置、ComfyUI 工作流模板配置。
- 明确安全提示：仅使用用户个人 key / 自建 ComfyUI，不内置项目私钥。
- 增加连接性检测：OpenRouter/Ark 鉴权测试、ComfyUI API 连通性与 CORS 检测。

---

## 5. 可执行项目清单（按阶段）

## Phase 0 - 初始化（0.5 天）

- [x] 初始化 `React + TS + Vite` 项目
- [x] 安装 MUI、i18n、zustand、jszip、opencv.js、pica
- [x] 配置 ESLint/Prettier/tsconfig 路径别名
- [x] 配置 GitHub Pages Actions 与 `vite.config.ts` 的 `base`

## Phase 1 - 核心流程最小闭环（2-3 天）

- [x] 上传图片 + 比例选择 + 裁剪/填充
- [x] Provider 配置页（OpenRouter / Ark / ComfyUI，BYOK 手工录入）
- [x] 提供 Provider 连通性测试（含 ComfyUI 基础 API）
- [x] 单次“深色版”生成（不含多时段）
- [x] 结果预览与下载 PNG

## Phase 2 - Prompt 智能化与多时段（3-4 天）

- [x] 视觉分析 -> SceneAnalysis
- [x] Prompt Planner（深/浅 + 晨/昼/昏/夜）
- [x] 用户局部变化描述注入
- [x] ComfyUI workflow 变量映射（正/负提示词、seed、分辨率、时段变量）
- [x] 批量生成任务队列与进度 UI

## Phase 3 - 一致性对齐（2-3 天）

- [x] 对齐引擎（ORB + RANSAC + warp）
- [x] 对齐前后对比视图
- [x] 失败场景提示与手动微调（基础版）

## Phase 4 - 导出（2 天）

- [x] DDW 生成器（`theme.json` + images + zip->`.ddw`）
- [x] 导出向导（时段分组映射配置）
- [x] WinDynamicDesktop 兼容性自测（导入样例）

## Phase 5 - 国际化与完善（1-2 天）

- [x] 中英文文案覆盖
- [x] 关键错误处理（CORS、超时、配额、鉴权）
- [x] 性能优化（图片缓存、并发限流）

## Phase 6 - HEIC 实验能力（可选，2-4 天）

- [x] 接入 `elheif` 实验编码
- [x] 浏览器兼容性矩阵与失败回退策略
- [x] 若稳定性不足，默认关闭并保留实验开关

---

## 6. 关键实现设计

### 6.1 Provider 抽象（建议接口）

```ts
export interface ImageProvider {
  name: "openrouter" | "ark" | "comfyui";
  analyzeImage(input: AnalyzeInput): Promise<SceneAnalysis>;
  generateVariants(input: GenerateInput): Promise<GeneratedVariant[]>;
}
```

### 6.2 DDW 生成规则

- 文件结构（zip 根目录）：
  - `theme.json`
  - `xxx_1.png`, `xxx_2.png`, ...
- `theme.json` 最低结构（可运行）：

```json
{
  "imageFilename": "wallpaper_*.png",
  "dayImageList": [2],
  "sunsetImageList": [1],
  "nightImageList": [3, 4]
}
```

### 6.3 GitHub Pages 路由建议

- 若使用 BrowserRouter，需额外处理刷新 404。
- 建议 V1 用 `HashRouter`，降低部署复杂度。

### 6.4 ComfyUI 适配建议（BYOK）

- 用户输入 `baseUrl`（例：`http://127.0.0.1:8188`）与可选鉴权信息。
- 前端保存 workflow 模板（JSON）与节点映射（如 `positivePromptNodeId`、`seedNodeId`、`widthNodeId`、`heightNodeId`）。
- 执行流程：
  - 根据时段与主题注入提示词变量到 workflow
  - `POST /prompt` 提交任务并获取 `prompt_id`
  - 通过 `/ws` 订阅进度或轮询 `/history/{prompt_id}`
  - 从 `/view` 拉取图片并转为 Blob
- 若浏览器直连受限（CORS/跨网段），在设置页给出反向代理建议与检测报告。

---

## 7. 验收标准（Definition of Done）

- 可在 GitHub Pages 打开应用并完成端到端流程。
- 全流程采用 BYOK；不开放内置平台密钥模式。
- 支持 OpenRouter、Ark、ComfyUI 至少各 1 条可用生成链路。
- 支持深/浅 + 多时段批量生成，且可编辑局部变化提示词。
- 生成结果可执行对齐，主元素相对位置可视一致。
- 可导出可被 WinDynamicDesktop 导入的 `.ddw`。
- 中英文切换完整，页面关键功能文案无遗漏。

---

## 8. 风险与应对

- API 密钥暴露风险：仅支持 BYOK；默认不上传开发方服务器，建议使用低权限/限额 key。
- CORS/限流：Provider 层统一重试与错误码映射。
- ComfyUI 可达性风险：增加 API 连通测试、CORS 检测与代理配置指引。
- 一致性不稳定：使用固定 seed + 低随机度 + 对齐后处理。
- HEIC 编码不稳定：作为实验能力，默认关闭，失败回退 PNG/JPEG。
- WebSearch 返回结果存在聚合站噪声：已优先官方站点，后续新增功能时继续做来源复核。

---

## 9. 参考来源

- Vite 静态部署与 GitHub Pages `base` 配置  
  https://github.com/vitejs/vite/blob/main/docs/guide/static-deploy.md  
  https://github.com/vitejs/vite/blob/main/docs/guide/build.md

- MUI 安装与 Vite 示例  
  https://github.com/mui/material-ui/blob/master/docs/data/material/getting-started/installation/installation.md  
  https://github.com/mui/material-ui/tree/master/examples/material-ui-vite

- react-i18next 初始化用法  
  https://github.com/i18next/react-i18next

- OpenRouter 多模态与图像生成（chat/completions）  
  https://openrouter.ai/docs/guides/overview/multimodal/image-generation  
  https://openrouter.ai/docs/guides/overview/multimodal/images

- 火山方舟（豆包）官方 SDK（Ark Runtime）  
  https://github.com/volcengine/volcengine-python-sdk  
  https://github.com/volcengine/volcengine-python-sdk/blob/master/volcenginesdkarkruntime/_constants.py  
  https://github.com/volcengine/volcengine-python-sdk/blob/master/volcenginesdkexamples/volcenginesdkarkruntime/image_generations.py

- ComfyUI API 与示例  
  https://github.com/comfyanonymous/ComfyUI  
  https://github.com/comfyanonymous/ComfyUI/blob/master/script_examples/basic_api_example.py  
  https://github.com/comfyanonymous/ComfyUI/blob/master/script_examples/websockets_api_example.py

- WinDynamicDesktop 与 DDW 结构依据  
  https://github.com/t1m0thyj/WinDynamicDesktop  
  https://github.com/t1m0thyj/WinDynamicDesktop/blob/main/src/ThemeLoader.cs  
  https://github.com/t1m0thyj/WinDynamicDesktop/blob/main/src/ThemeJsonValidator.cs

- HEIC 浏览器侧可行性参考  
  https://github.com/alexcorvi/heic2any  
  https://github.com/hpp2334/elheif

- WebSearch 补充官方页面  
  https://github.com/t1m0thyj/WinDynamicDesktop/wiki/Creating-custom-themes  
  https://www.volcengine.com/docs/82379/1298454  
  https://www.volcengine.com/docs/82379/1666945?lang=zh  
  https://vitejs.cn/vite5-cn/guide/static-deploy.html

---

## 10. 执行状态（2026-03-07）

- [x] Phase 0 完成
- [x] Phase 1 完成
- [x] Phase 2 完成
- [x] Phase 3 完成
- [x] Phase 4 完成
- [x] Phase 5 完成
- [x] Phase 6 完成
