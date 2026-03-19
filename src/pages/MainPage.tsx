import { Images, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { ControlPanel } from "@/components/control/ControlPanel";
import { ExportPanel } from "@/components/results/ExportPanel";
import { ResultsRail } from "@/components/results/ResultsRail";
import { Button } from "@/components/ui/button";
import { desktopWorkspaceHeight } from "@/constants/layout";
import { useWorkflowStore } from "@/store/useWorkflowStore";

const mobileMediaQuery = "(max-width: 767px)";

export const MainPage = () => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const tasks = useWorkflowStore((s) => s.tasks);

  const succeeded = tasks.filter((task) => task.status === "succeeded" && task.result?.blob);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(mobileMediaQuery).matches : false,
  );
  const previousSucceededRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia(mobileMediaQuery);
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      previousSucceededRef.current = succeeded.length;
      return;
    }

    const hasNewResult = succeeded.length > previousSucceededRef.current;
    previousSucceededRef.current = succeeded.length;

    if (!hasNewResult) return;

    const timer = window.setTimeout(() => {
      setSheetOpen(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMobile, succeeded.length]);

  return (
    <>
      <div className="grid min-w-0 gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_360px] md:px-6">
        <div className="min-w-0">
          <CanvasWorkspace />
        </div>

        <aside className="min-w-0 border-t border-border/70 pt-4 md:border-t-0 md:pt-0">
          {isMobile ? (
            <div className="space-y-4">
              <ControlPanel />
              <ExportPanel />
            </div>
          ) : (
            <div
              className="overflow-hidden"
              style={{ height: desktopWorkspaceHeight, minHeight: desktopWorkspaceHeight }}
            >
              <div className="h-full overflow-y-auto pr-1">
                <div className="space-y-4 pb-4">
                  <ControlPanel desktopScrollManaged />
                  <ExportPanel />
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {isMobile && succeeded.length > 0 ? (
        <>
          <Button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="fixed bottom-4 right-4 z-40 shadow-lg"
          >
            <Images className="h-4 w-4" />
            {isZh ? `结果 ${succeeded.length}` : `Results ${succeeded.length}`}
          </Button>

          {sheetOpen ? (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
              <div className="absolute inset-x-0 bottom-0 max-h-[78vh] rounded-t-3xl border border-border/70 bg-background p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">{isZh ? "结果胶片" : "Results Rail"}</h2>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[calc(78vh-4rem)] overflow-y-auto pb-2">
                  <ResultsRail inSheet />
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
};
