# WallpaperDuo V2 重构计划

更新时间：2026-03-19

## 当前进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 1: 项目初始化 | ✅ 完成 | Tailwind、shadcn/ui、CF Workers 配置 |
| Phase 2: 后端 Worker | ✅ 完成 | API 代理实现（test-connection、analyze、generate） |
| Phase 3: 前端基础 | ✅ 完成 | AppShell、状态管理迁移、Provider 配置组件 |
| Phase 4: 核心业务 | ✅ 完成 | 上传、基准图准备、分析、生成队列、ORB 对齐 已迁移 |
| Phase 5: 导出与完善 | 🔄 进行中 | ZIP/DDW、主题、构建与 lint 已完成，待本地联调与部署 |

### 已完成提交

```
751e7cc refactor: 迁移状态管理，简化 Provider 配置
c5569fc feat: 实现 Worker API Provider 适配器
983550f feat: 添加 shadcn/ui 基础组件
79714c1 chore: 配置 Tailwind CSS、shadcn/ui 和 Cloudflare Workers
d5fbe7b docs: 更新火山引擎 Provider 模板配置
7bb5ecb docs: 添加 V2 重构实施计划
c23dd09 docs: 添加 V2 重构设计文档
```

---

## 1. 目标概述

将 WallpaperDuo 从纯前端 SPA 重构为 Cloudflare Workers 全栈应用：

1. **解决 CORS 问题** - Worker 代理 AI API 请求，同源无跨域
2. **UI 现代化** - 从 MUI 迁移到 shadcn/ui（Radix + Tailwind）
3. **简化 Provider** - 模板预填 + 单一 Provider 模式 + 自定义支持
4. **代码精简** - 删除本地回退、HEIC 导出、ComfyUI 支持

## 2. 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + TypeScript + Vite |
| UI | shadcn/ui（Radix + Tailwind CSS） |
| 状态 | Zustand |
| 数据 | TanStack Query |
| 后端 | Hono（Cloudflare Workers） |
| 部署 | Cloudflare Workers（静态资产 + API） |
| 国际化 | i18next |

## 3. 项目结构

```
wallpaperduo/
├── src/                          # React 前端
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 组件 ✅
│   │   ├── canvas/               # 画布相关
│   │   ├── control/              # 控制面板
│   │   ├── layout/               # 布局组件 ✅
│   │   ├── results/              # 结果展示
│   │   └── settings/             # 设置组件 ✅
│   ├── lib/                      # 工具函数 ✅
│   ├── hooks/                    # 自定义 hooks ✅
│   ├── services/                 # 业务服务
│   ├── store/                    # Zustand stores ✅
│   ├── types/                    # TypeScript 类型 ✅
│   ├── styles/                   # 全局样式 ✅
│   ├── i18n/                     # 国际化
│   └── main.tsx                  # 入口 ✅
├── worker/                       # Cloudflare Worker ✅
│   ├── index.ts                  # Hono 应用入口 ✅
│   ├── providers.ts              # Provider 适配器 ✅
│   └── types.ts                  # Worker 类型 ✅
├── public/
├── wrangler.toml                 # CF Workers 配置 ✅
├── vite.config.ts
├── tailwind.config.ts            # ✅
├── postcss.config.js             # ✅
├── components.json               # shadcn/ui 配置 ✅
└── package.json
```

## 4. Provider 模板设计

### 模板定义

```typescript
interface ProviderTemplate {
  id: string;
  name: string;
  baseUrl: string;           // Chat/Analysis API
  generateUrl?: string;      // 图像生成 URL（阿里云专用）
  defaultModel: string;
  defaultVisionModel?: string;
}
```

### 预设模板

| 模板 | baseUrl | generateUrl | 视觉模型 | 生成模型 |
|------|---------|-------------|----------|----------|
| 火山引擎 Ark | `ark.cn-beijing.volces.com/api/v3` | `/api/v3/images/generations` | doubao-seed-2-0-lite | Doubao-Seedream-5.0-Lite |
| 阿里云百炼 | `dashscope.aliyuncs.com/compatible-mode/v1` | `multimodal-generation/generation` | qwen-vl-max | wanx2.1-t2i-turbo |
| OpenRouter | `openrouter.ai/api/v1` | - | gemini-2.0-flash | gemini-2.0-flash |
| 自定义 | 用户填写 | 用户填写 | 用户填写 | 用户填写 |

> **注意**：火山方舟需先在控制台部署模型，获得 `ep-` 开头的接入点ID作为实际模型ID。

### 配置界面

- 下拉选择模板 → 预填 URL 和模型
- 用户填写 API Key
- 可修改预填值
- 单一 Provider 模式（非切换）

## 5. API 设计

### POST /api/analyze
分析图像内容，返回场景信息。

**Request:**
```json
{
  "image": "data:image/png;base64,...",
  "provider": { "baseUrl": "...", "apiKey": "...", "model": "..." },
  "prompt": "可选用户提示"
}
```

### POST /api/generate
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

### POST /api/test-connection
测试 Provider 连接。

## 6. 功能清单

### 保留
- [x] 图片上传与预处理
- [x] 宽高比选择
- [x] AI 场景分析
- [x] 提示词计划生成
- [x] 多时段变体生成
- [x] ORB 图像对齐
- [x] WinDynamicDesktop 导出
- [x] ZIP 导出
- [x] 多语言支持
- [x] 深色/浅色主题

### 删除
- [x] 本地回退生成（类型已移除）
- [x] HEIC 导出（代码与入口已删除）
- [x] ComfyUI Provider（类型已移除）
- [x] 多 Provider 切换（已简化为单一模式）

### 新增
- [x] 自定义 Provider 配置
- [x] Provider 模板

## 7. 分阶段实施

### Phase 1: 项目初始化 ✅
- [x] 创建 v2 分支
- [x] 配置 Vite + React + TypeScript
- [x] 配置 Tailwind CSS
- [x] 安装配置 shadcn/ui
- [x] 配置 wrangler.toml
- [x] 创建 Hono Worker 骨架

### Phase 2: 后端 Worker ✅
- [x] 实现 /api/test-connection
- [x] 实现 /api/analyze
- [x] 实现 /api/generate
- [x] 错误处理与日志
- [ ] 本地开发测试

### Phase 3: 前端基础 ✅
- [x] AppShell 布局组件
- [x] shadcn/ui 基础组件导入
- [x] Provider 配置界面
- [x] Zustand store 迁移
- [x] i18n 配置

### Phase 4: 核心业务 ✅
- [x] 图片上传组件
- [x] Canvas 预处理
- [x] 场景分析流程
- [x] 提示词生成
- [x] 图像生成队列
- [x] ORB 对齐

### Phase 5: 导出与完善 🔄
- [x] ZIP 导出
- [x] DDW 导出
- [x] 主题切换
- [x] 测试与修复
- [ ] 部署上线

## 8. 部署配置

### wrangler.toml
```toml
name = "wallpaperduo"
compatibility_date = "2026-03-18"
main = "./dist/worker/index.js"

[assets]
directory = "./dist/client/"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*"]
```

### 部署命令
```bash
npm run build    # 构建前端 + Worker
npm run deploy   # 部署到 Cloudflare
```

## 9. 验收标准

1. 部署到 Cloudflare Workers，访问 `wallpaperduo.pages.dev`
2. 前端调用 `/api/*` 无 CORS 错误
3. Provider 模板选择 → 预填 → 填 Key → 测试连接成功
4. 完整工作流：上传 → 分析 → 生成 → 导出
5. ZIP 和 DDW 导出正常
6. 中英文切换正常
7. 深浅主题切换正常

## 10. 详细设计文档

参见 [`docs/superpowers/specs/2025-03-19-v2-refactor-design.md`](docs/superpowers/specs/2025-03-19-v2-refactor-design.md)
