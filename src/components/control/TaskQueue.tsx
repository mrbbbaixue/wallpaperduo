import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import type { GenerationStatus } from "@/types/domain";

const statusTone: Record<GenerationStatus, string> = {
  idle: "border-border bg-muted/40 text-muted-foreground",
  queued:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/40 dark:text-sky-300",
  running:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-300",
  succeeded:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300",
  failed:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300",
};

export const TaskQueue = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const tasks = useWorkflowStore((s) => s.tasks);

  if (tasks.length === 0) {
    return null;
  }

  const succeeded = tasks.filter((task) => task.status === "succeeded").length;
  const failed = tasks.filter((task) => task.status === "failed").length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{t("results.queue")}</h4>
        <p className="text-xs text-muted-foreground">
          {succeeded}/{tasks.length} {t("common.succeeded")}
          {failed > 0 ? `, ${failed} ${t("common.failed")}` : ""}
        </p>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="space-y-2 rounded-xl border border-border/70 bg-background/70 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{task.label}</p>
                <p className="text-xs text-muted-foreground">
                  {task.timeOfDay} · {task.theme}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  statusTone[task.status],
                )}
              >
                {t(`results.status.${task.status}`, task.status)}
              </span>
            </div>

            {task.status === "queued" || task.status === "running" ? (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, task.progress))}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isZh
                    ? `进度 ${Math.round(task.progress)}%`
                    : `Progress ${Math.round(task.progress)}%`}
                </p>
              </div>
            ) : null}

            {task.error ? <p className="text-xs text-destructive">{task.error}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
};
