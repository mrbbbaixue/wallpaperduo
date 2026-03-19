import { Images } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { ControlPanel } from "@/components/control/ControlPanel";
import { ExportPanel } from "@/components/results/ExportPanel";
import { ResultsRail } from "@/components/results/ResultsRail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            <Images className="h-4 w-4" />
            {isZh ? `结果 ${succeeded.length}` : `Results ${succeeded.length}`}
          </Button>

          <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
            <DialogContent className="top-auto left-0 right-0 bottom-0 max-h-[78vh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[1.75rem] border border-border/70 bg-background/98 p-0 shadow-2xl sm:max-w-none sm:rounded-t-[1.75rem]">
              <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border/80" aria-hidden="true" />
              <div className="border-b border-border/70 px-4 pb-3 pt-4">
                <DialogTitle className="text-sm font-semibold">
                  {isZh ? "结果胶片" : "Results Rail"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-5">
                  {isZh
                    ? "查看生成结果、切换预览，并快速下载单张图片。"
                    : "Browse generated results, switch the preview, and download the selected image."}
                </DialogDescription>
              </div>
              <div className="max-h-[calc(78vh-5.5rem)] overflow-y-auto px-4 pb-4 pt-3">
                <ResultsRail inSheet />
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </>
  );
};
