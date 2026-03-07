import { create } from "zustand";
import { persist } from "zustand/middleware";

import { defaultComfyWorkflowTemplate } from "@/data/defaultWorkflowTemplate";
import type {
  ComfyProviderConfig,
  ConnectivityResult,
  ProviderConfig,
  ProviderConfigRecord,
} from "@/types/provider";
import type { ProviderKind } from "@/types/domain";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "@/utils/crypto";

type UiLanguage = "en" | "zh";
type UiThemeMode = "light" | "dark";

interface SettingsState {
  language: UiLanguage;
  themeMode: UiThemeMode;
  selectedProvider: ProviderKind;
  providers: ProviderConfigRecord;
  heicExperimentalEnabled: boolean;
  localFallbackEnabled: boolean;
  keysEncrypted: boolean;
  lastConnectivity: Partial<Record<ProviderKind, ConnectivityResult>>;
  setLanguage: (language: UiLanguage) => void;
  setThemeMode: (themeMode: UiThemeMode) => void;
  setSelectedProvider: (provider: ProviderKind) => void;
  setProviderConfig: (provider: ProviderKind, patch: Partial<ProviderConfig>) => void;
  setComfyNodeMapping: (patch: Partial<ComfyProviderConfig["nodeMapping"]>) => void;
  setComfyWorkflowTemplate: (template: string) => void;
  setConnectivityResult: (provider: ProviderKind, result: ConnectivityResult) => void;
  setHeicExperimentalEnabled: (enabled: boolean) => void;
  setLocalFallbackEnabled: (enabled: boolean) => void;
  encryptAllKeys: (passphrase: string) => void;
  decryptAllKeys: (passphrase: string) => void;
  resolveApiKey: (provider: ProviderKind, passphrase?: string) => string;
}

const getDefaultArkBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return "https://ark.cn-beijing.volces.com/api/v3";
  }
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "/api/ark";
  }
  return "https://ark.cn-beijing.volces.com/api/v3";
};

const createDefaultProviders = (): ProviderConfigRecord => ({
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "",
    model: "google/gemini-2.5-flash-image-preview",
    timeoutMs: 60000,
    concurrency: 2,
    extraHeaders: '{"HTTP-Referer":"https://example.com","X-Title":"WallpaperDuo"}',
  },
  ark: {
    baseUrl: getDefaultArkBaseUrl(),
    apiKey: "",
    model: "doubao-seedream-5-0-260128",
    timeoutMs: 60000,
    concurrency: 2,
    extraHeaders: "{}",
  },
  comfyui: {
    baseUrl: "http://127.0.0.1:8188",
    apiKey: "",
    model: "comfyui-local",
    timeoutMs: 120000,
    concurrency: 1,
    extraHeaders: "{}",
    workflowTemplate: defaultComfyWorkflowTemplate,
    nodeMapping: {
      positivePromptNodeId: "1",
      negativePromptNodeId: "2",
      seedNodeId: "3",
      widthNodeId: "5",
      heightNodeId: "5",
      inputImageNodeId: "",
      timeVariableNodeId: "",
    },
  },
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: "zh",
      themeMode: "light",
      selectedProvider: "openrouter",
      providers: createDefaultProviders(),
      heicExperimentalEnabled: false,
      localFallbackEnabled: true,
      keysEncrypted: false,
      lastConnectivity: {},
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
      setProviderConfig: (provider, patch) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], ...patch },
          },
        })),
      setComfyNodeMapping: (patch) =>
        set((state) => ({
          providers: {
            ...state.providers,
            comfyui: {
              ...state.providers.comfyui,
              nodeMapping: { ...state.providers.comfyui.nodeMapping, ...patch },
            },
          },
        })),
      setComfyWorkflowTemplate: (workflowTemplate) =>
        set((state) => ({
          providers: {
            ...state.providers,
            comfyui: { ...state.providers.comfyui, workflowTemplate },
          },
        })),
      setConnectivityResult: (provider, result) =>
        set((state) => ({
          lastConnectivity: {
            ...state.lastConnectivity,
            [provider]: result,
          },
        })),
      setHeicExperimentalEnabled: (heicExperimentalEnabled) => set({ heicExperimentalEnabled }),
      setLocalFallbackEnabled: (localFallbackEnabled) => set({ localFallbackEnabled }),
      encryptAllKeys: (passphrase) => {
        if (!passphrase.trim()) {
          throw new Error("PASSCODE_INVALID");
        }
        set((state) => ({
          keysEncrypted: true,
          providers: {
            openrouter: {
              ...state.providers.openrouter,
              apiKey: encryptSecret(state.providers.openrouter.apiKey, passphrase),
            },
            ark: {
              ...state.providers.ark,
              apiKey: encryptSecret(state.providers.ark.apiKey, passphrase),
            },
            comfyui: {
              ...state.providers.comfyui,
              apiKey: encryptSecret(state.providers.comfyui.apiKey, passphrase),
            },
          },
        }));
      },
      decryptAllKeys: (passphrase) => {
        if (!passphrase.trim()) {
          throw new Error("PASSCODE_INVALID");
        }
        set((state) => ({
          keysEncrypted: false,
          providers: {
            openrouter: {
              ...state.providers.openrouter,
              apiKey: decryptSecret(state.providers.openrouter.apiKey, passphrase),
            },
            ark: {
              ...state.providers.ark,
              apiKey: decryptSecret(state.providers.ark.apiKey, passphrase),
            },
            comfyui: {
              ...state.providers.comfyui,
              apiKey: decryptSecret(state.providers.comfyui.apiKey, passphrase),
            },
          },
        }));
      },
      resolveApiKey: (provider, passphrase) => {
        const secret = get().providers[provider].apiKey;
        if (!secret) {
          return "";
        }
        if (!isEncryptedSecret(secret)) {
          return secret;
        }
        if (!passphrase) {
          throw new Error("PASSCODE_INVALID");
        }
        return decryptSecret(secret, passphrase);
      },
    }),
    {
      name: "wallpaperduo.settings.v1",
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState;
        }
        if (version >= 2) {
          return persistedState;
        }

        const state = persistedState as {
          providers?: {
            ark?: {
              baseUrl?: string;
            };
          };
        };

        const currentArkBaseUrl = state.providers?.ark?.baseUrl;
        if (currentArkBaseUrl === "https://ark.cn-beijing.volces.com/api/v3") {
          const nextArkBaseUrl = getDefaultArkBaseUrl();
          return {
            ...state,
            providers: {
              ...state.providers,
              ark: {
                ...state.providers?.ark,
                baseUrl: nextArkBaseUrl,
              },
            },
          };
        }

        return persistedState;
      },
      partialize: (state) => ({
        language: state.language,
        themeMode: state.themeMode,
        selectedProvider: state.selectedProvider,
        providers: state.providers,
        heicExperimentalEnabled: state.heicExperimentalEnabled,
        localFallbackEnabled: state.localFallbackEnabled,
        keysEncrypted: state.keysEncrypted,
      }),
    },
  ),
);
