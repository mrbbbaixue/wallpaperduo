const PREFIX = "[wallpaperduo]";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const maskSecret = (secret: string): string => {
  if (!secret) {
    return "";
  }
  const trimmed = secret.trim();
  if (trimmed.length <= 8) {
    return "*".repeat(trimmed.length);
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
};

export const redactHeaders = (headers: HeadersInit | undefined): Record<string, string> => {
  if (!headers) {
    return {};
  }

  const normalized = new Headers(headers);
  const result: Record<string, string> = {};

  normalized.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower.includes("authorization") || lower.includes("api-key") || lower.includes("x-api-key")) {
      result[key] = maskSecret(value);
      return;
    }
    result[key] = value;
  });

  return result;
};

export const compactError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const shortText = (value: string, maxLength = 480): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...(truncated)`;
};

export const safeJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => safeJson(item));
  }
  if (!isObject(value)) {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (lower.includes("authorization") || lower.includes("apikey") || lower.includes("api_key")) {
      output[key] = typeof raw === "string" ? maskSecret(raw) : "***";
      continue;
    }
    output[key] = safeJson(raw);
  }
  return output;
};

export const logInfo = (message: string, payload?: unknown) => {
  if (payload === undefined) {
    console.info(`${PREFIX} ${message}`);
    return;
  }
  console.info(`${PREFIX} ${message}`, safeJson(payload));
};

export const logWarn = (message: string, payload?: unknown) => {
  if (payload === undefined) {
    console.warn(`${PREFIX} ${message}`);
    return;
  }
  console.warn(`${PREFIX} ${message}`, safeJson(payload));
};

export const logError = (message: string, payload?: unknown) => {
  if (payload === undefined) {
    console.error(`${PREFIX} ${message}`);
    return;
  }
  console.error(`${PREFIX} ${message}`, safeJson(payload));
};
