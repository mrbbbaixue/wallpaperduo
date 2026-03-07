# wallpaperduo

BYOK wallpaper workflow app:
- Upload one image and prepare target aspect ratio (`crop` / `pad`)
- Generate light/dark and dawn/day/dusk/night variants
- Align generated outputs (ORB + RANSAC + warp)
- Export WinDynamicDesktop `.ddw`
- Experimental HEIC export with fallback

## Development

```bash
npm install
npm run dev
```

## Ark (Volcengine) CORS note

Browser direct calls to Ark may be blocked by CORS.

For local development, this project configures Vite proxy:
- `"/api/ark"` -> `https://ark.cn-beijing.volces.com/api/v3`

So in local dev, set Ark `Base URL` to:
- `/api/ark`

If you still use direct URL in local dev (`https://ark.cn-beijing.volces.com/api/v3`), requests can fail with CORS preflight errors.

## Build

```bash
npm run lint
npm run build
```
