import { createArkProvider } from "@/services/providers/arkProvider";
import { createAliyunProvider } from "@/services/providers/aliyunProvider";
import { createComfyUiProvider } from "@/services/providers/comfyuiProvider";
import { createOpenRouterProvider } from "@/services/providers/openrouterProvider";
import type { ImageProvider } from "@/types/provider";
import type { ProviderConfigRecord } from "@/types/provider";
import type { ProviderKind } from "@/types/domain";
import { logInfo } from "@/utils/debugLog";

export const createProvider = (
  provider: ProviderKind,
  configs: ProviderConfigRecord,
): ImageProvider => {
  logInfo("Creating provider adapter", {
    provider,
    baseUrl: configs[provider].baseUrl,
    model: configs[provider].model,
  });
  if (provider === "openrouter") {
    return createOpenRouterProvider({
      ...configs.openrouter,
      apiKey: configs.openrouter.apiKey,
    });
  }

  if (provider === "ark") {
    return createArkProvider({
      ...configs.ark,
      apiKey: configs.ark.apiKey,
    });
  }

  if (provider === "aliyun") {
    return createAliyunProvider({
      ...configs.aliyun,
      apiKey: configs.aliyun.apiKey,
    });
  }

  return createComfyUiProvider({
    ...configs.comfyui,
    apiKey: configs.comfyui.apiKey,
  });
};
