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

### 2. 生产构建与本地预览

```bash
npm run build
npm run preview
```

### 3. GitHub Pages 自动部署

仓库已包含 [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) 工作流：  
推送到 `main` 后会自动构建并发布 `dist` 到 GitHub Pages。

需要在仓库设置中确认：

1. 打开 `Settings -> Pages`
2. `Source` 选择 `GitHub Actions`

> 说明：根据 Vite 部署规范，项目在 GitHub Actions 中会使用仓库名作为 `base` 路径（如 `/<repo>/`），当前 `vite.config.ts` 已处理。
