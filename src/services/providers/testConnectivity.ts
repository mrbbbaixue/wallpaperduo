import { createProvider } from "@/services/providers";
import type { ProviderConfigRecord } from "@/types/provider";
import type { ProviderKind } from "@/types/domain";

export const testProviderConnectivity = async (
  provider: ProviderKind,
  configs: ProviderConfigRecord,
  passphrase?: string,
) => {
  const adapter = createProvider(provider, configs, passphrase);
  return adapter.testConnection();
};
