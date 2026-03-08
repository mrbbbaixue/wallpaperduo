import { Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import type { TimeVariant } from "@/types/domain";

const timeLabels: Record<TimeVariant, { zh: string; en: string }> = {
  dawn: { zh: "晨", en: "Dawn" },
  day: { zh: "昼", en: "Day" },
  dusk: { zh: "昏", en: "Dusk" },
  night: { zh: "夜", en: "Night" },
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
      <Typography variant="body2" color="text.secondary">
        {isZh ? "请先选择要生成的版本" : "Please select versions to generate"}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        {isZh ? "提示词编辑器" : "Prompt Editor"}
      </Typography>
      {selectedSlots.map((slot) => {
        const entry = prompts.find((p) => p.timeOfDay === slot);
        const label = isZh ? timeLabels[slot].zh : timeLabels[slot].en;
        return (
          <Stack key={slot} spacing={1}>
            <Typography variant="body2" fontWeight={600}>
              {label}
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={6}
              size="small"
              label={isZh ? "提示词" : "Prompt"}
              value={entry?.prompt ?? ""}
              onChange={(e) => onPromptChange(slot, "prompt", e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={1}
              maxRows={3}
              size="small"
              label={isZh ? "负面提示词" : "Negative Prompt"}
              value={entry?.negativePrompt ?? ""}
              onChange={(e) => onPromptChange(slot, "negativePrompt", e.target.value)}
            />
          </Stack>
        );
      })}
    </Stack>
  );
};
