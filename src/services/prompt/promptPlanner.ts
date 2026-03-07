import type {
  PromptPlan,
  PromptVariant,
  SceneAnalysis,
  TimeVariant,
  ThemeVariant,
} from "@/types/domain";
import { createId } from "@/utils/id";

interface PromptPlannerInput {
  analysis: SceneAnalysis;
  basePrompt: string;
  userOverlayPrompt: string;
  localChanges: string;
}

const timeLabels: Record<TimeVariant, { zh: string; en: string }> = {
  dawn: { zh: "晨光", en: "dawn" },
  day: { zh: "白天", en: "day" },
  dusk: { zh: "黄昏", en: "dusk" },
  night: { zh: "夜晚", en: "night" },
};

const themeLabels: Record<ThemeVariant, { zh: string; en: string }> = {
  dark: { zh: "深色", en: "dark" },
  light: { zh: "浅色", en: "light" },
};

const timeStylePrompt: Record<TimeVariant, string> = {
  dawn: "soft sunrise highlights, long ambient shadows, subtle morning haze",
  day: "clean daylight, natural sky, balanced high-frequency details",
  dusk: "golden-hour glows, warm sun rim, cinematic sunset transitions",
  night: "moonlit contrast, calm deep shadows, restrained practical lights",
};

const themeStylePrompt: Record<ThemeVariant, string> = {
  dark: "dark-mode wallpaper aesthetics, lower luminance, rich contrast, controlled saturation",
  light: "light-mode wallpaper aesthetics, bright tones, clean whites, open ambience",
};

const themeNegativePrompt: Record<ThemeVariant, string> = {
  dark: "overexposed, washed out highlights, flat daylight",
  light: "underexposed, crushed shadows, heavy noise, muddy blacks",
};

const buildVariants = (input: PromptPlannerInput): PromptVariant[] => {
  const variants: PromptVariant[] = [];
  const times: TimeVariant[] = ["dawn", "day", "dusk", "night"];
  const themes: ThemeVariant[] = ["dark", "light"];

  for (const timeOfDay of times) {
    for (const theme of themes) {
      const label = `${timeLabels[timeOfDay].zh}/${themeLabels[theme].zh}`;
      const seed = Math.floor(Math.random() * 1_000_000_000);
      const prompt = [
        input.basePrompt || "high quality wallpaper art",
        `Scene summary: ${input.analysis.summary}`,
        `Subjects: ${input.analysis.subjects.join(", ")}`,
        `Foreground focus: ${input.analysis.foreground.join(", ")}`,
        `Background focus: ${input.analysis.background.join(", ")}`,
        themeStylePrompt[theme],
        timeStylePrompt[timeOfDay],
        input.userOverlayPrompt,
        `Must preserve composition and object positions.`,
        `Local temporal changes: ${input.localChanges || "none"}`,
      ]
        .filter(Boolean)
        .join(", ");

      variants.push({
        id: createId(`variant_${timeOfDay}_${theme}`),
        label,
        theme,
        timeOfDay,
        prompt,
        negativePrompt: `${themeNegativePrompt[theme]}, geometry drift, object position shift, text artifacts`,
        seed,
      });
    }
  }

  return variants;
};

export const buildPromptPlan = (input: PromptPlannerInput): PromptPlan => ({
  generatedAt: new Date().toISOString(),
  basePrompt: input.basePrompt,
  userOverlayPrompt: input.userOverlayPrompt,
  localChanges: input.localChanges,
  variants: buildVariants(input),
});
