import { compactError, logWarn } from "@/utils/debugLog";

export const toUserError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  let mapped: string;

  if (/not available in your region|region restricted|geo.?blocked|地区|地域/i.test(message)) {
    mapped = "REGION_RESTRICTED";
    logWarn("Mapped provider error", { raw: compactError(error), mapped });
    return mapped;
  }
  if (/Failed to fetch|NetworkError|Network request failed/i.test(message)) {
    mapped = "NETWORK_OR_CORS";
    logWarn("Mapped provider error", { raw: compactError(error), mapped });
    return mapped;
  }
  if (/401|Unauthorized|invalid_api_key/i.test(message)) {
    mapped = "AUTH_ERROR";
    logWarn("Mapped provider error", { raw: compactError(error), mapped });
    return mapped;
  }
  if (/403|forbidden|permission denied/i.test(message)) {
    mapped = "PERMISSION_DENIED";
    logWarn("Mapped provider error", { raw: compactError(error), mapped });
    return mapped;
  }
  if (/429|rate limit|quota/i.test(message)) {
    mapped = "QUOTA_LIMIT";
    logWarn("Mapped provider error", { raw: compactError(error), mapped });
    return mapped;
  }
  if (/timeout/i.test(message)) {
    mapped = "TIMEOUT";
    logWarn("Mapped provider error", { raw: compactError(error), mapped });
    return mapped;
  }
  if (/PASSCODE_INVALID/.test(message)) {
    mapped = "PASSCODE_INVALID";
    logWarn("Mapped provider error", { raw: compactError(error), mapped });
    return mapped;
  }
  mapped = message || "UNKNOWN_ERROR";
  logWarn("Mapped provider error", { raw: compactError(error), mapped });
  return mapped;
};

export const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};
