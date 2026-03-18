import { ScanSearch, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { runGenerationQueue } from "@/services/generation/generationQueue";
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
  showAnalyze?: boolean;
}

export const GenerateControls = ({
  selectedSlots,
  prompts,
  onPreprocess,
  preprocessLoading,
  showAnalyze = true,
}: GenerateControlsProps) => {
  const { t } = useTranslation();
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const setTasks = useWorkflowStore((s) => s.setTasks);
  const updateTask = useWorkflowStore((s) => s.updateTask);
  const provider = useSettingsStore((s) => s.provider);
  const promptSettings = useSettingsStore((s) => s.promptSettings);

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
        theme: slot === "night" ? "dark" : "light",
        timeOfDay: slot,
        prompt: entry?.prompt ?? "",
        negativePrompt: entry?.negativePrompt ?? promptSettings.defaultNegativePrompt,
        seed: Math.floor(Math.random() * 100000000),
        status: "idle",
        progress: 0,
      };
    });

    try {
      setGenerating(true);
      setError("");
      const existingTasks = useWorkflowStore.getState().tasks;
      setTasks([...existingTasks, ...newTasks]);

      const completed = await runGenerationQueue({
        provider,
        prepared: preparedImage,
        tasks: newTasks,
        concurrency: 2,
        retries: 1,
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {showAnalyze ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void onPreprocess()}
            disabled={!preparedImage || preprocessLoading}
          >
            <ScanSearch className="h-4 w-4" />
            {preprocessLoading ? t("common.loading") : t("prompts.analyze")}
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={() => void onGenerate()}
          disabled={!preparedImage || generating || selectedSlots.length === 0}
        >
          <Sparkles className="h-4 w-4" />
          {generating ? t("common.loading") : t("common.generate")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("settings.provider")}: <span className="font-medium">{provider.templateId}</span>
      </p>

      {error ? <p className="text-sm text-destructive">{t(`errors.${error}`, error)}</p> : null}
    </div>
  );
};
