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

Use Node.js 22 LTS when possible (minimum `20.19.0`) with npm 10+.

### 2. Quality checks and production build

```bash
npm run check
npm run build
```

### 3. Local preview

```bash
npm run preview
```

`npm run preview` serves the built Vite assets only.

To validate the Worker and `/api/*` routes together, use:

```bash
npm run preview:worker
```

### 4. Cloudflare Workers deployment

```bash
npm run deploy
```

This project expects same-origin deployment for the static app and `/api/*` Worker routes, and Cloudflare Workers is the maintained deployment target.
