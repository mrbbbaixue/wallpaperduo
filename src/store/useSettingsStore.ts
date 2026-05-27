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

interface GenerationSettings {
  concurrency: number;
  retries: number;
}

interface ExportSettings {
  defaultFileStem: string;
  autoAlign: boolean;
}

interface SettingsState {
  // UI 设置
  language: UiLanguage;
  themeMode: UiThemeMode;

  // Provider 配置（单一 Provider 模式）
  provider: ProviderConfig;

  // 提示词设置
  promptSettings: PromptSettings;

  // 生成设置
  generationSettings: GenerationSettings;

  // 导出设置
  exportSettings: ExportSettings;

  // Actions
  setLanguage: (language: UiLanguage) => void;
  setThemeMode: (themeMode: UiThemeMode) => void;
  setProvider: (provider: Partial<ProviderConfig>) => void;
  setPromptSettings: (patch: Partial<PromptSettings>) => void;
  setGenerationSettings: (patch: Partial<GenerationSettings>) => void;
  setExportSettings: (patch: Partial<ExportSettings>) => void;
}

type PersistedSettingsState = Pick<
  SettingsState,
  "language" | "themeMode" | "provider" | "promptSettings" | "generationSettings" | "exportSettings"
>;

const legacyPromptSettingsV1: PromptSettings = {
  analysisUserPrompt: "关注场景结构、关键主体、光照与时段线索，输出简洁稳定的结构化描述。",
  generationPrefix: "高质量壁纸，保留原始构图和主体位置。",
  defaultNegativePrompt: "blur, artifact, text, geometry shift, low quality",
};

const defaultPromptSettings: PromptSettings = {
  analysisUserPrompt:
    "分析这张参考壁纸时，优先锁定核心主体、主体轮廓、主构图、相机视角、背景主地标与天际线轮廓，并明确哪些元素只能随时间变化；输出稳定、简洁、适合做同构图时段变体的结构化描述。",
  generationPrefix:
    "高质量壁纸，参考图一致性优先，保持核心主体、主体轮廓、主构图、相机视角、背景主地标与天际线不变，只允许光照、天空、阴影、灯光和少量时间相关元素变化。",
  defaultNegativePrompt:
    "blur, artifact, text, low quality, subject replacement, composition change, camera shift, geometry drift, layout drift, skyline change, landmark deformation, building deformation, tower shape change, object removal, object addition",
};

const migratePromptSettings = (persisted?: Partial<PromptSettings>): PromptSettings => ({
  analysisUserPrompt:
    persisted?.analysisUserPrompt === undefined
      ? defaultPromptSettings.analysisUserPrompt
      : persisted.analysisUserPrompt === legacyPromptSettingsV1.analysisUserPrompt
        ? defaultPromptSettings.analysisUserPrompt
        : persisted.analysisUserPrompt,
  generationPrefix:
    persisted?.generationPrefix === undefined
      ? defaultPromptSettings.generationPrefix
      : persisted.generationPrefix === legacyPromptSettingsV1.generationPrefix
        ? defaultPromptSettings.generationPrefix
        : persisted.generationPrefix,
  defaultNegativePrompt:
    persisted?.defaultNegativePrompt === undefined
      ? defaultPromptSettings.defaultNegativePrompt
      : persisted.defaultNegativePrompt === legacyPromptSettingsV1.defaultNegativePrompt
        ? defaultPromptSettings.defaultNegativePrompt
        : persisted.defaultNegativePrompt,
});

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

const defaultGenerationSettings: GenerationSettings = {
  concurrency: 2,
  retries: 1,
};

const defaultExportSettings: ExportSettings = {
  defaultFileStem: "wallpaper",
  autoAlign: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "zh",
      themeMode: "system",
      provider: defaultProvider,
      promptSettings: defaultPromptSettings,
      generationSettings: defaultGenerationSettings,
      exportSettings: defaultExportSettings,

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
      setGenerationSettings: (patch) =>
        set((state) => ({
          generationSettings: { ...state.generationSettings, ...patch },
        })),
      setExportSettings: (patch) =>
        set((state) => ({
          exportSettings: { ...state.exportSettings, ...patch },
        })),
    }),
    {
      name: "wallpaperduo.settings.v2",
      version: 3,
      migrate: (persistedState, version) => {
        const currentState =
          persistedState && typeof persistedState === "object"
            ? (persistedState as Partial<PersistedSettingsState>)
            : undefined;

        // 从 v1 迁移：重置为默认配置
        if (version < 1) {
          return {
            language: currentState?.language ?? "zh",
            themeMode: currentState?.themeMode ?? "system",
            provider: defaultProvider,
            promptSettings: migratePromptSettings(currentState?.promptSettings),
            generationSettings: defaultGenerationSettings,
            exportSettings: defaultExportSettings,
          };
        }
        if (version < 2) {
          return {
            language: currentState?.language ?? "zh",
            themeMode: currentState?.themeMode ?? "system",
            provider: currentState?.provider ?? defaultProvider,
            promptSettings: migratePromptSettings(currentState?.promptSettings),
            generationSettings: defaultGenerationSettings,
            exportSettings: defaultExportSettings,
          };
        }
        return {
          language: currentState?.language ?? "zh",
          themeMode: currentState?.themeMode ?? "system",
          provider: currentState?.provider ?? defaultProvider,
          promptSettings: {
            ...defaultPromptSettings,
            ...currentState?.promptSettings,
          },
          generationSettings: {
            ...defaultGenerationSettings,
            ...currentState?.generationSettings,
          },
          exportSettings: {
            ...defaultExportSettings,
            ...currentState?.exportSettings,
          },
        };
      },
      partialize: (state) => ({
        language: state.language,
        themeMode: state.themeMode,
        provider: state.provider,
        promptSettings: state.promptSettings,
        generationSettings: state.generationSettings,
        exportSettings: state.exportSettings,
      }),
    }
  )
);
