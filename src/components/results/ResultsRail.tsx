import { ArrowLeftRight, Download, Image as ImageIcon, RotateCcw } from "lucide-react";
import { saveAs } from "file-saver";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/useWorkflowStore";

interface ResultsRailProps {
  inSheet?: boolean;
}

export const ResultsRail = ({ inSheet = false }: ResultsRailProps) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const tasks = useWorkflowStore((s) => s.tasks);
  const activeResultId = useWorkflowStore((s) => s.activeResultId);
  const previewMode = useWorkflowStore((s) => s.previewMode);
  const setActiveResultId = useWorkflowStore((s) => s.setActiveResultId);
  const setPreviewMode = useWorkflowStore((s) => s.setPreviewMode);

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );

  const activeIndex = useMemo(
    () => succeeded.findIndex((task) => task.id === activeResultId),
    [activeResultId, succeeded],
  );
  const activeTask = useMemo(
    () => (activeResultId ? succeeded.find((task) => task.id === activeResultId) : succeeded[0]),
    [activeResultId, succeeded],
  );

  const railRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousCountRef = useRef(0);

  useEffect(() => {
    if (succeeded.length === 0) {
      if (activeResultId) setActiveResultId(undefined);
      if (previewMode !== "single") setPreviewMode("single");
      previousCountRef.current = 0;
      return;
    }

    const hasActive = activeResultId
      ? succeeded.some((task) => task.id === activeResultId)
      : false;
    const hadResultsBefore = previousCountRef.current > 0;

    if (!activeResultId && !hadResultsBefore) {
      setActiveResultId(succeeded[0].id);
    } else if (activeResultId && !hasActive) {
      setActiveResultId(succeeded[0].id);
    }

    if (succeeded.length > previousCountRef.current) {
      const firstId = succeeded[0].id;
      window.setTimeout(() => {
        if (!inSheet) {
          railRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        cardRefs.current[firstId]?.focus();
      }, 40);
    }

    previousCountRef.current = succeeded.length;
  }, [activeResultId, inSheet, previewMode, setActiveResultId, setPreviewMode, succeeded]);

  if (succeeded.length === 0) {
    return null;
  }

  const selectAt = (nextIndex: number) => {
    const wrapped = (nextIndex + succeeded.length) % succeeded.length;
    const nextTask = succeeded[wrapped];
    if (!nextTask) return;
    setActiveResultId(nextTask.id);
    cardRefs.current[nextTask.id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAt((activeIndex < 0 ? 0 : activeIndex) + 1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAt((activeIndex < 0 ? 0 : activeIndex) - 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      selectAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectAt(succeeded.length - 1);
    }
  };

  const handleDownloadSingle = () => {
    if (!activeTask?.result?.blob) return;
    const safeLabel = activeTask.label.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = safeLabel ? `${safeLabel}.png` : `result_${activeTask.id}.png`;
    saveAs(activeTask.result.blob, filename);
  };

  return (
    <div ref={railRef}>
      <SectionCard
        title={isZh ? "结果胶片" : "Results Rail"}
        subtitle={
          isZh
            ? "左右方向键切换结果，点击缩略图可回填主画布预览。"
            : "Use Left/Right keys to switch results and click thumbnails to update the main preview."
        }
        surface={inSheet ? "default" : "flat"}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant={activeResultId ? "outline" : "default"}
              onClick={() => setActiveResultId(undefined)}
              aria-pressed={!activeResultId}
            >
              <RotateCcw className="h-4 w-4" />
              {t("results.baseSelect")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={previewMode === "single" ? "default" : "outline"}
              onClick={() => setPreviewMode("single")}
              disabled={!activeResultId}
              aria-pressed={previewMode === "single"}
            >
              <ImageIcon className="h-4 w-4" />
              {t("results.singleMode")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={previewMode === "compare" ? "default" : "outline"}
              onClick={() => setPreviewMode("compare")}
              disabled={!activeResultId}
              aria-pressed={previewMode === "compare"}
            >
              <ArrowLeftRight className="h-4 w-4" />
              {t("results.compareMode")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadSingle}
              disabled={!activeTask?.result?.blob}
            >
              <Download className="h-4 w-4" />
              {t("common.download")}
            </Button>
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
              {isZh ? `${succeeded.length} 张结果` : `${succeeded.length} results`}
            </span>
          </>
        }
      >
        <div
          role="listbox"
          aria-label={isZh ? "结果胶片" : "Results rail"}
          aria-activedescendant={activeResultId ? `result-option-${activeResultId}` : undefined}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="flex gap-3 overflow-x-auto pb-1 outline-none"
        >
          {succeeded.map((task) => {
            const selected = task.id === activeResultId;
            return (
              <button
                key={task.id}
                id={`result-option-${task.id}`}
                ref={(node) => {
                  cardRefs.current[task.id] = node;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => setActiveResultId(task.id)}
                className={cn(
                  "w-52 flex-shrink-0 rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-accent/40 shadow-[0_8px_18px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
                    : "border-border/70 bg-background hover:bg-accent/40",
                )}
              >
                <div className="space-y-3">
                  <img
                    src={task.result?.objectUrl}
                    alt={task.label}
                    className="aspect-[4/3] w-full rounded-lg border border-border/70 object-cover"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{task.label}</p>
                    {selected ? (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        {isZh ? "当前" : "Selected"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
};
