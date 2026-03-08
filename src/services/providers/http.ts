import { withTimeout } from "@/utils/error";
import {
  compactError,
  logError,
  logInfo,
  redactHeaders,
  shortText,
} from "@/utils/debugLog";

interface RequestDebugMeta {
  label?: string;
}

interface DownloadProviderImageInput {
  url: string;
  timeoutMs: number;
  label: string;
  headers?: HeadersInit;
}

export const parseExtraHeaders = (raw: string): Record<string, string> => {
  try {
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return Object.fromEntries(
      Object.entries(parsed ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
};

export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  meta?: RequestDebugMeta,
): Promise<T> => {
  const requestUrl = typeof input === "string" ? input : input.toString();
  const startedAt = performance.now();
  logInfo(`HTTP JSON request -> ${meta?.label ?? ""}`.trim(), {
    url: requestUrl,
    method: init.method ?? "GET",
    timeoutMs,
    headers: redactHeaders(init.headers),
  });

  const response = await withTimeout(fetch(input, init), timeoutMs).catch((error) => {
    logError(`HTTP JSON network failure <- ${meta?.label ?? ""}`.trim(), {
      url: requestUrl,
      method: init.method ?? "GET",
      error: compactError(error),
      elapsedMs: Math.round(performance.now() - startedAt),
    });
    throw error;
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const body = contentType.includes("application/json")
      ? JSON.stringify(await response.json())
      : await response.text();
    logError(`HTTP JSON bad status <- ${meta?.label ?? ""}`.trim(), {
      url: requestUrl,
      method: init.method ?? "GET",
      status: response.status,
      elapsedMs: Math.round(performance.now() - startedAt),
      body: shortText(body),
    });
    throw new Error(`${response.status} ${body}`);
  }

  logInfo(`HTTP JSON success <- ${meta?.label ?? ""}`.trim(), {
    url: requestUrl,
    method: init.method ?? "GET",
    status: response.status,
    elapsedMs: Math.round(performance.now() - startedAt),
  });

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return undefined as T;
};

export const fetchBlob = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  meta?: RequestDebugMeta,
): Promise<Blob> => {
  const requestUrl = typeof input === "string" ? input : input.toString();
  const startedAt = performance.now();
  logInfo(`HTTP Blob request -> ${meta?.label ?? ""}`.trim(), {
    url: requestUrl,
    method: init.method ?? "GET",
    timeoutMs,
    headers: redactHeaders(init.headers),
  });

  const response = await withTimeout(fetch(input, init), timeoutMs).catch((error) => {
    logError(`HTTP Blob network failure <- ${meta?.label ?? ""}`.trim(), {
      url: requestUrl,
      method: init.method ?? "GET",
      error: compactError(error),
      elapsedMs: Math.round(performance.now() - startedAt),
    });
    throw error;
  });

  if (!response.ok) {
    const body = await response.text();
    logError(`HTTP Blob bad status <- ${meta?.label ?? ""}`.trim(), {
      url: requestUrl,
      method: init.method ?? "GET",
      status: response.status,
      elapsedMs: Math.round(performance.now() - startedAt),
      body: shortText(body),
    });
    throw new Error(`${response.status} ${body}`);
  }
  logInfo(`HTTP Blob success <- ${meta?.label ?? ""}`.trim(), {
    url: requestUrl,
    method: init.method ?? "GET",
    status: response.status,
    elapsedMs: Math.round(performance.now() - startedAt),
  });
  return response.blob();
};

export const downloadProviderImage = async ({
  url,
  timeoutMs,
  label,
  headers,
}: DownloadProviderImageInput): Promise<Blob> => {
  return fetchBlob(url, { method: "GET", headers }, timeoutMs, { label: `${label}:direct` });
};

export const toDataUrl = async (blob: Blob): Promise<string> => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const decodeBase64Image = (raw: string): Blob => {
  const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: "image/png" });
};

