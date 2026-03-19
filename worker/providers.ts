import type { ProviderConfig, SceneAnalysis } from "./types";

type GeneratedImagePayload =
  | { kind: "url"; value: string }
  | { kind: "data-url"; value: string };

const supportedAspectRatios = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const filterStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const ensureProviderReady = (config: ProviderConfig) => {
  if (!config.baseUrl?.trim()) {
    throw new Error("Provider base URL is required");
  }
  if (!config.apiKey?.trim()) {
    throw new Error("PASSCODE_INVALID");
  }
  if (!config.model?.trim()) {
    throw new Error("Provider model is required");
  }
};

const isOpenRouterProvider = (config: ProviderConfig) =>
  config.templateId === "openrouter" || /(^|\.)openrouter\.ai$/i.test(new URL(config.baseUrl).hostname);

const composeGenerationPrompt = (prompt: string, negativePrompt?: string) => {
  const stabilityInstruction = [
    "Reference-preserving time-of-day wallpaper variation.",
    "Keep the core subject, silhouette, background landmarks, skyline, camera angle, and composition fixed.",
    "Only change lighting, sky tone, shadows, practical lights, and small time-dependent details.",
  ].join(" ");
  const parts = [stabilityInstruction, prompt.trim()];
  if (negativePrompt?.trim()) {
    parts.push(`Avoid: ${negativePrompt.trim()}`);
  }
  return parts.filter(Boolean).join("\n\n");
};

const extractMessageText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }
      if (isRecord(part) && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
};

const parseJsonObject = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]);
    }

    const objectMatch = value.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error("No JSON found in response");
  }
};

const normalizeSceneAnalysis = (value: unknown): SceneAnalysis => {
  const raw = isRecord(value) ? value : {};
  const normalized = {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    subjects: filterStringArray(raw.subjects),
    foreground: filterStringArray(raw.foreground),
    background: filterStringArray(raw.background),
    lighting: typeof raw.lighting === "string" ? raw.lighting : "",
    palette: filterStringArray(raw.palette),
    risks: filterStringArray(raw.risks),
  };
  if (!normalized.summary && normalized.subjects.length === 0) {
    throw new Error("Scene analysis payload is empty");
  }
  return normalized;
};

const deriveAspectRatio = (width: number, height: number) => {
  const target = width / height;
  return supportedAspectRatios.reduce((best, current) => {
    const [w, h] = current.split(":").map(Number);
    const delta = Math.abs(target - w / h);
    const [bestW, bestH] = best.split(":").map(Number);
    const bestDelta = Math.abs(target - bestW / bestH);
    return delta < bestDelta ? current : best;
  }, "16:9" as (typeof supportedAspectRatios)[number]);
};

export async function testConnection(config: ProviderConfig): Promise<{ ok: boolean; message: string }> {
  ensureProviderReady(config);
  const url = `${normalizeBaseUrl(config.baseUrl)}/chat/completions`;
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
  ensureProviderReady(config);
  const url = `${normalizeBaseUrl(config.baseUrl)}/chat/completions`;
  const model = config.visionModel || config.model;

  const systemPrompt =
    "Analyze this reference wallpaper for reference-preserving time-of-day wallpaper variation. " +
    "Return strict JSON fields: summary, subjects[], foreground[], background[], lighting, palette[], risks[]. " +
    "Use summary and risks to identify immutable anchors: core subject, silhouette, main composition, camera viewpoint, background landmarks, skyline, and spatial relationships. " +
    "Only treat lighting, sky tone, shadows, practical lights, and small time-dependent details as allowed changes.";

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
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
  };
  const content = extractMessageText(data.choices?.[0]?.message?.content ?? "");
  return normalizeSceneAnalysis(parseJsonObject(content));
}

export async function generateImage(
  image: string,
  prompt: string,
  width: number,
  height: number,
  config: ProviderConfig,
  negativePrompt?: string
): Promise<GeneratedImagePayload> {
  ensureProviderReady(config);
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const generationPrompt = composeGenerationPrompt(prompt, negativePrompt);

  if (isOpenRouterProvider(config)) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${generationPrompt}\n\nReference image fidelity is more important than novelty.`,
              },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
        image_config: {
          aspect_ratio: deriveAspectRatio(width, height),
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          images?: Array<{
            image_url?: { url?: string };
            imageUrl?: { url?: string };
          }>;
        };
      }>;
    };

    const imageUrl =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
      data.choices?.[0]?.message?.images?.[0]?.imageUrl?.url;
    if (!imageUrl) {
      throw new Error("No generated image payload in OpenRouter response");
    }

    return { kind: "data-url", value: imageUrl };
  }

  const url = config.generateUrl || `${baseUrl}/images/generations`;

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
        prompt: generationPrompt,
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
            content: [{ image }, { text: generationPrompt }],
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
