# WallpaperDuo V2 重构设计文档

## 概述

将 WallpaperDuo 从纯前端 SPA 重构为 Cloudflare Workers 全栈应用，彻底解决 CORS 问题，并迁移 UI 到 shadcn/ui 实现极简风格。

## 目标

1. **解决 CORS 问题**：通过 Cloudflare Workers 代理 AI API 请求
2. **UI 现代化**：从 MUI 迁移到 shadcn/ui（Radix + Tailwind）
3. **简化 Provider 配置**：模板预填 + 单一 Provider 模式
4. **代码精简**：删除本地回退生成、HEIC 导出

## 技术栈

| 层 | 技术 |
|---|------|
| 前端框架 | React 19 + TypeScript |
| UI 组件 | shadcn/ui（Radix + Tailwind CSS） |
| 状态管理 | Zustand |
| 数据获取 | TanStack Query |
| 构建工具 | Vite |
| 后端框架 | Hono（运行于 Cloudflare Workers） |
| 部署平台 | Cloudflare Workers（静态资产 + API） |
| 国际化 | i18next |

## 架构设计

### 项目结构

```
wallpaperduo/
├── src/                          # React 前端
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 组件
│   │   ├── canvas/               # 画布相关
│   │   ├── control/              # 控制面板
│   │   ├── layout/               # 布局组件
│   │   └── results/              # 结果展示
│   ├── lib/                      # 工具函数
│   ├── hooks/                    # 自定义 hooks
│   ├── services/                 # 业务服务
│   ├── store/                    # Zustand stores
│   ├── types/                    # TypeScript 类型
│   ├── i18n/                     # 国际化
│   └── main.tsx
├── worker/                       # Cloudflare Worker
│   ├── index.ts                  # Hono 应用入口
│   └── routes/
│       ├── analyze.ts            # 图像分析代理
│       └── generate.ts           # 图像生成代理
├── public/
├── wrangler.toml                 # CF Workers 配置
├── vite.config.ts
├── tailwind.config.ts
├── components.json               # shadcn/ui 配置
└── package.json
```

### 数据流

```
[用户上传图片]
       ↓
[前端预处理] → Canvas 缩放/裁剪
       ↓
[Worker API /api/analyze] → 代理请求 AI Provider
       ↓
[场景分析结果] → 前端生成提示词计划
       ↓
[Worker API /api/generate] → 代理请求图像生成
       ↓
[生成结果] → 前端展示 + 导出
```

### API 设计

#### POST /api/analyze
分析图像内容，返回结构化场景信息。

**Request:**
```json
{
  "image": "data:image/png;base64,...",
  "provider": { "baseUrl": "...", "apiKey": "...", "model": "..." },
  "prompt": "可选用户提示"
}
```

**Response:**
```json
{
  "summary": "...",
  "subjects": ["..."],
  "foreground": ["..."],
  "background": ["..."],
  "lighting": "...",
  "palette": ["#..."],
  "risks": ["..."]
}
```

#### POST /api/generate
生成图像变体。

**Request:**
```json
{
  "image": "data:image/png;base64,...",
  "prompt": "...",
  "negativePrompt": "...",
  "width": 1920,
  "height": 1080,
  "provider": { "baseUrl": "...", "apiKey": "...", "model": "..." }
}
```

**Response:**
```json
{
  "imageUrl": "https://..." // 或 base64
}
```

#### POST /api/test-connection
测试 Provider 连接。

## 功能清单

### 保留功能
- [x] 图片上传与预处理（裁剪/填充）
- [x] 宽高比选择
- [x] AI 场景分析
- [x] 提示词计划生成
- [x] 多时段变体生成（晨/昼/昏/夜 × 深色/浅色）
- [x] ORB 图像对齐
- [x] WinDynamicDesktop 导出
- [x] ZIP 导出（新增）
- [x] 多语言支持（中/英）
- [x] 深色/浅色主题

### 删除功能
- [ ] 本地回退生成
- [ ] HEIC 导出
- [ ] ComfyUI Provider
- [ ] 多 Provider 切换

### 新增功能
- [x] 自定义 Provider 配置
- [x] Provider 模板（Ark/Aliyun/OpenRouter/自定义）

## Provider 模板设计

```typescript
interface ProviderTemplate {
  id: string;
  name: string;
  baseUrl: string;           // Chat/Analysis API 基础 URL
  generateUrl?: string;      // 图像生成 URL（可选，阿里云需要）
  defaultModel: string;
  defaultVisionModel?: string;
}

const TEMPLATES: ProviderTemplate[] = [
  {
    id: 'ark',
    name: '火山引擎 Ark',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    generateUrl: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    // 注意：实际使用需先部署模型，获得 ep- 开头的接入点ID
    defaultModel: 'Doubao-Seedream-5.0-Lite',
    defaultVisionModel: 'doubao-seed-2-0-lite'
  },
  {
    id: 'aliyun',
    name: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    generateUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    defaultModel: 'wanx2.1-t2i-turbo',
    defaultVisionModel: 'qwen-vl-max'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    defaultVisionModel: 'google/gemini-2.0-flash-exp:free'
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    defaultModel: ''
  }
];
```

## UI 组件规划

### shadcn/ui 组件使用

| 组件 | 用途 |
|------|------|
| Button | 操作按钮 |
| Card | 面板容器 |
| Select | Provider 模板选择、宽高比选择 |
| Input | API Key、模型名输入 |
| Dialog | 设置弹窗 |
| Tabs | 时段选择 |
| Progress | 生成进度 |
| Toast | 操作反馈 |
| Skeleton | 加载状态 |
| Switch | 主题切换 |

### 自定义组件

| 组件 | 功能 |
|------|------|
| CanvasWorkspace | 主画布展示 |
| ImageUploader | 拖拽上传 |
| ControlPanel | 控制面板容器 |
| TaskQueue | 生成任务队列 |
| ResultsStrip | 结果缩略图带 |

## 开发计划

### Phase 1: 项目初始化
- 创建 v2 分支
- 配置 Vite + React + TypeScript
- 配置 Tailwind CSS + shadcn/ui
- 配置 wrangler.toml + Hono Worker

### Phase 2: 后端 Worker
- 实现 API 代理路由
- Provider 请求适配器
- 错误处理与日志

### Phase 3: 前端核心
- 基础布局组件
- Provider 配置界面
- 图片上传与预处理

### Phase 4: 业务流程
- 场景分析流程
- 提示词生成
- 图像生成队列
- ORB 对齐

### Phase 5: 导出与完善
- ZIP 导出
- DDW 导出
- 多语言
- 主题切换
- 测试与修复

## 部署配置

### wrangler.toml
```toml
name = "wallpaperduo"
compatibility_date = "2025-04-01"
main = "./dist/worker/index.js"

[assets]
directory = "./dist/client/"
run_worker_first = true
```

### 部署命令
```bash
pnpm build          # 构建前端 + Worker
pnpm deploy         # 部署到 Cloudflare
```

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| shadcn/ui 学习曲线 | 先迁移简单组件，逐步推进 |
| Worker 冷启动延迟 | 使用全局变量缓存，最小化初始化 |
| API Key 安全 | 仅存储在客户端 localStorage，Worker 不持久化 |