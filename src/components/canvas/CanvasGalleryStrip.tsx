import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

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
  const { i18n } = useTranslation();
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
          <span className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
            {isZh ? `${succeeded.length} 张` : `${succeeded.length} items`}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
          className="flex gap-0 overflow-x-auto py-0 outline-none"
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
                  "w-44 flex-shrink-0 rounded-none border-b-0 border-l-0 border-t-0 p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-accent/40 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.2)]"
                    : "border-border/70 bg-background hover:bg-accent/40",
                )}
              >
                <div className="space-y-2">
                  <img
                    src={task.result?.objectUrl}
                    alt={task.label}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-md border border-border/50 object-cover transition-shadow duration-200 group-hover:shadow-md"
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
