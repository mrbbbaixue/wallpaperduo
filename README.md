# WallpaperDuo

[English README](./README.en.md)

## 简介

WallpaperDuo 是一个 BYOK（自带模型/API）的壁纸工作流工具。  
你可以从一张原图出发，生成明暗与时段变体，并导出 WinDynamicDesktop 主题包。

## 功能介绍（预留）

> 本章节预留，后续可补充：核心功能说明、界面截图、典型工作流与使用示例。

## 部署方式

### 1. 本地开发

```bash
npm install
npm run dev
```

推荐使用 Node.js 22 LTS（最低 `20.19.0`）和 npm 10+。

### 2. 质量检查与生产构建

```bash
npm run check
npm run build
```

### 3. 本地预览

```bash
npm run preview
```

`npm run preview` 用于预览 Vite 产物。

如果你要连同 `/api/*` Worker 一起验证，请使用：

```bash
npm run preview:worker
```

### 4. Cloudflare Workers 部署

```bash
npm run deploy
```

当前项目的前端静态资源与 `/api/*` Worker 路由采用同源部署，默认目标是 Cloudflare Workers，不再维护 GitHub Pages 部署路径。
