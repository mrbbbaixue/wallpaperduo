# Agent Note: 生成队列的并发、重试与协作式取消

Status: implemented

## Problem

一批生成是 1–4 个时段变体，每个变体一次远程生图调用，可能几十秒。没有队列时，「一张卡住」就等于整批卡住；而 `824ac2b` 之前生成中的按钮是 `disabled` 的——用户既不能中止，也不能只重跑失败的那些，只能刷新页面（丢掉全部结果）。

## Decision

`src/services/generation/generationQueue.ts` 是一个受限并发的 worker 池，取消走 `AbortSignal`，终态语义统一。

- **受限并发**：`workers = Math.max(1, Math.min(concurrency || 1, queue.length || 1))`，`Promise.all` 起 workers 个协程共享一个 `queue`，用 `queue.shift()` 取任务（每个任务只会被一个 worker 取到一次）。默认值来自设置：`generationSettings.concurrency = 2`、`retries = 1`。
- **重试**：`for (let attempt = 0; attempt <= retries; attempt += 1)`，只有非 Abort 异常才继续下一次；重试期间进度写 `25 + 25 * attempt`（是**进度占位**，不是真实进度）。
- **取消是协作式的，四条退出路径都收敛到 `canceled`**：① worker 循环取任务前发现 `signal.aborted` → 直接停止取新任务；② 每次尝试前发现 aborted → 该任务置 `canceled/progress: 0`；③ `fetch` 带 `signal`，`DOMException.name === "AbortError"` 也置 `canceled`；④ `Promise.all` 之后把 `queue` 里剩下的全部置 `canceled`，保证返回值覆盖所有输入任务。
- **状态所有权**：任务状态存在 `useWorkflowStore.tasks`，由 `onTaskUpdate(taskId, patch)` 逐字段回写（`updateTask`），队列结束后调用方再用终态整体合并一次。`runGenerationQueue` 必须返回全部任务的终态——调用方依赖这一点做成功/失败/取消计数。
- **UI 侧**：`useGenerationRunner`（`src/hooks/useGenerationRunner.ts`）持有 `AbortController`，构建 `GenerationTask[]`（`id: createId("gen")`、`theme` 由时段推导、`seed` 随机）后入队；按钮在生成中变成「取消生成」并调用 `abort()`，toast 里统计成功/失败/取消数量。

## Alternatives considered

- **串行队列（一次一个）** — 最可控、最容易限流友好；但 4 个变体要等 4 轮，且默认并发 2 是「单供应方限流下还能接受」的折中。并发数已暴露在设置里（用户可调），所以选了池化而不是串行。
- **生成中禁用按钮（不可取消）** — 语义上最安全（不会出现中断后的半成品状态），但用户无法止损；`824ac2b` 明确把禁用按钮换成可点击的取消按钮。
- **用 Web Worker / `terminate` 强制中断** — 能真正「立刻停」，包括同步等待；但生成是网络 IO（fetch），`AbortSignal` 已经能中断在途请求，另起 Worker 只会增加一层序列化成本，仓库里没有任何 `Worker.terminate` 痕迹。
- **把队列放进 store 或 service 单例（脱离组件）** — 便于跨页面共享进度；但一次批量生成的归属就是「当前这次点击」，`AbortController` 与 toast 生命周期都属于调用方，抽成 hook 后组件只负责渲染。

## Consequences

- **收益**：一张图慢不会拖死整批；取消后所有任务都有确定的终态（不存在永远 `running` 的孤儿），因此进度条与统计始终可收敛；并发/重试可调（1–4 / 0–5）以应对限流。
- **代价与已知上限**：
  - 取消是**协作式**的：`withTimeout(fetch(...), 120_000)` 包裹下的在途请求只能随 signal 尽快中止，UI 文案也如实写着「已在生成中的任务也会尽快中止」。
  - 进度不是真实进度：只有 2 / 8 / 25 / 50 / 75 / 100 这类占位值，全局进度条（`AppShell`）由这些值平均而来。
  - 池内没有背压与速率限制，唯一限流手段是用户调低 concurrency。
  - 取消后重新生成会**追加**新任务到 `tasks`（`setTasks([...existingTasks, ...newTasks])`），历史任务与新任务混在同一列表里，靠 id 与终态区分。
- **重访信号**：取消后出现卡在 `running`/`queued` 的任务 → 说明 `AbortSignal` 没被真正应用到请求；需要「只重试失败项」或「按任务删除」→ 当前模型（追加 + 终态合并）需要扩展；`withTimeout` 的超时值与供应方实际耗时不再匹配 → 队列会集体失败。

## Verification

- `grep -n "isAborted\|signal" src/services/generation/generationQueue.ts` 应看到三处守卫 + `fetch` 传 signal + 残留队列置 `canceled`。
- 默认值：`grep -n "concurrency\|retries" src/store/useSettingsStore.ts` → `2` / `1`。
- 人工冒烟：选 2 个时段 → 生成中途点「取消生成」→ 任务列表里未开始的是 `canceled/0`、在途的尽快变 `canceled`，toast 统计取消数量；再点一次生成，新任务追加在列表尾部且不影响旧结果。
