import type { PreparedImage, SceneAnalysis } from "@/types/domain";
import type { ProviderConfig } from "@/types/provider";
import { toDataUrl } from "@/services/providers/http";
import { withTimeout } from "@/utils/error";

const API_TIMEOUT_MS = 120_000;

interface TestConnectionResult {
  ok: boolean;
  message: string;
}

const fetchJson = async <T>(input: RequestInfo, init: RequestInit, timeoutMs = API_TIMEOUT_MS) => {
  const response = await withTimeout(fetch(input, init), timeoutMs);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
};

export const testConnectionWithWorker = async (
  provider: ProviderConfig,
): Promise<TestConnectionResult> => {
  return fetchJson<TestConnectionResult>("/api/test-connection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider }),
  });
};

export const analyzePreparedImage = async (
  prepared: PreparedImage,
  provider: ProviderConfig,
  prompt?: string,
): Promise<SceneAnalysis> => {
  const image = await toDataUrl(prepared.blob);

  return fetchJson<SceneAnalysis>("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image,
      provider,
      prompt,
    }),
  });
};

export const generateImageWithWorker = async (input: {
  prepared: PreparedImage;
  provider: ProviderConfig;
  prompt: string;
  negativePrompt?: string;
}): Promise<Blob> => {
  const image = await toDataUrl(input.prepared.blob);
  const response = await withTimeout(
    fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        width: input.prepared.width,
        height: input.prepared.height,
        provider: input.provider,
      }),
    }),
    API_TIMEOUT_MS,
  );

  if (!response.ok) {
    const contentType = response.headers.get("Content-Type") ?? "";
    const message = contentType.includes("application/json")
      ? JSON.stringify(await response.json())
      : await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.blob();
};
