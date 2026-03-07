import { withTimeout } from "@/utils/error";
import {
  compactError,
  logError,
  logInfo,
  logWarn,
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
  preferLocalProxy?: boolean;
  allowLocalProxyFallback?: boolean;
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

const isLocalBrowser = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
};

const hasSensitiveHeaders = (headers?: HeadersInit): boolean => {
  if (!headers) {
    return false;
  }
  const normalized = new Headers(headers);
  return (
    normalized.has("Authorization") ||
    normalized.has("authorization") ||
    normalized.has("x-api-key") ||
    normalized.has("X-API-KEY")
  );
};

const buildProxyUrl = (remoteUrl: string): string =>
  `/api/image-proxy?url=${encodeURIComponent(remoteUrl)}`;

export const downloadProviderImage = async ({
  url,
  timeoutMs,
  label,
  headers,
  preferLocalProxy = false,
  allowLocalProxyFallback = true,
}: DownloadProviderImageInput): Promise<Blob> => {
  const local = isLocalBrowser();
  const absolute = /^https?:\/\//i.test(url);
  const canUseProxy = local && absolute && !hasSensitiveHeaders(headers);

  if (preferLocalProxy && canUseProxy) {
    const proxyUrl = buildProxyUrl(url);
    logInfo("Provider image download via local proxy (preferred)", {
      label,
      remoteUrl: url,
      proxyUrl,
    });
    return fetchBlob(proxyUrl, { method: "GET" }, timeoutMs, {
      label: `${label}:proxy-first`,
    });
  }

  try {
    return await fetchBlob(
      url,
      { method: "GET", headers },
      timeoutMs,
      { label: `${label}:direct` },
    );
  } catch (error) {
    if (!allowLocalProxyFallback || !canUseProxy) {
      throw error;
    }
    const proxyUrl = buildProxyUrl(url);
    logWarn("Provider image direct download failed, retrying via local proxy", {
      label,
      remoteUrl: url,
      proxyUrl,
      error: compactError(error),
    });
    return fetchBlob(proxyUrl, { method: "GET" }, timeoutMs, {
      label: `${label}:proxy-fallback`,
    });
  }
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

