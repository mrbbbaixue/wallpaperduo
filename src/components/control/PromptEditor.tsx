import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  onPromptChange: (
    timeOfDay: TimeVariant,
    field: "prompt" | "negativePrompt",
    value: string,
  ) => void;
}

export const PromptEditor = ({ selectedSlots, prompts, onPromptChange }: PromptEditorProps) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const [activeSlot, setActiveSlot] = useState<TimeVariant | null>(selectedSlots[0] ?? null);

  if (selectedSlots.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        {isZh ? "请先选择要生成的版本。" : "Select at least one time variant first."}
      </p>
    );
  }

  const currentSlot =
    activeSlot && selectedSlots.includes(activeSlot) ? activeSlot : selectedSlots[0];

  return (
    <Tabs
      value={currentSlot}
      onValueChange={(value) => setActiveSlot(value as TimeVariant)}
      className="space-y-3"
    >
      {selectedSlots.length > 1 ? (
        <TabsList
          className="grid h-auto w-full gap-px rounded-none bg-border/70 p-px"
          style={{ gridTemplateColumns: `repeat(${selectedSlots.length}, minmax(0, 1fr))` }}
        >
          {selectedSlots.map((slot) => {
            const label = isZh ? timeLabels[slot].zh : timeLabels[slot].en;
            return (
              <TabsTrigger
                key={slot}
                value={slot}
                className="h-9 rounded-none bg-background px-2 text-xs data-[state=active]:shadow-none"
              >
                {label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      ) : null}

      {selectedSlots.map((slot) => {
        const entry = prompts.find((p) => p.timeOfDay === slot);
        const label = isZh ? timeLabels[slot].zh : timeLabels[slot].en;

        return (
          <TabsContent key={slot} value={slot} className="mt-0">
            <div className="space-y-3 rounded-none border border-border/70 bg-background/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">{label}</h4>
                <span className="text-xs text-muted-foreground">
                  {isZh ? "建议先微调主体与光照描述" : "Tweak subjects and lighting first"}
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isZh ? "提示词" : "Prompt"}
                </label>
                <textarea
                  className="min-h-28 w-full rounded-none border border-input bg-background/75 px-3 py-2.5 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  value={entry?.prompt ?? ""}
                  onChange={(e) => onPromptChange(slot, "prompt", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isZh ? "负面提示词" : "Negative prompt"}
                </label>
                <textarea
                  className="min-h-20 w-full rounded-none border border-input bg-background/75 px-3 py-2.5 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  value={entry?.negativePrompt ?? ""}
                  onChange={(e) => onPromptChange(slot, "negativePrompt", e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};
