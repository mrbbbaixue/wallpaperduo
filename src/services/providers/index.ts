import { createArkProvider } from "@/services/providers/arkProvider";
import { createComfyUiProvider } from "@/services/providers/comfyuiProvider";
import { createOpenRouterProvider } from "@/services/providers/openrouterProvider";
import type { ImageProvider } from "@/types/provider";
import type { ProviderConfigRecord } from "@/types/provider";
import type { ProviderKind } from "@/types/domain";
import { logInfo } from "@/utils/debugLog";
import { decryptSecret, isEncryptedSecret } from "@/utils/crypto";

const resolveSecret = (raw: string, passphrase?: string): string => {
  if (!raw) {
    return "";
  }
  if (!isEncryptedSecret(raw)) {
    return raw;
  }
  if (!passphrase) {
    throw new Error("PASSCODE_INVALID");
  }
  return decryptSecret(raw, passphrase);
};

export const createProvider = (
  provider: ProviderKind,
  configs: ProviderConfigRecord,
  passphrase?: string,
): ImageProvider => {
  logInfo("Creating provider adapter", {
    provider,
    hasPassphrase: Boolean(passphrase),
    baseUrl: configs[provider].baseUrl,
    model: configs[provider].model,
  });
  if (provider === "openrouter") {
    return createOpenRouterProvider({
      ...configs.openrouter,
      apiKey: resolveSecret(configs.openrouter.apiKey, passphrase),
    });
  }

  if (provider === "ark") {
    return createArkProvider({
      ...configs.ark,
      apiKey: resolveSecret(configs.ark.apiKey, passphrase),
    });
  }

  return createComfyUiProvider({
    ...configs.comfyui,
    apiKey: resolveSecret(configs.comfyui.apiKey, passphrase),
  });
};
