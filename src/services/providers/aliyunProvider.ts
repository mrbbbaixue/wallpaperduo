import type {
  ImageProvider,
  AnalyzeInput,
  GenerateInput,
  GeneratedPayload,
} from "@/types/provider";
import type { SceneAnalysis } from "@/types/domain";

import {
  downloadProviderImage,
  fetchJson,
  parseExtraHeaders,
  toDataUrl,
} from "@/services/providers/http";
import {
  compactError,
  logError,
  logInfo,
  maskSecret,
  redactHeaders,
  shortText,
} from "@/utils/debugLog";
import { withTimeout } from "@/utils/error";

interface AliyunProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  timeoutMs: number;
  extraHeaders: string;
}

interface AliyunChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// DashScope native generation response
interface AliyunGenResponse {
  output?: {
    choices?: Array<{
      finish_reason?: string;
      message?: {
        content?: Array<{ image?: string; text?: string }>;
        role?: string;
      };
    }>;
  };
  usage?: { image_count?: number; width?: number; height?: number };
  request_id?: string;
  code?: string;
  message?: string;
}

const ALIYUN_MIN_PIXELS = 512 * 512;
const ALIYUN_MAX_PIXELS = 2048 * 2048;

// DashScope generation endpoint (fixed, not configurable via baseUrl)
const DASHSCOPE_GEN_ENDPOINT =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

const normalizeAliyunSize = (
  width: number,
  height: number,
): { width: number; height: number } => {
  let w = Math.max(64, Math.round(width));
  let h = Math.max(64, Math.round(height));

  const area = w * h;
  if (area < ALIYUN_MIN_PIXELS) {
    const scale = Math.sqrt(ALIYUN_MIN_PIXELS / area);
    w = Math.ceil(w * scale);
    h = Math.ceil(h * scale);
  } else if (area > ALIYUN_MAX_PIXELS) {
    const scale = Math.sqrt(ALIYUN_MAX_PIXELS / area);
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);
  }

  w = Math.max(512, Math.min(2048, w));
  h = Math.max(512, Math.min(2048, h));

  return { width: w, height: h };
};

const parseSceneJson = (text: string): SceneAnalysis => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("SCENE_JSON_NOT_FOUND");
  const parsed = JSON.parse(match[0]) as SceneAnalysis;
  return {
    summary: parsed.summary || "",
    subjects: parsed.subjects || [],
    foreground: parsed.foreground || [],
    background: parsed.background || [],
    lighting: parsed.lighting || "",
    palette: parsed.palette || [],
    risks: parsed.risks || [],
  };
};

export const createAliyunProvider = (options: AliyunProviderOptions): ImageProvider => {
  const authHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${options.apiKey}`,
    ...parseExtraHeaders(options.extraHeaders),
  };

  logInfo("Aliyun provider configured", {
    baseUrl: options.baseUrl,
    model: options.model,
    visionModel: options.visionModel,
    timeoutMs: options.timeoutMs,
    apiKey: maskSecret(options.apiKey),
    headers: redactHeaders(authHeaders),
  });

  return {
    name: "aliyun",

    async testConnection() {
      const startedAt = performance.now();
      const probeModel = options.visionModel?.trim() || options.model.trim();
      try {
        const response = await withTimeout(
          fetch(`${options.baseUrl}/chat/completions`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              model: probeModel,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 1,
            }),
          }),
          options.timeoutMs,
        );
        const elapsed = Math.round(performance.now() - startedAt);
        const body = await response.text();
        const details = shortText(body, 220);

        if (response.status === 401) throw new Error(`401 ${details || "Unauthorized"}`);
        if (response.status === 403) throw new Error(`403 ${details || "Forbidden"}`);
        if (!response.ok && response.status >= 500) throw new Error(`${response.status} ${details}`);

        logInfo("Aliyun connectivity probe finished", { status: response.status, elapsedMs: elapsed });
        return {
          ok: response.ok,
          provider: "aliyun",
          latencyMs: elapsed,
          message: response.ok ? "Connected to Aliyun DashScope" : "Aliyun reachable (check model name)",
          details: response.ok ? undefined : details,
        };
      } catch (error) {
        logError("Aliyun connectivity probe failed", { error: compactError(error) });
        throw error;
      }
    },

    async analyzeImage(input: AnalyzeInput): Promise<SceneAnalysis> {
      const visionModel = options.visionModel?.trim() || options.model.trim();
      if (!visionModel) throw new Error("ALIYUN_MODEL_REQUIRED");

      const imageDataUrl = await toDataUrl(input.prepared.blob);
      const response = await fetchJson<AliyunChatResponse>(
        `${options.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            model: visionModel,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: [
                      "Analyze wallpaper. Return strict JSON fields:",
                      "summary, subjects[], foreground[], background[], lighting, palette[], risks[].",
                      input.userPrompt ? `User context: ${input.userPrompt}` : "",
                    ]
                      .filter(Boolean)
                      .join(" "),
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageDataUrl },
                  },
                ],
              },
            ],
          }),
        },
        options.timeoutMs,
        { label: "aliyun:analyzeImage" },
      );

      try {
        return parseSceneJson(response.choices?.[0]?.message?.content ?? "");
      } catch (error) {
        logError("Aliyun analysis parse failed", {
          error: compactError(error),
          content: shortText(response.choices?.[0]?.message?.content ?? "", 300),
        });
        throw error;
      }
    },

    async generateVariant(input: GenerateInput): Promise<GeneratedPayload> {
      if (!options.model.trim()) throw new Error("ALIYUN_MODEL_REQUIRED");

      const { width, height } = normalizeAliyunSize(input.prepared.width, input.prepared.height);
      const size = `${width}*${height}`;

      logInfo("Aliyun generation start", {
        variantId: input.variant.id,
        variantLabel: input.variant.label,
        model: options.model,
        size,
      });

      const imageDataUrl = await toDataUrl(input.prepared.blob);
      const promptText = [
        input.variant.prompt,
        input.variant.seed ? `Seed: ${input.variant.seed}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const requestBody = {
        model: options.model,
        input: {
          messages: [
            {
              role: "user",
              content: [
                { image: imageDataUrl },
                { text: promptText },
              ],
            },
          ],
        },
        parameters: {
          negative_prompt: input.variant.negativePrompt || undefined,
          size,
          watermark: false,
          n: 1,
        },
      };

      logInfo("Aliyun generation payload", {
        variantId: input.variant.id,
        size,
        model: options.model,
      });

      const response = await fetchJson<AliyunGenResponse>(
        DASHSCOPE_GEN_ENDPOINT,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(requestBody),
        },
        options.timeoutMs,
        { label: "aliyun:generateVariant" },
      );

      // Check for API-level error in response body
      if (response.code) {
        throw new Error(`${response.code}: ${response.message ?? "Aliyun generation failed"}`);
      }

      const imageUrl = response.output?.choices?.[0]?.message?.content?.[0]?.image;
      if (!imageUrl) {
        logError("Aliyun generation returned no image URL", {
          variantId: input.variant.id,
          response,
        });
        throw new Error("ALIYUN_IMAGE_NOT_FOUND");
      }

      logInfo("Aliyun generation finished, downloading image", {
        variantId: input.variant.id,
        imageUrl: shortText(imageUrl, 80),
      });

      const blob = await downloadProviderImage({
        url: imageUrl,
        timeoutMs: options.timeoutMs,
        label: "aliyun:image-download",
      });

      return { blob, provider: "aliyun", source: "provider" };
    },
  };
};
