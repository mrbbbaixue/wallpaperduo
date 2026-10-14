# Agent Note: 本地/局域网 ComfyUI 走前端直连通道

Status: proposed

## Problem

当前出网面只有一条通道：浏览器 → 同源 Worker（`worker/index.ts` 四条路由，`worker/providers.ts` 三种 wire：OpenRouter `chat/completions`、OpenAI 兼容、DashScope-Ark 原生），前端唯一调用点是 `src/services/api/workerClient.ts`。用户要接的是**自己机器或局域网内**的 ComfyUI，而 Worker 跑在 Cloudflare 边缘——物理上不存在任何路径能到达 `127.0.0.1` 或 `192.168.x.x`。所以「给 `/api/generate` 加第四个分支」在语义上就不成立。

浏览器直连则要同时越过三道闸，且它们的判据与版本绑定：

- **LNA 权限**（Chrome 142，2025-10-28 稳定版起）：从公网页面（我们的 `*.workers.dev`）访问本地/回环地址要先拿到权限提示；权限按 origin 记录、只授予安全上下文；2025-12 起拆成 `local-network` 与 `loopback-network` 两个权限。
- **混合内容**：https 页面 fetch `http://192.168.1.50:8188` 只有在权限已授予时才被豁免；豁免判据是「私网 IP 字面量」或 `.local`，用别的域名要 fetch 带 `targetAddressSpace: "local"`。
- **ComfyUI 自身的 CSRF 中间件**：不带 `--enable-cors-header` 启动时挂的是 `create_origin_only_middleware`，对 `Sec-Fetch-Site: cross-site` 直接 403，源码注释写明是「防止随机网站往 127.0.0.1 排队工作流」。也就是说跨源网页直连**必须**显式开 CORS。

再叠加一层契约不匹配：现有 `/api/generate` 是「一次 POST（参考图 data URL + prompt + 宽高）→ 二进制图片」，客户端硬编码 120s 超时（`workerClient.ts` 的 `API_TIMEOUT_MS`，`src/utils/error.ts` 的 `withTimeout`）。ComfyUI 是「上传参考图 → 提交 workflow 图 → 排队 → 可能几分钟 → 再取图」，且 `generationQueue.ts` 已经承诺了中途取消（`AbortSignal` + 任务态）。不解决这一层，直连也跑不通。

失败条件写清楚：如果只加 Provider 模板而不改 transport 与轮询，结果是生产环境里请求超时或静默失败，而 Worker 的错误文本只有 `String(error)`，用户侧看不到任何诊断信息。

## Proposal

新增第四种 Provider `comfyui`，通道为**浏览器直连**（不进 Worker），并在前端补一条真正的「提交 + 轮询 + 取消」生成路径。

### 通道边界

| 目标 | 通道 | 原因 |
|---|---|---|
| openrouter / ark / aliyun / custom | 同源 `/api/*` → Worker | 原理由不变：供应方 CDN 无 CORS、密钥收敛 |
| comfyui（本机/局域网） | 前端直连用户填的 `baseUrl` | Worker 在边缘够不到 LAN；本地 ComfyUI 默认无密钥，不需要收敛 |

必须硬约束：**ComfyUI 分支一律不经 Worker**。不得为了「统一」把局域网地址塞进 Worker 的 `ProviderConfig`——那只会得到超时/502，且掩盖真实原因。

### ComfyUI 侧 wire（实现契约）

1. **上传参考图** `POST /upload/image`（multipart，字段 `image`）→ `{name, subfolder, type}`，把 `name` 写进 workflow 的 `LoadImage` 节点。
2. **提交** `POST /prompt`，body `{prompt: <API 格式 workflow 图>, client_id, prompt_id?}`。**客户端自己生成 `prompt_id`**（必须是小写连字符 UUID，服务端 `validate_job_id` 会校验，不合法直接 400），这样前端任务 id 与 ComfyUI 的 job id 一一对应，省掉映射表。
3. **状态与进度**：主路径 `GET /api/jobs/{prompt_id}`（状态 `pending | in_progress | completed | failed | cancelled`）；老版本 ComfyUI 没有该接口时回落 `GET /history/{prompt_id}` + `GET /queue`。真实百分比走 `ws://<host>/ws?clientId=` 的 progress 消息，**只作为增强**：拿不到就退化成「排队位置 + 已完成节点数」的粗进度。
4. **取图** `GET /view?filename=&subfolder=&type=output` → Blob。
5. **取消** `POST /api/jobs/{prompt_id}/cancel`（幂等：已完成或不存在的 id 返回 200 + `{"cancelled": false}`）；回落 `POST /interrupt` + `POST /queue {"delete":[prompt_id]}`。
6. **连通性测试**（复用 `ProviderSettingsPanel` 的测试按钮）：`GET /system_stats` 确认可达，再用 `/object_info` 校验模板用到的节点类是否都在。

ComfyUI 侧相关实现均在 `server.py`：中间件装配（`if args.enable_cors_header → create_cors_middleware else create_origin_only_middleware`）、`/upload/image`、`/prompt`、`/history/{prompt_id}`、`/view`、`/ws`、`/api/jobs*`；启动参数在 `comfy/cli_args.py`。

### 用户侧前置条件（必须出现在 UI 文案里）

- ComfyUI 启动加 `--enable-cors-header "<部署域精确 origin>"`；局域网访问再加 `--listen`。**不要用不带参数的 `--enable-cors-header`（等于 `*`）**，那会放行任意网页往用户机器排队工作流。
- 首次连接会弹 LNA 权限提示。用 `navigator.permissions.query({name: "local-network"})` 与 `{name: "loopback-network"}` 预检并给引导；被拒时指路到站点权限设置，而不是笼统报「连接失败」。
- `baseUrl` 用私网 IP 字面量（`http://192.168.1.50:8188`）或 `http://127.0.0.1:8188`。用自定义域名时需 `.local`，否则 fetch 要带 `targetAddressSpace: "local"`。
- 上传体积受 `--max-upload-size` 限制（默认 100MB）；`prepared.blob` 是预处理后的 PNG，量级可控。

### workflow 模板与节点映射

沿用 `d214a00` 那套形状：`workflowTemplate`（API 格式 JSON 字符串）+ `nodeMapping`（正/负提示词节点、seed、宽高、denoise、`LoadImage` 节点 id），对应 `src/types/provider.ts` 里被 `751e7cc` 删掉的 `ComfyProviderConfig` / `ComfyNodeMapping`。

但**默认模板必须换成 img2img**：`LoadImage → VAEEncode → KSampler(denoise < 1)`。因为产品语义是「拿一张参考图做明暗/时段变体」，不是 text2img。`d214a00:src/data/defaultWorkflowTemplate.ts` 是 text2img（CLIPTextEncode × 2 + 空 latent + KSampler），且当时的 `inputImageNodeId` **只定义、没有任何调用点**——不能直接复用，只能当节点映射形状的参考。

### 生成链路改动

- `src/services/generation/generationQueue.ts` 现在直接 `import { generateImageWithWorker }`；改为按 `provider.templateId` 选 transport（`worker` | `comfyui`），保持 `onTaskUpdate(taskId, patch)` 与 `signal` 语义不变（取消要传进轮询循环，别只挂在单个 fetch 上）。
- 超时策略：Worker 路径保留 120s 单请求；ComfyUI 路径改成「单次请求 30s + 总时长可配（默认 900s）」，进度写进现有 `task.progress`。
- 提示词：`worker/providers.ts` 里那段 `stabilityInstruction`（保构图、只改光照）必须被 ComfyUI 路径复用同一份文本，否则两条路径的「不漂移」承诺不一致（教训见 [2026-03-20-time-variant-prompt-stability](../../implemented/feature/2026-03-20-time-variant-prompt-stability.md)）。

### 落地清单

- `src/types/domain.ts` 的 `ProviderKind` 加 `comfyui`；`src/types/provider.ts` 加模板、`ComfyNodeMapping`、默认 workflow。
- 新文件 `src/services/providers/comfyuiClient.ts`：权限与能力探测 + upload/prompt/jobs/view/cancel。
- `src/components/settings/ProviderConfig.tsx`、`ProviderSettingsPanel.tsx`：ComfyUI 字段块（baseUrl、workflow JSON、节点映射、连通性测试、权限引导）。i18n 里 `workflow` / `nodeMap` 两个键是 `751e7cc` 删除后留下的死字符串（全仓库无引用），可直接捡回。
- 落地后本篇转 `implemented/architecture/`，并按 [2026-03-19-worker-first-byok-boundary](../../implemented/architecture/2026-03-19-worker-first-byok-boundary.md) 的「重访信号」补互链——该篇已预告「新供应方不满足现有三种 wire 之一 → 应改为显式能力声明」，本方案正是那次触发。

## 依据（外部实现与规范）

| 事实 | 出处 |
|---|---|
| LNA 权限提示自 Chrome 142 起默认生效；权限按 origin、限安全上下文；`local-network` / `loopback-network` 已拆分 | [Chromium blog: New permission prompt for Local Network Access](https://developer.chrome.com/blog/local-network-access)、[MDN: Local network access](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access) |
| 权限授予后豁免混合内容；判据为私网 IP 字面量、`.local`、`targetAddressSpace: "local"` | 同上 |
| LNA 用权限取代了 PNA 预检（原文：gating access on a permission rather than via preflight requests）→ ComfyUI 不需要 `Access-Control-Allow-Private-Network` | [wicg/local-network-access 规范](https://wicg.github.io/local-network-access/) |
| Chromium 目前只对 public → local/loopback 执行 LNA，local → local 暂不校验（仍是未来计划） | 同规范 NOTE 段 |
| SW / Shared Worker 发起的本地请求要求 origin 事先已获授权，worker 自身弹不出提示 | [Chromium blog「Known issues」](https://developer.chrome.com/blog/local-network-access) |
| ComfyUI 默认监听 `127.0.0.1`；`--enable-cors-header [ORIGIN]` 不带参数即 `*`；`--max-upload-size` 默认 100MB | `ComfyUI/comfy/cli_args.py` |
| 未开 CORS 时跨源请求被 `create_origin_only_middleware` 403 | `ComfyUI/server.py`（`create_origin_only_middleware`） |
| `POST /prompt` 接受客户端指定的 `prompt_id`（小写连字符 UUID）；`/api/jobs/{job_id}` 支持 pending/in_progress/completed/failed/cancelled 与幂等取消 | `ComfyUI/server.py`、`ComfyUI/comfy_execution/jobs.py` |

## Alternatives considered

- **把应用改成 PWA** — 这是最初被提出的方案，最强论据是「装成本地应用就能访问本机服务」。它对本地网络访问零帮助：LNA 权限按 origin 记录，PWA 装到桌面仍是同一个 https origin，权限模型与标签页完全一致；想靠 Service Worker 当本地中继也不行——SW 发起的本地请求要求该 origin 事先已获授权，而 worker 自己弹不出权限提示（Chromium 明确说该能力还在做）。它真正能带来的是安装、独立窗口、离线外壳、`share_target` 收图，而这些都不是当前痛点，却要引入 SW 缓存与「`/api/generate` 强制 `no-store`、SPA 版本更新」的交互成本和测试面。真需要离线/安装时再单独做。
- **Cloudflare Tunnel（`cloudflared tunnel --url http://127.0.0.1:8188`）** — 最强论据：完全保持 worker-first 不变，ComfyUI 拿到公网 HTTPS，CORS 与 LNA 都不用管。否掉的原因：等于把本地生图服务暴露到公网（必须再加 Access 才敢用），用户要多常驻一个进程，而 Worker 侧的 100s/524 与请求体限制依然在——真要绕开还是得改「提交 + 轮询」，也就是两条路都得做轮询，却额外多付一层运维。
- **整站自托管到局域网/本机** — 最省事：Chromium 目前只对 public → local/loopback 执行 LNA，所以从 `http://192.168.x.x:4173` 或 `http://localhost:5173` 起的页面调局域网 ComfyUI **不需要授权**。否掉的原因：那已经不是「部署在 Worker 上的那个应用」；`workerClient.ts` 全是相对路径，要么加可配 API base、要么本地跑 `wrangler dev`，等于同时换掉部署故事和数据面；且局域网 http 源非安全上下文，连 PWA 都装不了。可作为个人自用兜底，不作为主线。
- **用 Worker 代理 ComfyUI（把 LAN 地址塞进 `/api/generate`）** — 看似零前端改动（`ensureProviderReady` 只要求 baseUrl 非空）。直接否：Worker 出网在 Cloudflare 边缘，`http://192.168.1.50:8188` 是它的「内网」，请求不会回到用户家里，只会超时或失败，且难以诊断。
- **复用 `d214a00` 的 `comfyuiProvider.ts`** — 形状对得上（浏览器直连 `${baseUrl}/prompt` + 轮询 `/history/{id}` + `/view`），但三处不成立：它早于 worker-first 边界；它**没有参考图上传**（`inputImageNodeId` 从未被调用）；它依赖 `src/services/providers/http.ts` 里如今已成死代码的 `fetchJson`。结论：借形状，不借代码。

## Acceptance criteria

- 设置里选 ComfyUI、填 `baseUrl` → 「连通性测试」能区分并分别提示三种失败：连不上（未启动/网络）、403（缺 `--enable-cors-header`）、权限被拒或未授予（LNA）。
- 在 `npm run preview:worker` 起的页面（非 loopback 源，等价 public → loopback 场景）跑通完整链路：上传参考图 → 提交 → 进度更新 → 取回图片 → 任务态 `succeeded`；ComfyUI 访问日志中只有来自浏览器的请求，没有 Worker 的出网。
- 生成中途取消：ComfyUI 侧该 prompt 变为 cancelled/interrupted，前端任务态 `canceled`，队列无残留。
- 云路径行为不变：`grep -rn "fetch(" src/` 只多出 `comfyuiClient.ts` 的命中。
- 新增回归测试只钉一条契约——`generationQueue` 按 `templateId` 选择 transport；不做 UI 断言。

## Risks

- **权限被拒或浏览器不支持** → 功能整体不可用。缓解：`navigator.permissions.query` 预检 + 明确引导；Safari/Firefox 当前没有 LNA 权限模型，直接提示改用 Chrome 或 Cloudflare Tunnel 方案。
- **Chromium 扩大 LNA 覆盖**：规范已写明计划覆盖「local → local」以及 WebSocket/WebTransport/WebRTC。现在能跑的自托管组合将来会被收紧，ws 进度通道也在计划内。因此本方案把 `/api/jobs` HTTP 轮询设为主路径、ws 只做增强。
- **ComfyUI 版本漂移**：`/api/jobs` 与客户端指定 `prompt_id` 都较新。必须保留 `GET /history/{prompt_id}` + `/queue` 回落，且回落路径要能独立跑通完整链路，不能只是「尽力而为」。
- **workflow 模板漂移**：用户改过的 ComfyUI（自定义节点、删掉的默认工作流）会让 `nodeMapping` 的节点 id 失效。提交前用 `/object_info` 校验节点类存在，失败时把 `node_errors` 原样透出，而不是落到 `UNKNOWN_ERROR`。
- **提示词约束分叉**：`stabilityInstruction` 只有 Worker 一份副本；ComfyUI 路径若复制文本，必须同步进 `tests/prompt-stability-regression.test.mjs` 的断言范围，否则两条路径的「不漂移」承诺会不一致。
- **安全面**：`--enable-cors-header` 用 `*` 会让任意网页都能往用户的 ComfyUI 排工作流（源码注释里那个 CSRF 正是被它挡住的）；若同时 `--listen 0.0.0.0`，局域网内任何机器都能占用其 GPU。UI 文案必须推荐填精确 origin。
- **回滚条件**：若实际使用中 LNA 提示频繁被拒，或 Chrome 之外的主流浏览器长期不实现该权限模型，本篇应转 `rejected` 并改走 Cloudflare Tunnel。
