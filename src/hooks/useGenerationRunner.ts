import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@/hooks/use-toast";
import { runGenerationQueue } from "@/services/generation/generationQueue";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import type { GenerationTask, TimeVariant } from "@/types/domain";
import { toUserError } from "@/utils/error";
import { createId } from "@/utils/id";

export interface PromptEntry {
 timeOfDay: TimeVariant;
 prompt: string;
 negativePrompt: string;
}

interface UseGenerationRunnerInput {
 selectedSlots: TimeVariant[];
 prompts: PromptEntry[];
}

/**
 * 批量生成的执行逻辑（构建任务 → 入队 → 合并终态）。
 * 与 UI 解耦：调用方只负责渲染主操作按钮与进度。
 */
export const useGenerationRunner = ({ selectedSlots, prompts }: UseGenerationRunnerInput) => {
 const { t, i18n } = useTranslation();
 const preparedImage = useWorkflowStore((s) => s.preparedImage);
 const setTasks = useWorkflowStore((s) => s.setTasks);
 const updateTask = useWorkflowStore((s) => s.updateTask);
 const provider = useSettingsStore((s) => s.provider);
 const promptSettings = useSettingsStore((s) => s.promptSettings);
 const generationSettings = useSettingsStore((s) => s.generationSettings);

 const [generating, setGenerating] = useState(false);
 const [error, setError] = useState("");
 const abortRef = useRef<AbortController | null>(null);

 const run = useCallback(async () => {
  if (!preparedImage) {
   setError("workspace.needPrepared");
   return;
  }
  if (selectedSlots.length === 0) {
   setError("SELECT_SLOT_REQUIRED");
   return;
  }

  const newTasks: GenerationTask[] = selectedSlots.map((slot) => {
   const entry = prompts.find((item) => item.timeOfDay === slot);
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

  const controller = new AbortController();
  abortRef.current = controller;

  try {
   setGenerating(true);
   setError("");
   const existingTasks = useWorkflowStore.getState().tasks;
   setTasks([...existingTasks, ...newTasks]);
   toast({
    title: t("common.generate"),
    description:
     i18n.language === "zh"
      ? `已加入 ${newTasks.length} 个生成任务。`
      : `${newTasks.length} generation task(s) queued.`,
   });

   const completed = await runGenerationQueue({
    provider,
    prepared: preparedImage,
    tasks: newTasks,
    concurrency: generationSettings.concurrency,
    retries: generationSettings.retries,
    onTaskUpdate: (taskId, patch) => updateTask(taskId, patch),
    signal: controller.signal,
   });

   const completedById = new Map(completed.map((task) => [task.id, task]));
   const latestTasks = useWorkflowStore.getState().tasks;
   setTasks(latestTasks.map((task) => completedById.get(task.id) ?? task));

   const succeededCount = completed.filter((task) => task.status === "succeeded").length;
   const failedCount = completed.filter((task) => task.status === "failed").length;
   const canceledCount = completed.filter((task) => task.status === "canceled").length;
   const canceledText =
    canceledCount > 0
     ? i18n.language === "zh"
      ? `，已取消 ${canceledCount} 个`
      : `, ${canceledCount} canceled`
     : "";
   toast({
    title: i18n.language === "zh" ? "生成完成" : "Generation finished",
    description:
     i18n.language === "zh"
      ? `成功 ${succeededCount} 个，失败 ${failedCount} 个${canceledText}。`
      : `${succeededCount} succeeded, ${failedCount} failed${canceledText}.`,
    variant: failedCount > 0 ? "destructive" : "default",
   });
  } catch (exception) {
   const message = toUserError(exception);
   setError(message);
   toast({
    title: i18n.language === "zh" ? "生成失败" : "Generation failed",
    description: t(`errors.${message}`, message),
    variant: "destructive",
   });
  } finally {
   setGenerating(false);
   abortRef.current = null;
  }
 }, [
  generationSettings.concurrency,
  generationSettings.retries,
  i18n.language,
  preparedImage,
  promptSettings.defaultNegativePrompt,
  prompts,
  provider,
  selectedSlots,
  setTasks,
  t,
  updateTask,
 ]);

 const cancel = useCallback(() => {
  abortRef.current?.abort();
  toast({
   title: i18n.language === "zh" ? "已取消" : "Cancelled",
   description:
    i18n.language === "zh"
     ? "正在停止未开始的任务，已在生成中的任务也会尽快中止。"
     : "Stopping pending tasks; in-flight tasks will stop shortly.",
  });
 }, [i18n.language]);

 return {
  generating,
  error,
  run,
  cancel,
  canRun: Boolean(preparedImage) && selectedSlots.length > 0,
  clearError: () => setError(""),
 };
};
