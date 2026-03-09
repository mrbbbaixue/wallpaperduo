# WallpaperDuo

[中文 README](./README.md)

## Overview

WallpaperDuo is a BYOK (bring your own model/API) wallpaper workflow tool.  
Starting from one source image, it helps you generate light/dark and time-of-day variants, then export a WinDynamicDesktop theme package.

## Features (Placeholder)

> This section is reserved for future updates: feature details, UI screenshots, common workflows, and usage examples.

## Deployment

### 1. Local development

```bash
npm install
npm run dev
```

### 2. Production build and local preview

```bash
npm run build
npm run preview
```

### 3. GitHub Pages auto deployment

This repo already includes [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).  
When you push to `main`, it will build and publish `dist` to GitHub Pages automatically.

Make sure your repository settings are:

1. Open `Settings -> Pages`
2. Set `Source` to `GitHub Actions`

> Note: Following Vite deployment guidance, the project uses repo-based `base` path in GitHub Actions (such as `/<repo>/`). The current `vite.config.ts` already handles this.
