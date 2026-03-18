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
    const imagePayload = await generateImage(
      body.image,
      body.prompt,
      body.width,
      body.height,
      body.provider,
      body.negativePrompt
    );

    if (imagePayload.kind === "data-url") {
      const [header, encoded] = imagePayload.value.split(",", 2);
      const mimeMatch = header.match(/^data:([^;]+);base64$/);
      if (!mimeMatch || !encoded) {
        throw new Error("Invalid data URL returned by provider");
      }

      const binary = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
      return new Response(binary, {
        headers: {
          "Content-Type": mimeMatch[1],
          "Cache-Control": "no-store",
        },
      });
    }

    const upstream = await fetch(imagePayload.value);
    if (!upstream.ok) {
      throw new Error(`Failed to fetch generated image: ${upstream.status}`);
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export default app;
