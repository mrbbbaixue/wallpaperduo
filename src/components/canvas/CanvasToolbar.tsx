import { ArrowLeftRight, Download, Image as ImageIcon, Layers } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { saveAs } from "file-saver";

import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/useWorkflowStore";

const toolbarButtonClassName = "h-8 rounded-md px-2.5 text-xs";

/**
 * 画布顶部工具条：作用于画布本身的动作（比例、预览模式、下载当前结果）留在画布旁，
 * 不再混在右栏的设置步骤里。
 */
export const CanvasToolbar = () => {
 const { t, i18n } = useTranslation();
 const isZh = i18n.language === "zh";
 const tasks = useWorkflowStore((s) => s.tasks);
 const sourceImage = useWorkflowStore((s) => s.sourceImage);
 const preparedImage = useWorkflowStore((s) => s.preparedImage);
 const ratioId = useWorkflowStore((s) => s.ratioId);
 const customRatio = useWorkflowStore((s) => s.customRatio);
 const activeResultId = useWorkflowStore((s) => s.activeResultId);
 const setActiveResultId = useWorkflowStore((s) => s.setActiveResultId);
 const previewMode = useWorkflowStore((s) => s.previewMode);
 const setPreviewMode = useWorkflowStore((s) => s.setPreviewMode);

 const succeededTasks = useMemo(
  () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
  [tasks],
 );
 const activeTask = activeResultId
  ? succeededTasks.find((task) => task.id === activeResultId)
  : undefined;

 const ratioLabel = ratioId === "custom" ? `${customRatio.width}:${customRatio.height}` : ratioId;

 const handleDownload = () => {
  if (!activeTask?.result?.blob) return;
  const safeLabel = activeTask.label.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  saveAs(activeTask.result.blob, safeLabel ? `${safeLabel}.png` : `result_${activeTask.id}.png`);
 };

 const compareReady = Boolean(preparedImage) && Boolean(activeTask);

 return (
  <div className="flex min-h-9 items-center justify-between gap-3 border-b border-border/60 px-3 py-1.5 md:px-4">
   <div className="flex min-w-0 items-center gap-2">
    <span className="rounded-md border border-border/70 bg-background/65 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
     {ratioLabel}
    </span>
    {sourceImage ? (
     <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
      {sourceImage.name} · {sourceImage.width} × {sourceImage.height}
     </span>
    ) : null}
    {succeededTasks.length > 0 ? (
     <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/65 px-2 py-0.5 text-[11px] text-muted-foreground">
      <Layers className="h-3 w-3" />
      {isZh ? `${succeededTasks.length} 个结果` : `${succeededTasks.length} results`}
     </span>
    ) : null}
   </div>

   <div className="flex shrink-0 items-center gap-1.5">
    <div className="hidden items-center gap-1.5 sm:flex">
     <Button
      type="button"
      size="sm"
      variant={!activeResultId ? "default" : "outline"}
      onClick={() => {
       setPreviewMode("single");
       setActiveResultId(undefined);
      }}
      aria-pressed={!activeResultId}
      className={toolbarButtonClassName}
     >
      {t("results.baseSelect")}
     </Button>
     <Button
      type="button"
      size="sm"
      variant={previewMode === "single" && activeResultId ? "default" : "outline"}
      onClick={() => setPreviewMode("single")}
      disabled={!activeResultId}
      aria-pressed={previewMode === "single"}
      className={toolbarButtonClassName}
     >
      <ImageIcon className="h-3.5 w-3.5" />
      {t("results.singleMode")}
     </Button>
     <Button
      type="button"
      size="sm"
      variant={previewMode === "compare" ? "default" : "outline"}
      onClick={() => setPreviewMode("compare")}
      disabled={!compareReady}
      aria-pressed={previewMode === "compare"}
      className={toolbarButtonClassName}
     >
      <ArrowLeftRight className="h-3.5 w-3.5" />
      {t("results.compareMode")}
     </Button>
    </div>
    <Button
     type="button"
     size="sm"
     variant="outline"
     onClick={handleDownload}
     disabled={!activeTask?.result?.blob}
     className={toolbarButtonClassName}
    >
     <Download className="h-3.5 w-3.5" />
     {t("common.download")}
    </Button>
   </div>
  </div>
 );
};
