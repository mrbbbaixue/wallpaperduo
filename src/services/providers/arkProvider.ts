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
import { compactError, logError, logInfo, maskSecret, redactHeaders } from "@/utils/debugLog";

interface ArkProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  extraHeaders: string;
}

interface ArkChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ArkImageResponse {
  data?: Array<{ url?: string; b64_json?: string }>;
}

const isSeedreamModel = (model: string): boolean => /doubao-seedream-5-0/i.test(model);

const estimateArkSizePreset = (width: number, height: number): "1K" | "2K" => {
  const longer = Math.max(width, height);
  return longer >= 1800 ? "2K" : "1K";
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

export const createArkProvider = (options: ArkProviderOptions): ImageProvider => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${options.apiKey}`,
    ...parseExtraHeaders(options.extraHeaders),
  };
  logInfo("Ark provider configured", {
    baseUrl: options.baseUrl,
    model: options.model,
    timeoutMs: options.timeoutMs,
    apiKey: maskSecret(options.apiKey),
    headers: redactHeaders(headers),
  });

  return {
    name: "ark",
    async testConnection() {
      const startedAt = performance.now();
      await fetchJson<Record<string, unknown>>(
        `${options.baseUrl}/models`,
        {
          method: "GET",
          headers,
        },
        options.timeoutMs,
        {
          label: "ark:testConnection",
        },
      );
      logInfo("Ark connectivity test passed", {
        elapsedMs: Math.round(performance.now() - startedAt),
      });

      return {
        ok: true,
        provider: "ark",
        latencyMs: Math.round(performance.now() - startedAt),
        message: "Connected to Ark Runtime (/models)",
      };
    },
    async analyzeImage(input: AnalyzeInput) {
      if (!options.model.trim()) {
        throw new Error("ARK_MODEL_REQUIRED");
      }
      const imageDataUrl = await toDataUrl(input.prepared.blob);
      const response = await fetchJson<ArkChatResponse>(
        `${options.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: options.model,
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
                    image_url: {
                      url: imageDataUrl,
                    },
                  },
                ],
              },
            ],
          }),
        },
        options.timeoutMs,
        {
          label: "ark:analyzeImage",
        },
      );
      try {
        return parseSceneJson(response.choices?.[0]?.message?.content ?? "");
      } catch (error) {
        logError("Ark analysis parse failed", {
          error: compactError(error),
          content: response.choices?.[0]?.message?.content ?? "",
        });
        throw error;
      }
    },
    async generateVariant(input: GenerateInput): Promise<GeneratedPayload> {
      if (!options.model.trim()) {
        throw new Error("ARK_MODEL_REQUIRED");
      }
      logInfo("Ark generation start", {
        variantId: input.variant.id,
        variantLabel: input.variant.label,
        seed: input.variant.seed,
        model: options.model,
      });
      const imageDataUrl = await toDataUrl(input.prepared.blob);
      const prompt = `${input.variant.prompt}\nNegative prompt: ${input.variant.negativePrompt}\nSeed: ${input.variant.seed}`;
      const payload = isSeedreamModel(options.model)
        ? {
            model: options.model,
            prompt,
            image: imageDataUrl,
            sequential_image_generation: "disabled",
            response_format: "url",
            size: estimateArkSizePreset(input.prepared.width, input.prepared.height),
            stream: false,
            watermark: true,
          }
        : {
            model: options.model,
            prompt,
            size: `${input.prepared.width}x${input.prepared.height}`,
          };

      logInfo("Ark generation payload mode", {
        variantId: input.variant.id,
        seedreamMode: isSeedreamModel(options.model),
        payloadPreview: {
          ...payload,
          image: typeof imageDataUrl === "string" ? `data-url(${imageDataUrl.length} chars)` : undefined,
        },
      });
      const response = await fetchJson<ArkImageResponse>(
        `${options.baseUrl}/images/generations`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
        options.timeoutMs,
        {
          label: "ark:generateVariant",
        },
      );

      const image = response.data?.[0];
      if (image?.b64_json) {
        const blob = decodeBase64Image(image.b64_json);
        logInfo("Ark generation finished with base64 image", {
          variantId: input.variant.id,
          bytes: blob.size,
        });
        return {
          blob,
          provider: "ark",
          source: "provider",
        };
      }
      if (image?.url) {
        logInfo("Ark generation returned URL image", {
          variantId: input.variant.id,
          imageUrl: image.url,
        });
        return {
          blob: await downloadProviderImage({
            url: image.url,
            timeoutMs: options.timeoutMs,
            label: "ark:image-download",
            preferLocalProxy: true,
            allowLocalProxyFallback: true,
          }),
          provider: "ark",
          source: "provider",
        };
      }
      logError("Ark generation returned no usable image", {
        variantId: input.variant.id,
        response: response,
      });
      throw new Error("ARK_IMAGE_NOT_FOUND");
    },
  };
};
