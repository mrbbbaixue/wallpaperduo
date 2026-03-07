import { renderLocalFallbackVariant } from "@/services/generation/localFallback";
import type { GenerationTask, PreparedImage } from "@/types/domain";
import type { ImageProvider } from "@/types/provider";
import { compactError, logError, logInfo, logWarn } from "@/utils/debugLog";
import { getImageSize } from "@/utils/image";
import { toUserError } from "@/utils/error";

interface GenerationQueueInput {
  provider: ImageProvider;
  prepared: PreparedImage;
  tasks: GenerationTask[];
  concurrency: number;
  retries: number;
  localFallback: boolean;
  onTaskUpdate?: (taskId: string, patch: Partial<GenerationTask>) => void;
}

const updateTask = (
  onTaskUpdate: GenerationQueueInput["onTaskUpdate"],
  taskId: string,
  patch: Partial<GenerationTask>,
) => {
  if (onTaskUpdate) {
    onTaskUpdate(taskId, patch);
  }
};

const runTaskWithRetry = async (
  input: GenerationQueueInput,
  task: GenerationTask,
): Promise<GenerationTask> => {
  logInfo("Generation task started", {
    provider: input.provider.name,
    taskId: task.id,
    label: task.label,
    retries: input.retries,
  });
  updateTask(input.onTaskUpdate, task.id, { status: "running", progress: 8, error: undefined });

  for (let attempt = 0; attempt <= input.retries; attempt += 1) {
    try {
      logInfo("Generation attempt", {
        provider: input.provider.name,
        taskId: task.id,
        attempt: attempt + 1,
        totalAttempts: input.retries + 1,
      });
      const payload = await input.provider.generateVariant({
        prepared: input.prepared,
        variant: task,
      });
      const size = await getImageSize(payload.blob);
      const result = {
        variantId: task.id,
        blob: payload.blob,
        objectUrl: URL.createObjectURL(payload.blob),
        width: size.width,
        height: size.height,
        provider: payload.provider,
        source: payload.source,
        createdAt: new Date().toISOString(),
      } as const;

      updateTask(input.onTaskUpdate, task.id, { status: "succeeded", progress: 100, result });
      logInfo("Generation task succeeded", {
        provider: input.provider.name,
        taskId: task.id,
        source: payload.source,
        width: size.width,
        height: size.height,
        bytes: payload.blob.size,
      });
      return { ...task, status: "succeeded", progress: 100, result };
    } catch (error) {
      logWarn("Generation attempt failed", {
        provider: input.provider.name,
        taskId: task.id,
        attempt: attempt + 1,
        totalAttempts: input.retries + 1,
        error: compactError(error),
      });
      if (attempt < input.retries) {
        updateTask(input.onTaskUpdate, task.id, { progress: 25 + 25 * attempt });
        continue;
      }

      if (input.localFallback) {
        const fallbackBlob = await renderLocalFallbackVariant(input.prepared.blob, task);
        const size = await getImageSize(fallbackBlob);
        const result = {
          variantId: task.id,
          blob: fallbackBlob,
          objectUrl: URL.createObjectURL(fallbackBlob),
          width: size.width,
          height: size.height,
          provider: input.provider.name,
          source: "local-fallback",
          createdAt: new Date().toISOString(),
        } as const;
        const warning = `Fallback used: ${toUserError(error)}`;
        logWarn("Generation switched to local fallback", {
          provider: input.provider.name,
          taskId: task.id,
          warning,
          fallbackBytes: fallbackBlob.size,
        });
        updateTask(input.onTaskUpdate, task.id, {
          status: "succeeded",
          progress: 100,
          error: warning,
          result,
        });
        return { ...task, status: "succeeded", progress: 100, error: warning, result };
      }

      const message = toUserError(error);
      logError("Generation task failed without fallback", {
        provider: input.provider.name,
        taskId: task.id,
        error: message,
      });
      updateTask(input.onTaskUpdate, task.id, { status: "failed", progress: 100, error: message });
      return { ...task, status: "failed", progress: 100, error: message };
    }
  }

  return { ...task, status: "failed", progress: 100, error: "UNKNOWN_ERROR" };
};

export const runGenerationQueue = async (
  input: GenerationQueueInput,
): Promise<GenerationTask[]> => {
  const results: GenerationTask[] = [...input.tasks];
  const queue = [...input.tasks];
  const workers = Math.max(1, Math.min(input.concurrency || 1, queue.length || 1));
  logInfo("Generation queue started", {
    provider: input.provider.name,
    totalTasks: input.tasks.length,
    workers,
    retries: input.retries,
    localFallback: input.localFallback,
  });

  await Promise.all(
    Array.from({ length: workers }).map(async () => {
      while (queue.length) {
        const task = queue.shift();
        if (!task) {
          return;
        }
        updateTask(input.onTaskUpdate, task.id, { status: "queued", progress: 2 });
        const updated = await runTaskWithRetry(input, task);
        const index = results.findIndex((item) => item.id === task.id);
        if (index >= 0) {
          results[index] = updated;
        }
      }
    }),
  );

  logInfo("Generation queue finished", {
    provider: input.provider.name,
    totalTasks: results.length,
    succeeded: results.filter((task) => task.status === "succeeded").length,
    failed: results.filter((task) => task.status === "failed").length,
  });

  return results;
};
