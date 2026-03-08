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
  shortText,
} from "@/utils/debugLog";
import { withTimeout } from "@/utils/error";

interface ArkProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
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

const ARK_MIN_PIXELS = 3_686_400;
const ARK_SIZE_STEP = 8;

const alignUp = (value: number, step: number): number => Math.ceil(value / step) * step;

const normalizeArkSize = (
  width: number,
  height: number,
): { width: number; height: number; upscaled: boolean } => {
  let safeWidth = Math.max(64, Math.round(width));
  let safeHeight = Math.max(64, Math.round(height));
  const sourceWidth = safeWidth;
  const sourceHeight = safeHeight;

  const area = safeWidth * safeHeight;
  if (area < ARK_MIN_PIXELS) {
    const scale = Math.sqrt(ARK_MIN_PIXELS / area);
    safeWidth = Math.ceil(safeWidth * scale);
    safeHeight = Math.ceil(safeHeight * scale);
  }

  safeWidth = alignUp(safeWidth, ARK_SIZE_STEP);
  safeHeight = alignUp(safeHeight, ARK_SIZE_STEP);

  while (safeWidth * safeHeight < ARK_MIN_PIXELS) {
    if (safeWidth >= safeHeight) {
      safeHeight += ARK_SIZE_STEP;
    } else {
      safeWidth += ARK_SIZE_STEP;
    }
  }

  return {
    width: safeWidth,
    height: safeHeight,
    upscaled: safeWidth !== sourceWidth || safeHeight !== sourceHeight,
  };
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

interface ArkErrorBody {
  error?: {
    code?: string;
    message?: string;
    param?: string;
    type?: string;
  };
}

const parseArkErrorBody = (raw: string): ArkErrorBody | null => {
  if (!raw.trim()) {
    return null;
  }
  try {
    return JSON.parse(raw) as ArkErrorBody;
  } catch {
    return null;
  }
};

const isMissingModelError = (raw: string): boolean => {
  const parsed = parseArkErrorBody(raw);
  if (parsed?.error?.code !== "MissingParameter") {
    return /MissingParameter/i.test(raw) && /model/i.test(raw);
  }
  const codeParam = parsed.error.param ?? "";
  const codeMessage = parsed.error.message ?? "";
  return /model/i.test(codeParam) || /model/i.test(codeMessage);
};

const toReadableProbeDetails = (raw: string): string => {
  const parsed = parseArkErrorBody(raw);
  const providerMessage = parsed?.error?.message?.trim();
  if (providerMessage) {
    return shortText(providerMessage, 220);
  }
  return shortText(raw, 220);
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
      try {
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
          probe: "/models",
        });

        return {
          ok: true,
          provider: "ark",
          latencyMs: Math.round(performance.now() - startedAt),
          message: "Connected to Ark Runtime (/models)",
        };
      } catch (firstError) {
        const firstMessage = compactError(firstError);
        const looksLikeCors = /failed to fetch|networkerror|cors/i.test(firstMessage);
        if (!looksLikeCors) {
          if (isMissingModelError(firstMessage)) {
            return {
              ok: true,
              provider: "ark",
              latencyMs: Math.round(performance.now() - startedAt),
              message: "Ark reachable (model probe required)",
              details: "Connectivity is available. Configure a generation/vision model to complete probe.",
            };
          }
          throw firstError;
        }

        logWarn("Ark /models connectivity probe failed, falling back to /chat/completions", {
          error: firstMessage,
        });

        const probeModel = options.visionModel?.trim() || options.model.trim();
        const probeBody = probeModel
          ? JSON.stringify({
              model: probeModel,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 1,
            })
          : "{}";
        const fallbackStartedAt = performance.now();
        const fallbackResponse = await withTimeout(
          fetch(`${options.baseUrl}/chat/completions`, {
            method: "POST",
            headers,
            body: probeBody,
          }),
          options.timeoutMs,
        );
        const fallbackElapsed = Math.round(performance.now() - fallbackStartedAt);
        const fallbackBody = shortText(await fallbackResponse.text(), 220);
        const fallbackDetails = toReadableProbeDetails(fallbackBody);
        const fallbackMissingModel = isMissingModelError(fallbackBody);

        if (fallbackResponse.status === 401) {
          throw new Error(`401 ${fallbackBody || "Unauthorized"}`);
        }
        if (fallbackResponse.status === 403) {
          throw new Error(`403 ${fallbackBody || "Forbidden"}`);
        }
        if (!fallbackResponse.ok && fallbackResponse.status >= 500) {
          throw new Error(`${fallbackResponse.status} ${fallbackBody}`);
        }

        logInfo("Ark connectivity fallback probe finished", {
          status: fallbackResponse.status,
          elapsedMs: fallbackElapsed,
        });
        return {
          ok: fallbackResponse.ok || fallbackMissingModel,
          provider: "ark",
          latencyMs: fallbackElapsed,
          message:
            fallbackResponse.ok
              ? "Connected to Ark Runtime (fallback probe)"
              : fallbackMissingModel
                ? "Ark reachable (model probe required)"
                : `Ark probe returned ${fallbackResponse.status}`,
          details: fallbackResponse.ok
            ? "GET /models may be blocked by provider CORS on current origin."
            : fallbackMissingModel
              ? "Connectivity is available. Configure a generation/vision model to complete probe."
              : fallbackDetails,
        };
      }
    },
    async analyzeImage(input: AnalyzeInput) {
      const visionModel = options.visionModel?.trim() || options.model.trim();
      if (!visionModel) {
        throw new Error("ARK_MODEL_REQUIRED");
      }
      const imageDataUrl = await toDataUrl(input.prepared.blob);
      const response = await fetchJson<ArkChatResponse>(
        `${options.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers,
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
      const normalizedSize = normalizeArkSize(input.prepared.width, input.prepared.height);
      const size = `${normalizedSize.width}x${normalizedSize.height}`;
      const payload = isSeedreamModel(options.model)
        ? {
            model: options.model,
            prompt,
            image: imageDataUrl,
            sequential_image_generation: "disabled",
            response_format: "b64_json",
            size,
            stream: false,
            watermark: true,
          }
        : {
            model: options.model,
            prompt,
            response_format: "b64_json",
            size,
          };

      logInfo("Ark generation payload mode", {
        variantId: input.variant.id,
        seedreamMode: isSeedreamModel(options.model),
        size,
        upscaledToMeetMinimum: normalizedSize.upscaled,
        payloadPreview: {
          ...payload,
          image:
            typeof imageDataUrl === "string" ? `data-url(${imageDataUrl.length} chars)` : undefined,
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
        logInfo("Ark generation returned URL image (unexpected, API should return b64_json)", {
          variantId: input.variant.id,
          imageUrl: image.url,
        });
        logWarn("Ark URL image fallback: using direct browser download", {
          variantId: input.variant.id,
        });
        return {
          blob: await downloadProviderImage({
            url: image.url,
            timeoutMs: options.timeoutMs,
            label: "ark:image-download",
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
