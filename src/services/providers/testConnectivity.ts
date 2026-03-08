import { createProvider } from "@/services/providers";
import type { ProviderConfigRecord } from "@/types/provider";
import type { ProviderKind } from "@/types/domain";

export const testProviderConnectivity = async (
  provider: ProviderKind,
  configs: ProviderConfigRecord,
) => {
  const adapter = createProvider(provider, configs);
  return adapter.testConnection();
};
