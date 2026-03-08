import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { runGenerationQueue } from "@/services/generation/generationQueue";
import { createProvider } from "@/services/providers";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import type { GenerationTask, TimeVariant } from "@/types/domain";
import { createId } from "@/utils/id";
import { toUserError } from "@/utils/error";

interface PromptEntry {
  timeOfDay: TimeVariant;
  prompt: string;
  negativePrompt: string;
}

interface GenerateControlsProps {
  selectedSlots: TimeVariant[];
  prompts: PromptEntry[];
  onPreprocess: () => Promise<void>;
  preprocessLoading: boolean;
}

export const GenerateControls = ({
  selectedSlots,
  prompts,
  onPreprocess,
  preprocessLoading,
}: GenerateControlsProps) => {
  const { t } = useTranslation();
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const setTasks = useWorkflowStore((s) => s.setTasks);
  const updateTask = useWorkflowStore((s) => s.updateTask);
  const generationProvider = useSettingsStore((s) => s.generationProvider);
  const providers = useSettingsStore((s) => s.providers);
  const promptSettings = useSettingsStore((s) => s.promptSettings);
  const localFallbackEnabled = useSettingsStore((s) => s.localFallbackEnabled);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const onGenerate = async () => {
    if (!preparedImage) {
      setError(t("workspace.needPrepared"));
      return;
    }
    if (selectedSlots.length === 0) {
      setError("SELECT_SLOT_REQUIRED");
      return;
    }

    const newTasks: GenerationTask[] = selectedSlots.map((slot) => {
      const entry = prompts.find((p) => p.timeOfDay === slot);
      return {
        id: createId("gen"),
        label: slot,
        theme: "dark" as const,
        timeOfDay: slot,
        prompt: entry?.prompt ?? "",
        negativePrompt: entry?.negativePrompt ?? promptSettings.defaultNegativePrompt,
        seed: Math.floor(Math.random() * 100000000),
        status: "idle" as const,
        progress: 0,
      };
    });

    try {
      setGenerating(true);
      setError("");
      const existingTasks = useWorkflowStore.getState().tasks;
      setTasks([...existingTasks, ...newTasks]);

      const provider = createProvider(generationProvider, providers);
      const concurrency = Math.max(1, providers[generationProvider].concurrency || 1);
      const completed = await runGenerationQueue({
        provider,
        prepared: preparedImage,
        tasks: newTasks,
        concurrency,
        retries: 1,
        localFallback: localFallbackEnabled,
        onTaskUpdate: (taskId, patch) => updateTask(taskId, patch),
      });

      const completedById = new Map(completed.map((task) => [task.id, task]));
      const latestTasks = useWorkflowStore.getState().tasks;
      setTasks(latestTasks.map((task) => completedById.get(task.id) ?? task));
    } catch (exception) {
      setError(toUserError(exception));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">
        {t("settings.generationSection")}
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PsychologyRoundedIcon />}
          onClick={() => void onPreprocess()}
          disabled={!preparedImage || preprocessLoading}
        >
          {preprocessLoading
            ? t("common.loading")
            : t("prompts.analyze")}
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<AutoAwesomeRoundedIcon />}
          onClick={() => void onGenerate()}
          disabled={!preparedImage || generating || selectedSlots.length === 0}
        >
          {generating ? t("common.loading") : t("common.generate")}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {t("settings.generationProvider")}: {generationProvider}
      </Typography>

      {error && <Alert severity="error" sx={{ py: 0 }}>{t(`errors.${error}`, error)}</Alert>}
    </Stack>
  );
};
