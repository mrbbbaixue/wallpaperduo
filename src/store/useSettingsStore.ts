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

type UiLanguage = "en" | "zh";
type UiThemeMode = "light" | "dark";

interface PromptSettings {
  analysisUserPrompt: string;
  generationPrefix: string;
  defaultNegativePrompt: string;
}

interface SettingsState {
  language: UiLanguage;
  themeMode: UiThemeMode;
  selectedProvider: ProviderKind;
  analysisProvider: ProviderKind;
  generationProvider: ProviderKind;
  providers: ProviderConfigRecord;
  promptSettings: PromptSettings;
  heicExperimentalEnabled: boolean;
  localFallbackEnabled: boolean;
  lastConnectivity: Partial<Record<ProviderKind, ConnectivityResult>>;
  setLanguage: (language: UiLanguage) => void;
  setThemeMode: (themeMode: UiThemeMode) => void;
  setSelectedProvider: (provider: ProviderKind) => void;
  setAnalysisProvider: (provider: ProviderKind) => void;
  setGenerationProvider: (provider: ProviderKind) => void;
  setProviderConfig: (provider: ProviderKind, patch: Partial<ProviderConfig>) => void;
  setComfyNodeMapping: (patch: Partial<ComfyProviderConfig["nodeMapping"]>) => void;
  setComfyWorkflowTemplate: (template: string) => void;
  setPromptSettings: (patch: Partial<PromptSettings>) => void;
  setConnectivityResult: (provider: ProviderKind, result: ConnectivityResult) => void;
  setHeicExperimentalEnabled: (enabled: boolean) => void;
  setLocalFallbackEnabled: (enabled: boolean) => void;
}

const getDefaultArkBaseUrl = (): string => {
  return "https://ark.cn-beijing.volces.com/api/v3";
};

const createDefaultProviders = (): ProviderConfigRecord => ({
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "",
    model: "google/gemini-2.5-flash-image-preview",
    visionModel: "google/gemini-2.5-flash",
    timeoutMs: 60000,
    concurrency: 2,
    extraHeaders: '{"HTTP-Referer":"https://example.com","X-Title":"WallpaperDuo"}',
  },
  ark: {
    baseUrl: getDefaultArkBaseUrl(),
    apiKey: "",
    model: "doubao-seedream-5-0-260128",
    visionModel: "doubao-seed-2-0-mini-260215",
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

const defaultPromptSettings: PromptSettings = {
  analysisUserPrompt: "关注场景结构、关键主体、光照与时段线索，输出简洁稳定的结构化描述。",
  generationPrefix: "高质量壁纸，保留原始构图和主体位置。",
  defaultNegativePrompt: "blur, artifact, text, geometry shift, low quality",
};

const sanitizeLegacyApiKey = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.startsWith("enc::") ? "" : value;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "zh",
      themeMode: "light",
      selectedProvider: "openrouter",
      analysisProvider: "openrouter",
      generationProvider: "openrouter",
      providers: createDefaultProviders(),
      promptSettings: defaultPromptSettings,
      heicExperimentalEnabled: false,
      localFallbackEnabled: true,
      lastConnectivity: {},
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
      setAnalysisProvider: (analysisProvider) => set({ analysisProvider }),
      setGenerationProvider: (generationProvider) => set({ generationProvider }),
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
      setPromptSettings: (patch) =>
        set((state) => ({
          promptSettings: {
            ...state.promptSettings,
            ...patch,
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
    }),
    {
      name: "wallpaperduo.settings.v1",
      version: 4,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState;
        }

        const state = persistedState as {
          selectedProvider?: ProviderKind;
          analysisProvider?: ProviderKind;
          generationProvider?: ProviderKind;
          providers?: {
            ark?: {
              baseUrl?: string;
            };
          };
          promptSettings?: Partial<PromptSettings>;
        };

        let nextState: typeof state = { ...state };

        if (version < 2) {
          const currentArkBaseUrl = state.providers?.ark?.baseUrl;
          if (currentArkBaseUrl === "https://ark.cn-beijing.volces.com/api/v3") {
            const nextArkBaseUrl = getDefaultArkBaseUrl();
            nextState = {
              ...nextState,
              providers: {
                ...nextState.providers,
                ark: {
                  ...nextState.providers?.ark,
                  baseUrl: nextArkBaseUrl,
                },
              },
            };
          }
        }

        if (version < 3) {
          const legacyProvider = state.selectedProvider ?? "openrouter";
          const legacyProviders = (nextState as { providers?: Record<string, unknown> }).providers;
          const patchedProviders = legacyProviders
            ? {
                ...legacyProviders,
                openrouter: legacyProviders.openrouter
                  ? {
                      ...(legacyProviders.openrouter as Record<string, unknown>),
                      apiKey: sanitizeLegacyApiKey(
                        (legacyProviders.openrouter as Record<string, unknown>).apiKey,
                      ),
                    }
                  : legacyProviders.openrouter,
                ark: legacyProviders.ark
                  ? {
                      ...(legacyProviders.ark as Record<string, unknown>),
                      apiKey: sanitizeLegacyApiKey(
                        (legacyProviders.ark as Record<string, unknown>).apiKey,
                      ),
                    }
                  : legacyProviders.ark,
                comfyui: legacyProviders.comfyui
                  ? {
                      ...(legacyProviders.comfyui as Record<string, unknown>),
                      apiKey: sanitizeLegacyApiKey(
                        (legacyProviders.comfyui as Record<string, unknown>).apiKey,
                      ),
                    }
                  : legacyProviders.comfyui,
              }
            : undefined;

          nextState = {
            ...nextState,
            providers: patchedProviders as typeof state.providers,
            analysisProvider: state.analysisProvider ?? legacyProvider,
            generationProvider: state.generationProvider ?? legacyProvider,
            promptSettings: {
              ...defaultPromptSettings,
              ...(state.promptSettings ?? {}),
            },
          };
        }

        return nextState;
      },
      partialize: (state) => ({
        language: state.language,
        themeMode: state.themeMode,
        selectedProvider: state.selectedProvider,
        analysisProvider: state.analysisProvider,
        generationProvider: state.generationProvider,
        providers: state.providers,
        promptSettings: state.promptSettings,
        heicExperimentalEnabled: state.heicExperimentalEnabled,
        localFallbackEnabled: state.localFallbackEnabled,
      }),
    },
  ),
);
