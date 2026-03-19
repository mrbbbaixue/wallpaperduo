import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { saveAs } from "file-saver";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/useWorkflowStore";

interface CanvasGalleryStripProps {
  expanded: boolean;
  onToggleExpanded: () => void;
}

export const CanvasGalleryStrip = ({
  expanded,
  onToggleExpanded,
}: CanvasGalleryStripProps) => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";

  const tasks = useWorkflowStore((s) => s.tasks);
  const activeResultId = useWorkflowStore((s) => s.activeResultId);
  const setActiveResultId = useWorkflowStore((s) => s.setActiveResultId);

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );

  const activeIndex = useMemo(
    () => succeeded.findIndex((task) => task.id === activeResultId),
    [activeResultId, succeeded],
  );
  const activeTask = useMemo(
    () => (activeResultId ? succeeded.find((task) => task.id === activeResultId) : undefined),
    [activeResultId, succeeded],
  );

  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (succeeded.length === 0) {
      previousIdsRef.current = [];
      return;
    }

    const previousSet = new Set(previousIdsRef.current);
    const newcomer = succeeded.find((task) => !previousSet.has(task.id));

    if (newcomer && expanded) {
      window.setTimeout(() => {
        cardRefs.current[newcomer.id]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }, 40);
    }

    previousIdsRef.current = succeeded.map((task) => task.id);
  }, [expanded, succeeded]);

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
    <div className="border-t border-border/70">
      <div
        className={cn(
          "flex items-center justify-between gap-3 py-3",
          expanded ? "border-b border-border/70" : "",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {isZh ? "结果画廊" : "Result Gallery"}
          </span>
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
            {isZh ? `${succeeded.length} 张` : `${succeeded.length} items`}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={expanded ? (isZh ? "收起画廊" : "Collapse gallery") : isZh ? "展开画廊" : "Expand gallery"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background transition-colors hover:bg-accent"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded ? (
        <div
          role="listbox"
          aria-label={isZh ? "结果画廊" : "Result gallery"}
          aria-activedescendant={activeResultId ? `gallery-option-${activeResultId}` : undefined}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="flex gap-3 overflow-x-auto py-3 outline-none"
        >
          {succeeded.map((task) => {
            const selected = task.id === activeResultId;
            return (
              <button
                key={task.id}
                id={`gallery-option-${task.id}`}
                ref={(node) => {
                  cardRefs.current[task.id] = node;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => setActiveResultId(task.id)}
                className={cn(
                  "w-44 flex-shrink-0 rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-accent/40 shadow-[0_8px_18px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
                    : "border-border/70 bg-background hover:bg-accent/40",
                )}
              >
                <div className="space-y-2">
                  <img
                    src={task.result?.objectUrl}
                    alt={task.label}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-lg border border-border/70 object-cover"
                  />
                  <p className="truncate text-sm font-semibold">{task.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
