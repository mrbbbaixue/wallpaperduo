import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ProviderConfig } from "@/types/provider";
import { PROVIDER_TEMPLATES } from "@/types/provider";

type UiLanguage = "en" | "zh";
type UiThemeMode = "light" | "dark" | "system";

interface PromptSettings {
  analysisUserPrompt: string;
  generationPrefix: string;
  defaultNegativePrompt: string;
}

interface SettingsState {
  // UI 设置
  language: UiLanguage;
  themeMode: UiThemeMode;

  // Provider 配置（单一 Provider 模式）
  provider: ProviderConfig;

  // 提示词设置
  promptSettings: PromptSettings;

  // Actions
  setLanguage: (language: UiLanguage) => void;
  setThemeMode: (themeMode: UiThemeMode) => void;
  setProvider: (provider: Partial<ProviderConfig>) => void;
  setPromptSettings: (patch: Partial<PromptSettings>) => void;
}

const defaultPromptSettings: PromptSettings = {
  analysisUserPrompt: "关注场景结构、关键主体、光照与时段线索，输出简洁稳定的结构化描述。",
  generationPrefix: "高质量壁纸，保留原始构图和主体位置。",
  defaultNegativePrompt: "blur, artifact, text, geometry shift, low quality",
};

// 默认使用 OpenRouter
const defaultTemplate = PROVIDER_TEMPLATES.find((t) => t.id === "openrouter")!;

const defaultProvider: ProviderConfig = {
  templateId: defaultTemplate.id,
  baseUrl: defaultTemplate.baseUrl,
  apiKey: "",
  model: defaultTemplate.defaultModel,
  visionModel: defaultTemplate.defaultVisionModel,
  generateUrl: defaultTemplate.generateUrl,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "zh",
      themeMode: "system",
      provider: defaultProvider,
      promptSettings: defaultPromptSettings,

      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setProvider: (patch) =>
        set((state) => ({
          provider: { ...state.provider, ...patch },
        })),
      setPromptSettings: (patch) =>
        set((state) => ({
          promptSettings: { ...state.promptSettings, ...patch },
        })),
    }),
    {
      name: "wallpaperduo.settings.v2",
      version: 1,
      migrate: (persistedState, version) => {
        // 从 v1 迁移：重置为默认配置
        if (version < 1) {
          return {
            ...persistedState,
            provider: defaultProvider,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        language: state.language,
        themeMode: state.themeMode,
        provider: state.provider,
        promptSettings: state.promptSettings,
      }),
    }
  )
);