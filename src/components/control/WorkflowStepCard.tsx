import { AlertCircle, CheckCircle2, ChevronDown, CircleDot, Clock3 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type WorkflowStepTone = "current" | "complete" | "pending" | "attention";

interface WorkflowStepCardProps {
  stepLabel: string;
  title: string;
  description: string;
  statusLabel: string;
  tone: WorkflowStepTone;
  expanded: boolean;
  disabled?: boolean;
  summary?: ReactNode;
  children?: ReactNode;
  onToggle?: () => void;
}

const toneStyle: Record<WorkflowStepTone, string> = {
  current:
    "border-primary/35 bg-card/95 shadow-[0_14px_28px_rgba(15,23,42,0.10)] dark:shadow-[0_16px_32px_rgba(0,0,0,0.28)]",
  complete: "border-border/70 bg-background/70",
  pending: "border-border/60 bg-background/40",
  attention: "border-amber-300/60 bg-amber-50/70 dark:border-amber-800/70 dark:bg-amber-950/20",
};

const badgeStyle: Record<WorkflowStepTone, string> = {
  current: "border-primary/20 bg-primary/10 text-foreground",
  complete:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300",
  pending: "border-border/70 bg-muted/60 text-muted-foreground",
  attention:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-300",
};

const iconByTone = {
  current: CircleDot,
  complete: CheckCircle2,
  pending: Clock3,
  attention: AlertCircle,
} satisfies Record<WorkflowStepTone, typeof CircleDot>;

export const WorkflowStepCard = ({
  stepLabel,
  title,
  description,
  statusLabel,
  tone,
  expanded,
  disabled = false,
  summary,
  children,
  onToggle,
}: WorkflowStepCardProps) => {
  const ToneIcon = iconByTone[tone];

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border transition-all",
        toneStyle[tone],
        disabled && !expanded && "opacity-75",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle || disabled}
        className={cn(
          "flex w-full items-start gap-3 p-4 text-left transition-colors",
          onToggle && !disabled && "hover:bg-foreground/[0.03]",
        )}
        aria-expanded={expanded}
      >
        <div
          className={cn(
            "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tracking-[0.16em]",
            tone === "current"
              ? "border-primary/20 bg-primary/10 text-foreground"
              : "border-border/70 bg-background/70 text-muted-foreground",
          )}
        >
          {stepLabel}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <ToneIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h3 className="truncate text-sm font-semibold leading-6">{title}</h3>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{description}</p>
            </div>

            <div className="flex items-center gap-2 self-start">
              <span
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  badgeStyle[tone],
                )}
              >
                {statusLabel}
              </span>
              {onToggle ? (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              ) : null}
            </div>
          </div>

          {!expanded && summary ? <div className="mt-3">{summary}</div> : null}
        </div>
      </button>

      {expanded && children ? (
        <div className="border-t border-border/60 px-4 pb-4 pt-3">{children}</div>
      ) : null}
    </section>
  );
};
