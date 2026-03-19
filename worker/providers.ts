import type { ProviderConfig, SceneAnalysis } from "./types";

type GeneratedImagePayload =
  | { kind: "url"; value: string }
  | { kind: "data-url"; value: string };

export async function testConnection(config: ProviderConfig): Promise<{ ok: boolean; message: string }> {
  const url = `${config.baseUrl}/chat/completions`;
  const model = config.visionModel || config.model;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });

    if (response.status === 401) {
      return { ok: false, message: "Invalid API key" };
    }
    if (response.status === 403) {
      return { ok: false, message: "Access forbidden" };
    }

    return {
      ok: response.ok,
      message: response.ok ? "Connected" : `HTTP ${response.status}`,
    };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

export async function analyzeImage(
  image: string,
  config: ProviderConfig,
  prompt?: string
): Promise<SceneAnalysis> {
  const url = `${config.baseUrl}/chat/completions`;
  const model = config.visionModel || config.model;

  const systemPrompt =
    "Analyze wallpaper. Return strict JSON fields: " +
    "summary, subjects[], foreground[], background[], lighting, palette[], risks[].";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt ? `${systemPrompt} Context: ${prompt}` : systemPrompt },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";

  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");

  return JSON.parse(match[0]) as SceneAnalysis;
}

export async function generateImage(
  image: string,
  prompt: string,
  width: number,
  height: number,
  config: ProviderConfig,
  negativePrompt?: string
): Promise<GeneratedImagePayload> {
  const url = config.generateUrl || `${config.baseUrl}/images/generations`;

  // OpenAI 兼容格式（无自定义 generateUrl）
  if (!config.generateUrl) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        n: 1,
        size: `${width}x${height}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.status}`);
    }

    const data = (await response.json()) as { data?: Array<{ url?: string }> };
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image URL in response");
    return { kind: "url", value: imageUrl };
  }

  // 阿里云 DashScope / 火山引擎 Ark 格式
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: {
        messages: [
          {
            role: "user",
            content: [{ image }, { text: prompt }],
          },
        ],
      },
      parameters: {
        negative_prompt: negativePrompt,
        size: `${width}*${height}`,
        watermark: false,
        n: 1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Generation failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    output?: {
      choices?: Array<{
        message?: {
          content?: Array<{ image?: string }>;
        };
      }>;
    };
    code?: string;
    message?: string;
  };

  if (data.code) {
    throw new Error(`${data.code}: ${data.message}`);
  }

  const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageUrl) throw new Error("No image URL in response");
  if (imageUrl.startsWith("data:")) {
    return { kind: "data-url", value: imageUrl };
  }
  return { kind: "url", value: imageUrl };
}
