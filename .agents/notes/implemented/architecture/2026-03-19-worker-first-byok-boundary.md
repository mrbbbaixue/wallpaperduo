# Agent Note: 前端只经由同源 Worker 出网（BYOK 边界）

Status: implemented

## Problem

供应方（火山 Ark、阿里云百炼、OpenRouter）的图像 CDN 不下发 CORS 头，浏览器直连会在生产环境失败；若把出网留在浏览器，API Key 就长期躺在 localStorage，且没有任何服务端收敛点。同时 GitHub Pages 这类纯静态托管承载不了 `/api/*`，整个「检测连接 / 识图 / 生图」链路无处落脚。

不做这件事的后果：CORS 只能靠 dev 代理掩盖，生产不可解；密钥的读取面等于「任意脚本都能读到 localStorage」；每次换供应方都要在前端再加一套直连代码。

## Decision

浏览器出网面收敛到一个文件、四条同源路由，密钥只作为 POST body 的一部分经过用户自己部署的 Worker。

**Wire 契约**（`src/services/api/workerClient.ts` 是唯一调用点，全部相对路径 + `Content-Type: application/json`，不带 Authorization 头）：

| 路由 | 方法 | body 字段 |
|---|---|---|
| `/api/health` | GET | — |
| `/api/test-connection` | POST | `{ provider: { baseUrl, apiKey, model } }` |
| `/api/analyze` | POST | `{ image, provider, prompt? }` |
| `/api/generate` | POST | `{ image, prompt, negativePrompt?, width, height, provider }` |

- `image` 是 data URL（`FileReader.readAsDataURL`，`src/services/providers/http.ts` 的 `toDataUrl`）。
- `/api/generate` 返回**二进制图片**而非 JSON：data-url 分支 base64 解码后带 `Content-Type`，url 分支转发上游 body，两者都 `Cache-Control: no-store`（`worker/index.ts`）。
- Worker 侧才加鉴权头：`Authorization: Bearer ${config.apiKey}` 只出现在出网方向（`worker/providers.ts`）。
- Worker **不持久化**：`wrangler.toml` 无 KV/D1/R2 绑定；密钥只存在于用户浏览器。
- 明文持久化是既定事实：zustand persist 键 `wallpaperduo.settings.v2`，`version: 3`，`partialize` 白名单含 `provider`（`apiKey` 明文，`ProviderConfig.tsx` 的 `type="password"` 只影响显示）。
- `src/utils/crypto.ts`（`CryptoJS.AES` + `enc::` 前缀）已无任何调用方，是口令时代的化石。
- 脱敏不变量：日志里 `apiKey` 不可能出现——`maskSecret` / `redactHeaders` / `safeJson` 遮蔽 `authorization`、`api-key`、`apikey`、`api_key`（`src/utils/debugLog.ts`）；`workerClient.ts` 自带私有 `fetchJson` 且不打印请求体。
- 供应方差异吃掉在服务端：`worker/providers.ts` 三分支（OpenRouter `chat/completions` + `modalities` / 无 `generateUrl` 的 OpenAI 兼容 / 有 `generateUrl` 的 DashScope-Ark 原生），前端只认 `ProviderConfig` 一个形状。`ensureProviderReady` 对空 baseUrl、空 apiKey（抛 `PASSCODE_INVALID`）、空 model 一律 fail-fast。

**部署形态**（同源，`wrangler.toml`）：`main = "./worker/index.ts"`，`[assets] directory = "./dist/client/"` + `binding = "ASSETS"` + `not_found_handling = "single-page-application"` + `run_worker_first = ["/api/*"]`。SPA 兜底由 assets 层完成，`worker/index.ts` 没有 catch-all 路由；因此路由可以是 `BrowserRouter`（`HashRouter` 是 Pages 时代的深链防 404 方案）。`preview`（vite preview）验证不了 `/api/*`，全栈预览必须用 `preview:worker`（wrangler dev）。

## Alternatives considered

- **浏览器直连 + dev-only 代理** — 曾经就这么做：`vite.config.ts` 内联 `/api/image-proxy`（校验 `https?://` 后转发并补 `access-control-allow-origin`）、`server.proxy["/api/ark"]`，store 按 `hostname === "localhost"` 决定 ark 的 baseUrl，`downloadProviderImage` 还带 `preferLocalProxy` 回落。优点是不需要任何服务端、本地调试零配置；但代理只活在 dev，生产照样撞 CORS，密钥依旧在浏览器里——所以 `d214a00` 整体删除。
- **多供应方各自独立配置（`ProviderConfigRecord`）** — openrouter/ark/comfyui 各存一套 baseUrl/apiKey/model/timeoutMs/extraHeaders，还出现过 `analysisProvider` / `generationProvider` 双路由。好处是灵活；代价是每个新供应方都要往前端和 store 里加一套字段，`751e7cc` 把它收成「模板 + 单 Provider」。ComfyUI 作为本地 Provider（含 workflow 模板与节点映射）也在同一次收拢中被移除——它撑不起「同一份密钥只经手一次转发」的模型。
- **口令加密 Key（`keysEncrypted` + `encryptAllKeys/decryptAllKeys/resolveApiKey`）** — 直觉上比明文强。但它把「不落地」变成了「口令不落地」：用户每次会话要输口令，口令丢了密钥不可恢复，且 UI 上「安全加密」的措辞与实际强度不匹配。`d214a00` 删除该流程，并用 `sanitizeLegacyApiKey`（`enc::` 前缀一律清空）做破坏性迁移——接受「历史用户必须重填明文密钥」。
- **继续用 GitHub Pages 静态托管** — 无需 Worker、成本为零；但 Pages 承载不了 `/api/*`，`55d49d2` 删掉 `deploy-pages` workflow，`7bba244` 删掉 `build:gh` 与 `GITHUB_ACTIONS` 的 base 路径逻辑，README 明确写「不再维护 GitHub Pages 部署路径」。

## Consequences

- **收益**：跨域从「生产不可解」降级为「dev 可选」；密钥只经手用户自己的 Worker，且日志/URL/错误文本三条通道都有机械脱敏；新增供应方不需要动前端。
- **代价与已知上限**：
  - **无鉴权**：`/api/*` 对公网开放且 `cors({ origin: "*" })`，任何人可以把它当免费转发端点用。这是 BYOK 的有意取舍，但只要打算给别人用就必须先加鉴权/限流。
  - 密钥明文停留在 localStorage，XSS 或恶意扩展可读；`crypto.ts` 留着会让读者误以为还有一层 AES。
  - `worker/types.ts` 与 `src/types/provider.ts` 是**手工同步**的两份 `ProviderConfig`（worker 侧 `templateId` 可选、无 `name`），改字段不会编译报错；`/api/test-connection` 的路由层类型只声明 `{baseUrl, apiKey, model}`，前端发的是全量 provider。
  - `worker/index.ts` 的 `catch` 只回 `String(error)`，Worker 几乎不打印请求上下文——换来的是「Worker 出错时几乎没有诊断信息」。
  - `src/services/providers/http.ts` 里 `fetchJson`/`fetchBlob`/`downloadProviderImage`/`parseExtraHeaders`/`decodeBase64Image` 已无调用者（只有 `toDataUrl` 在用），容易让人误判「前端仍会直连供应方」。
- **重访信号**：把 Worker 暴露给非本人使用（多用户/公开 demo）→ 必须加鉴权与限流；要托管平台代付的 Key 或在服务端做任务持久化 → 与「无绑定、不持久化」冲突；日志里出现 `Bearer`/`sk-` 形态字符串 → 脱敏路径被绕过；新供应方不满足现有三种 wire 之一 → 应改为显式能力声明而不是继续加 `if`；恢复纯静态托管需求 → `preview:worker`、`run_worker_first`、`BrowserRouter`、assets fallback 四件事同时失效。

## Verification

- 前端只有两处 `fetch(`：`grep -rn "fetch(" src/` 命中 `src/services/api/workerClient.ts` 两行（`fetchJson` 内与生成图片请求）。
- 密钥不进日志/URL：`grep -rn "redactHeaders\|safeJson\|maskSecret" src/` 定义在 `src/utils/debugLog.ts`，使用点在 `http.ts`；四条 `/api/*` 全是 POST + body，无 query string。
- 持久化事实：`grep -n "wallpaperduo.settings" src/store/useSettingsStore.ts` → `.v2` 键名 + `version: 3`。
- 同源部署：`wrangler.toml` 的 `[assets]` 四行与 `worker/index.ts` 的四条路由；`preview:worker` 存在于 `package.json` scripts。
