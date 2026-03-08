import type {
  ImageProvider,
  AnalyzeInput,
  GenerateInput,
  GeneratedPayload,
} from "@/types/provider";
import type { SceneAnalysis } from "@/types/domain";

import {
  downloadProviderImage,
  decodeBase64Image,
  fetchJson,
  parseExtraHeaders,
  toDataUrl,
} from "@/services/providers/http";
import {
  compactError,
  logError,
  logInfo,
  logWarn,
  maskSecret,
  redactHeaders,
} from "@/utils/debugLog";

interface OpenRouterProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  extraHeaders: string;
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{ type?: string; text?: string; image_url?: { url?: string }; b64_json?: string }>;
      images?: Array<{ image_url?: { url?: string }; b64_json?: string }>;
      image_url?: { url?: string };
    };
  }>;
}

const parseResponseText = (data: OpenRouterChatResponse): string => {
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((item) => {
      if (typeof item.text === "string") {
        return item.text;
      }
      return "";
    })
    .join("\n");
};

const parseSceneJson = (text: string): SceneAnalysis => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("SCENE_JSON_NOT_FOUND");
  }
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

const tryExtractImage = async (data: OpenRouterChatResponse, timeoutMs: number): Promise<Blob> => {
  const choice = data.choices?.[0]?.message;
  const urlFromImageArray = choice?.images?.[0]?.image_url?.url;
  const urlFromMessage = choice?.image_url?.url;
  const content = choice?.content;
  const urlFromContent = Array.isArray(content)
    ? content.find((item) => item.image_url?.url)?.image_url?.url
    : undefined;
  const b64FromImageArray = choice?.images?.[0]?.b64_json;
  const b64FromContent = Array.isArray(content)
    ? content.find((item) => item.b64_json)?.b64_json
    : undefined;

  const url = urlFromImageArray ?? urlFromMessage ?? urlFromContent;
  const b64 = b64FromImageArray ?? b64FromContent;

  // Prefer base64 to avoid CORS issues in production
  if (b64) {
    return decodeBase64Image(b64);
  }
  if (url) {
    // Warn about potential CORS issues in production when using URL
    const isProduction =
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";
    if (isProduction) {
      logWarn(
        "OpenRouter returned image URL instead of base64; downloading via proxy may fail in production",
        {
          url,
        },
      );
    }
    return downloadProviderImage({
      url,
      timeoutMs,
      label: "openrouter:image-download",
      preferLocalProxy: true,
      allowLocalProxyFallback: true,
    });
  }
  throw new Error("OPENROUTER_IMAGE_NOT_FOUND");
};

export const createOpenRouterProvider = (options: OpenRouterProviderOptions): ImageProvider => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${options.apiKey}`,
    ...parseExtraHeaders(options.extraHeaders),
  };
  logInfo("OpenRouter provider configured", {
    baseUrl: options.baseUrl,
    model: options.model,
    timeoutMs: options.timeoutMs,
    apiKey: maskSecret(options.apiKey),
    headers: redactHeaders(headers),
  });

  return {
    name: "openrouter",
    async testConnection() {
      const startedAt = performance.now();
      await fetchJson(`${options.baseUrl}/models`, { method: "GET", headers }, options.timeoutMs, {
        label: "openrouter:testConnection",
      });
      logInfo("OpenRouter connectivity test passed", {
        elapsedMs: Math.round(performance.now() - startedAt),
      });
      return {
        ok: true,
        provider: "openrouter",
        latencyMs: Math.round(performance.now() - startedAt),
        message: "Connected to OpenRouter",
      };
    },
    async analyzeImage(input: AnalyzeInput) {
      const imageDataUrl = await toDataUrl(input.prepared.blob);
      const body = {
        model: options.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Analyze this wallpaper and return strict JSON with fields:",
                  "summary, subjects[], foreground[], background[], lighting, palette[], risks[].",
                  "Keep each array compact. Include any compositional risk.",
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
      };
      const response = await fetchJson<OpenRouterChatResponse>(
        `${options.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        },
        options.timeoutMs,
        {
          label: "openrouter:analyzeImage",
        },
      );
      try {
        return parseSceneJson(parseResponseText(response));
      } catch (error) {
        logError("OpenRouter analysis parse failed", {
          error: compactError(error),
          responsePreview: parseResponseText(response),
        });
        throw error;
      }
    },
    async generateVariant(input: GenerateInput): Promise<GeneratedPayload> {
      logInfo("OpenRouter generation start", {
        variantId: input.variant.id,
        variantLabel: input.variant.label,
        seed: input.variant.seed,
        model: options.model,
      });
      const imageDataUrl = await toDataUrl(input.prepared.blob);
      const body = {
        model: options.model,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Generate a high-quality wallpaper image based on the composition reference.",
                  "Keep object positions stable.",
                  `Prompt: ${input.variant.prompt}`,
                  `Negative prompt: ${input.variant.negativePrompt}`,
                  `Seed: ${input.variant.seed}`,
                ].join("\n"),
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
      };

      const response = await fetchJson<OpenRouterChatResponse>(
        `${options.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        },
        options.timeoutMs,
        {
          label: "openrouter:generateVariant",
        },
      );
      try {
        const blob = await tryExtractImage(response, options.timeoutMs);
        logInfo("OpenRouter generation finished", {
          variantId: input.variant.id,
          bytes: blob.size,
        });
        return {
          blob,
          provider: "openrouter",
          source: "provider",
        };
      } catch (error) {
        logError("OpenRouter image extraction failed", {
          error: compactError(error),
          variantId: input.variant.id,
          rawChoiceKeys: Object.keys(response.choices?.[0]?.message ?? {}),
        });
        throw error;
      }
    },
  };
};
