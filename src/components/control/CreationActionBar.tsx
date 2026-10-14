import { Loader2, Sparkles, X } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/useWorkflowStore";

interface CreationActionBarProps {
 generating: boolean;
 canRun: boolean;
 selectedCount: number;
 error: string;
 onRun: () => void;
 onCancel: () => void;
}

/**
 * 右栏底部常驻主操作栏：主 CTA 与队列进度不随步骤卡片折叠/滚动消失。
 */
export const CreationActionBar = ({
 generating,
 canRun,
 selectedCount,
 error,
 onRun,
 onCancel,
}: CreationActionBarProps) => {
 const { t, i18n } = useTranslation();
 const isZh = i18n.language === "zh";
 const tasks = useWorkflowStore((s) => s.tasks);

 const progress = useMemo(() => {
  if (tasks.length === 0) return null;
  const finished = tasks.filter(
   (task) => task.status === "succeeded" || task.status === "failed" || task.status === "canceled",
  ).length;
  const succeeded = tasks.filter((task) => task.status === "succeeded").length;
  const failed = tasks.filter((task) => task.status === "failed").length;
  const running = tasks.some((task) => task.status === "queued" || task.status === "running");
  const percent = Math.round((finished / tasks.length) * 100);
  return { finished, total: tasks.length, succeeded, failed, running, percent };
 }, [tasks]);

 return (
  <div className="sticky bottom-0 z-20 border-t border-border/70 bg-background/95 px-3.5 pb-3.5 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
   {progress ? (
    <div className="mb-2.5 space-y-1.5">
     <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
       {progress.running ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
       {isZh
        ? `完成 ${progress.finished}/${progress.total}`
        : `${progress.finished}/${progress.total} done`}
      </span>
      <span className="tabular-nums">
       {isZh
        ? `成功 ${progress.succeeded} · 失败 ${progress.failed}`
        : `${progress.succeeded} ok · ${progress.failed} failed`}
      </span>
     </div>
     <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
      <div
       className={`h-full transition-all duration-500 ease-out ${progress.running
         ? "bg-sky-500"
         : progress.failed > 0 && progress.succeeded === 0
          ? "bg-amber-500"
          : "bg-emerald-500"
        }`}
       style={{ width: `${progress.percent}%` }}
      />
     </div>
    </div>
   ) : null}

   <Button
    type="button"
    onClick={() => {
     if (generating) {
      onCancel();
     } else {
      onRun();
     }
    }}
    disabled={!canRun}
    variant={generating ? "destructive" : "default"}
    className="h-11 w-full rounded-md"
   >
    {generating ? (
     <>
      <X className="h-4 w-4" />
      {isZh ? "取消生成" : "Cancel"}
     </>
    ) : (
     <>
      <Sparkles className="h-4 w-4" />
      {isZh
       ? `生成 ${selectedCount} 个版本`
       : `Generate ${selectedCount} variant${selectedCount === 1 ? "" : "s"}`}
     </>
    )}
   </Button>

   {error ? (
    <p className="mt-2 text-xs text-destructive">{t(`errors.${error}`, error)}</p>
   ) : null}
  </div>
 );
};
