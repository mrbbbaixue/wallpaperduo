import { useTranslation } from "react-i18next";

import type { TimeVariant } from "@/types/domain";

const timeLabels: Record<TimeVariant, { zh: string; en: string }> = {
  dawn: { zh: "晨光", en: "Dawn" },
  day: { zh: "白天", en: "Day" },
  dusk: { zh: "黄昏", en: "Dusk" },
  night: { zh: "夜晚", en: "Night" },
};

interface PromptEntry {
  timeOfDay: TimeVariant;
  prompt: string;
  negativePrompt: string;
}

interface PromptEditorProps {
  selectedSlots: TimeVariant[];
  prompts: PromptEntry[];
  onPromptChange: (timeOfDay: TimeVariant, field: "prompt" | "negativePrompt", value: string) => void;
}

export const PromptEditor = ({ selectedSlots, prompts, onPromptChange }: PromptEditorProps) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  if (selectedSlots.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        {isZh ? "请先选择要生成的版本。" : "Select at least one time variant first."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {selectedSlots.map((slot) => {
        const entry = prompts.find((p) => p.timeOfDay === slot);
        const label = isZh ? timeLabels[slot].zh : timeLabels[slot].en;

        return (
          <div key={slot} className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
            <h4 className="text-sm font-semibold">{label}</h4>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                {isZh ? "提示词" : "Prompt"}
              </label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={entry?.prompt ?? ""}
                onChange={(e) => onPromptChange(slot, "prompt", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                {isZh ? "负面提示词" : "Negative prompt"}
              </label>
              <textarea
                className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={entry?.negativePrompt ?? ""}
                onChange={(e) => onPromptChange(slot, "negativePrompt", e.target.value)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
