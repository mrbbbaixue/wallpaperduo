import type {
  ImageProvider,
  AnalyzeInput,
  GenerateInput,
  GeneratedPayload,
} from "@/types/provider";
import type { SceneAnalysis } from "@/types/domain";
import type { ComfyProviderConfig } from "@/types/provider";

import { downloadProviderImage, fetchJson, parseExtraHeaders } from "@/services/providers/http";
import { compactError, logError, logInfo, maskSecret, redactHeaders } from "@/utils/debugLog";

interface ComfyPromptResponse {
  prompt_id: string;
}

interface ComfyHistoryResponse {
  [promptId: string]: {
    outputs?: Record<
      string,
      {
        images?: Array<{ filename: string; subfolder: string; type: string }>;
      }
    >;
  };
}

const createFallbackAnalysis = (input: AnalyzeInput): SceneAnalysis => ({
  summary:
    "ComfyUI provider does not include built-in vision analysis in this adapter. Use local heuristic output.",
  subjects: ["main subject from reference image"],
  foreground: ["high-contrast details"],
  background: ["ambient background depth"],
  lighting: input.userPrompt || "neutral",
  palette: ["source-derived palette"],
  risks: ["keep geometry and framing stable"],
});

const patchWorkflow = (
  template: string,
  config: ComfyProviderConfig,
  input: GenerateInput,
): Record<string, unknown> => {
  const workflow = JSON.parse(template) as Record<string, { inputs?: Record<string, unknown> }>;
  const mapping = config.nodeMapping;

  const setNodeInput = (nodeId: string | undefined, key: string, value: unknown) => {
    if (!nodeId || !workflow[nodeId]) {
      return;
    }
    workflow[nodeId].inputs = {
      ...(workflow[nodeId].inputs ?? {}),
      [key]: value,
    };
  };

  setNodeInput(mapping.positivePromptNodeId, "text", input.variant.prompt);
  setNodeInput(mapping.negativePromptNodeId, "text", input.variant.negativePrompt);
  setNodeInput(mapping.seedNodeId, "seed", input.variant.seed);
  setNodeInput(mapping.widthNodeId, "width", input.prepared.width);
  setNodeInput(mapping.heightNodeId, "height", input.prepared.height);
  setNodeInput(mapping.timeVariableNodeId, "value", input.variant.timeOfDay);

  return workflow as Record<string, unknown>;
};

const pollHistoryForImage = async (
  baseUrl: string,
  promptId: string,
  headers: HeadersInit,
  timeoutMs: number,
): Promise<{ filename: string; subfolder: string; type: string }> => {
  const deadline = Date.now() + timeoutMs;
  let polls = 0;

  while (Date.now() < deadline) {
    polls += 1;
    const history = await fetchJson<ComfyHistoryResponse>(
      `${baseUrl}/history/${promptId}`,
      { method: "GET", headers },
      30000,
      {
        label: "comfyui:poll-history",
      },
    );
    const outputs = history?.[promptId]?.outputs ?? {};
    for (const output of Object.values(outputs)) {
      const image = output.images?.[0];
      if (image) {
        logInfo("ComfyUI image found from history", {
          promptId,
          polls,
          filename: image.filename,
          subfolder: image.subfolder,
          type: image.type,
        });
        return image;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error("COMFYUI_GENERATION_TIMEOUT");
};

export const createComfyUiProvider = (config: ComfyProviderConfig): ImageProvider => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...parseExtraHeaders(config.extraHeaders),
  };
  if (config.apiKey.trim()) {
    (headers as Record<string, string>).Authorization = `Bearer ${config.apiKey}`;
  }
  logInfo("ComfyUI provider configured", {
    baseUrl: config.baseUrl,
    model: config.model,
    timeoutMs: config.timeoutMs,
    apiKey: maskSecret(config.apiKey),
    headers: redactHeaders(headers),
    nodeMapping: config.nodeMapping,
  });

  return {
    name: "comfyui",
    async testConnection() {
      const startedAt = performance.now();
      const result = await fetchJson<Record<string, unknown>>(
        `${config.baseUrl}/system_stats`,
        {
          method: "GET",
          headers,
        },
        config.timeoutMs,
        {
          label: "comfyui:testConnection",
        },
      );
      logInfo("ComfyUI connectivity test passed", {
        elapsedMs: Math.round(performance.now() - startedAt),
      });
      return {
        ok: !!result,
        provider: "comfyui",
        latencyMs: Math.round(performance.now() - startedAt),
        message: "Connected to ComfyUI",
        details: "CORS check passed for /system_stats",
      };
    },
    async analyzeImage(input: AnalyzeInput) {
      logInfo("ComfyUI analyzeImage uses local fallback", {
        promptHint: input.userPrompt,
      });
      return createFallbackAnalysis(input);
    },
    async generateVariant(input: GenerateInput): Promise<GeneratedPayload> {
      logInfo("ComfyUI generation start", {
        variantId: input.variant.id,
        variantLabel: input.variant.label,
        seed: input.variant.seed,
      });
      const promptPayload = patchWorkflow(config.workflowTemplate, config, input);
      const promptResponse = await fetchJson<ComfyPromptResponse>(
        `${config.baseUrl}/prompt`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: promptPayload,
            client_id: "wallpaperduo-web",
          }),
        },
        config.timeoutMs,
        {
          label: "comfyui:submit-prompt",
        },
      ).catch((error) => {
        logError("ComfyUI prompt submission failed", {
          error: compactError(error),
          variantId: input.variant.id,
        });
        throw error;
      });
      logInfo("ComfyUI prompt submitted", {
        promptId: promptResponse.prompt_id,
        variantId: input.variant.id,
      });

      const imageMeta = await pollHistoryForImage(
        config.baseUrl,
        promptResponse.prompt_id,
        headers,
        config.timeoutMs,
      );

      const query = new URLSearchParams({
        filename: imageMeta.filename,
        subfolder: imageMeta.subfolder,
        type: imageMeta.type,
      });
      const viewUrl = `${config.baseUrl}/view?${query.toString()}`;
      logInfo("ComfyUI downloading image", {
        variantId: input.variant.id,
        viewUrl,
      });

      const blob = await downloadProviderImage({
        url: viewUrl,
        timeoutMs: config.timeoutMs,
        label: "comfyui:view-image",
        headers,
        preferLocalProxy: false,
        allowLocalProxyFallback: true,
      }).catch((error) => {
        logError("ComfyUI image download failed", {
          error: compactError(error),
          variantId: input.variant.id,
          viewUrl,
        });
        throw error;
      });
      logInfo("ComfyUI generation finished", {
        variantId: input.variant.id,
        bytes: blob.size,
      });

      return {
        blob,
        provider: "comfyui",
        source: "provider",
      };
    },
  };
};
