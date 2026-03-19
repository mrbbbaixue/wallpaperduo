import { ArrowLeftRight, Image as ImageIcon, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasGalleryStrip } from "@/components/canvas/CanvasGalleryStrip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildLoadedImage, useWorkflowStore } from "@/store/useWorkflowStore";
import { getImageSize, readFileAsBlob } from "@/utils/image";

const checkerboardBg = `
  repeating-conic-gradient(
    rgba(128,128,128,0.15) 0% 25%,
    transparent 0% 50%
  ) 50% / 20px 20px
`;

const mobileMediaQuery = "(max-width: 767px)";

export const CanvasWorkspace = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const setSourceImage = useWorkflowStore((s) => s.setSourceImage);
  const tasks = useWorkflowStore((s) => s.tasks);
  const activeResultId = useWorkflowStore((s) => s.activeResultId);
  const setActiveResultId = useWorkflowStore((s) => s.setActiveResultId);
  const previewMode = useWorkflowStore((s) => s.previewMode);
  const setPreviewMode = useWorkflowStore((s) => s.setPreviewMode);

  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(mobileMediaQuery).matches : false,
  );
  const previousSucceededCountRef = useRef(0);

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

  const succeededTasks = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );
  const hasResults = succeededTasks.length > 0;
  const activeTask = activeResultId
    ? succeededTasks.find((task) => task.id === activeResultId)
    : undefined;

  useEffect(() => {
    if (succeededTasks.length === 0) {
      if (activeResultId) setActiveResultId(undefined);
      if (previewMode !== "single") setPreviewMode("single");
      previousSucceededCountRef.current = 0;
      return;
    }

    const hasActive = activeResultId
      ? succeededTasks.some((task) => task.id === activeResultId)
      : false;
    const hadResultsBefore = previousSucceededCountRef.current > 0;

    if (!activeResultId && !hadResultsBefore) {
      setActiveResultId(succeededTasks[0].id);
      previousSucceededCountRef.current = succeededTasks.length;
      return;
    }

    if (activeResultId && !hasActive) {
      setActiveResultId(succeededTasks[0].id);
    }
    previousSucceededCountRef.current = succeededTasks.length;
  }, [activeResultId, previewMode, setActiveResultId, setPreviewMode, succeededTasks]);

  const onFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      try {
        const blob = await readFileAsBlob(file);
        const size = await getImageSize(blob);
        const loaded = buildLoadedImage({
          name: file.name,
          mimeType: blob.type || "image/png",
          blob,
          width: size.width,
          height: size.height,
          objectUrl: URL.createObjectURL(blob),
        });
        setError("");
        setSourceImage(loaded);
      } catch {
        setError("INVALID_IMAGE");
      }
    },
    [setSourceImage],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        void onFile(file);
      }
    },
    [onFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const basePreviewUrl = preparedImage?.objectUrl ?? sourceImage?.objectUrl ?? null;
  const resultPreviewUrl = activeTask?.result?.objectUrl ?? null;
  const previewUrl = resultPreviewUrl ?? basePreviewUrl;
  const compareReady = previewMode === "compare" && !!basePreviewUrl && !!resultPreviewUrl;
  const emptyUploadState = !previewUrl;

  const triggerUpload = () => {
    inputRef.current?.click();
  };

  const resultControls = hasResults ? (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-background/72 px-4 py-3">
      <Button
        type="button"
        size="sm"
        variant={activeResultId ? "outline" : "default"}
        onClick={() => setActiveResultId(undefined)}
      >
        {t("results.baseSelect")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={previewMode === "single" ? "default" : "outline"}
        onClick={() => setPreviewMode("single")}
      >
        <ImageIcon className="h-4 w-4" />
        {t("results.singleMode")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={previewMode === "compare" ? "default" : "outline"}
        onClick={() => setPreviewMode("compare")}
      >
        <ArrowLeftRight className="h-4 w-4" />
        {t("results.compareMode")}
      </Button>
      <span className="text-sm text-muted-foreground">
        {activeTask
          ? isZh
            ? `当前结果：${activeTask.label}`
            : `Current result: ${activeTask.label}`
          : isZh
            ? "当前预览：基准图"
            : "Current preview: baseline"}
      </span>
    </div>
  ) : null;

  const stage = (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={emptyUploadState ? triggerUpload : undefined}
      onKeyDown={
        emptyUploadState
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                triggerUpload();
              }
            }
          : undefined
      }
      role={emptyUploadState ? "button" : undefined}
      tabIndex={emptyUploadState ? 0 : undefined}
      aria-label={emptyUploadState ? (isZh ? "上传参考图" : "Upload reference image") : undefined}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-none bg-transparent",
        emptyUploadState ? "cursor-pointer" : "",
        isDragging ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "",
      )}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.02)), ${checkerboardBg}`,
        aspectRatio: "3 / 1",
        minHeight: isMobile ? 230 : undefined,
        height: isMobile ? undefined : "100%",
      }}
    >
      {compareReady ? (
        <div className="grid h-full w-full grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2 border-r border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isZh ? "基准图" : "Baseline"}
            </p>
            <img
              src={basePreviewUrl ?? ""}
              alt="base preview"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex min-h-0 flex-col gap-2 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isZh ? "当前结果" : "Current result"}
            </p>
            <img
              src={resultPreviewUrl ?? ""}
              alt={activeTask?.label ?? "result preview"}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      ) : previewUrl ? (
        <img
          src={previewUrl}
          alt="canvas preview"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <UploadCloud className="h-12 w-12 text-muted-foreground/70" />
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {t("workspace.uploadHint")}
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
            {isZh ? "点击或拖拽上传" : "Click or drag to upload"}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-w-0 md:h-full md:bg-background">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => void onFile(event.currentTarget.files?.[0])}
      />
      <div className="space-y-4 md:flex md:h-full md:min-h-0 md:flex-col md:space-y-0">
        {isMobile ? (
          <>
            {resultControls}
            {stage}
          </>
        ) : (
          <div
            className="grid h-full min-h-0 overflow-hidden"
            style={{ gridTemplateRows: hasResults ? "auto minmax(0, 1fr) auto" : "minmax(0, 1fr)" }}
          >
            {resultControls}
            {stage}
            {hasResults ? (
              <CanvasGalleryStrip
                expanded={isGalleryExpanded}
                onToggleExpanded={() => setIsGalleryExpanded((expanded) => !expanded)}
              />
            ) : null}
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{t(`errors.${error}`, error)}</p> : null}
      </div>
    </div>
  );
};
