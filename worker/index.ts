import { Hono } from "hono";
import { cors } from "hono/cors";
import { testConnection, analyzeImage, generateImage } from "./providers";
import type { AnalyzeRequest, GenerateRequest } from "./types";

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
  try {
    const body = await c.req.json<{
      provider: { baseUrl: string; apiKey: string; model: string };
    }>();
    const result = await testConnection(body.provider);
    return c.json(result);
  } catch (error) {
    return c.json({ ok: false, message: String(error) }, 500);
  }
});

// 图像分析
app.post("/api/analyze", async (c) => {
  try {
    const body = await c.req.json<AnalyzeRequest>();
    const result = await analyzeImage(body.image, body.provider, body.prompt);
    return c.json(result);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// 图像生成
app.post("/api/generate", async (c) => {
  try {
    const body = await c.req.json<GenerateRequest>();
    const imageUrl = await generateImage(
      body.image,
      body.prompt,
      body.width,
      body.height,
      body.provider,
      body.negativePrompt
    );
    return c.json({ imageUrl });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export default app;