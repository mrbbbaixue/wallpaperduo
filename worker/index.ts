import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// CORS 中间件
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// 健康检查
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 测试连接
app.post("/api/test-connection", async (c) => {
  const body = await c.req.json();
  // TODO: 实现 Provider 连接测试
  return c.json({ ok: true, message: "Connection test not implemented" });
});

// 图像分析
app.post("/api/analyze", async (c) => {
  const body = await c.req.json();
  // TODO: 实现图像分析代理
  return c.json({ error: "Not implemented" }, 501);
});

// 图像生成
app.post("/api/generate", async (c) => {
  const body = await c.req.json();
  // TODO: 实现图像生成代理
  return c.json({ error: "Not implemented" }, 501);
});

export default app;