import { UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasFramingEditor } from "@/components/canvas/CanvasFramingEditor";
import { CanvasGalleryStrip } from "@/components/canvas/CanvasGalleryStrip";
import { aspectRatios } from "@/data/aspectRatios";
import { cn } from "@/lib/utils";
import { buildLoadedImage, useWorkflowStore } from "@/store/useWorkflowStore";
import { getImageSize, readFileAsBlob } from "@/utils/image";

const checkerboardBg = `
  repeating-conic-gradient(
    hsl(var(--muted-foreground) / 0.08) 0% 25%,
    transparent 0% 50%
  ) 50% / 16px 16px
`;

const mobileMediaQuery = "(max-width: 767px)";

export const CanvasWorkspace = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const canvasFraming = useWorkflowStore((s) => s.canvasFraming);
  const ratioId = useWorkflowStore((s) => s.ratioId);
  const customRatio = useWorkflowStore((s) => s.customRatio);
  const setSourceImage = useWorkflowStore((s) => s.setSourceImage);
  const setCanvasViewport = useWorkflowStore((s) => s.setCanvasViewport);
  const setCanvasSize = useWorkflowStore((s) => s.setCanvasSize);
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
  const normalizedRatioId = aspectRatios.some((item) => item.id === ratioId) ? ratioId : "16:9";
  const ratio =
    normalizedRatioId === "custom"
      ? customRatio
      : (() => {
          const preset = aspectRatios.find((item) => item.id === normalizedRatioId);
          return preset ? { width: preset.width, height: preset.height } : { width: 16, height: 9 };
        })();

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
  const compareReady = previewMode === "compare" && !!basePreviewUrl && !!resultPreviewUrl;
  const showResultPreview = !compareReady && !!resultPreviewUrl;
  const showFramingEditor = !compareReady && !showResultPreview && !!sourceImage;
  const emptyUploadState = !showFramingEditor && !compareReady && !showResultPreview;

  const triggerUpload = () => {
    inputRef.current?.click();
  };

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
        "relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-transparent",
        emptyUploadState ? "cursor-pointer" : "",
        isDragging ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "",
        "shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)]",
      )}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.01)), ${checkerboardBg}`,
        minHeight: 200,
        height: "100%",
      }}
    >
      {compareReady ? (
        <div className="grid h-full w-full grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2 border-r border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("results.baseSelect")}
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
      ) : showResultPreview ? (
        <img
          src={resultPreviewUrl ?? ""}
          alt="canvas preview"
          className="max-h-full max-w-full object-contain"
        />
      ) : showFramingEditor ? (
        <CanvasFramingEditor
          sourceImage={sourceImage}
          ratio={ratio}
          viewport={canvasFraming.viewport}
          onViewportChange={setCanvasViewport}
          onCanvasSizeChange={setCanvasSize}
          onRequestUpload={triggerUpload}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="rounded-2xl border border-border/50 bg-background/60 p-4 shadow-sm">
            <UploadCloud className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground/80">
              {isZh ? "点击或拖拽上传参考图" : "Click or drag to upload a reference image"}
            </p>
            <p className="max-w-[260px] text-xs leading-5 text-muted-foreground">
              {isZh
                ? "支持 PNG / JPG / WebP 格式，上传后将自动进入构图编辑器"
                : "Supports PNG / JPG / WebP. Opens the framing editor after upload."}
            </p>
          </div>
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
          stage
        ) : (
          <div
            className="grid h-full min-h-0 overflow-hidden"
            style={{ gridTemplateRows: hasResults ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)" }}
          >
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
