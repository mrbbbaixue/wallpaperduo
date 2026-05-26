import { Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Moveable, { type OnDrag, type OnDragStart, type OnResize, type OnResizeStart } from "react-moveable";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  clampEditorZoom,
  EDITOR_OUTPUT_AREA_FRACTION,
  fitFrameBoxWithinBounds,
  getEditorMinZoom,
  resolveEditorImageBox,
  resolveViewportFromImageBox,
  type EditorImageBox,
} from "@/services/canvas/framing";
import type {
  CanvasCropArea,
  CanvasFraming,
  CanvasViewport,
  LoadedImage,
} from "@/types/domain";

interface CanvasFramingEditorProps {
  sourceImage: LoadedImage;
  ratio: { width: number; height: number };
  framing: CanvasFraming;
  onViewportChange: (viewport: CanvasViewport) => void;
  onCropAreaChange: (cropAreaPixels?: CanvasCropArea) => void;
  onRequestUpload: () => void;
}

const defaultCanvasSize = { width: 1, height: 1 };
const maxEditorZoom = 4;
const moveableHandleDirections = ["nw", "n", "ne", "w", "e", "sw", "s", "se"] as const;

export const CanvasFramingEditor = ({
  sourceImage,
  ratio,
  framing,
  onViewportChange,
  onCropAreaChange,
  onRequestUpload,
}: CanvasFramingEditorProps) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const viewportHostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageTargetRef = useRef<HTMLDivElement | null>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const dragStartBoxRef = useRef<EditorImageBox | null>(null);
  const resizeStartBoxRef = useRef<EditorImageBox | null>(null);
  const [canvasSize, setCanvasSize] = useState(defaultCanvasSize);
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null);
  const minZoom = getEditorMinZoom();
  const zoom = clampEditorZoom(framing.viewport.zoom);

  const outputAreaSize = useMemo(() => ({
    width: Math.max(1, Math.round(canvasSize.width * EDITOR_OUTPUT_AREA_FRACTION)),
    height: Math.max(1, Math.round(canvasSize.height * EDITOR_OUTPUT_AREA_FRACTION)),
  }), [canvasSize.height, canvasSize.width]);

  const outputAreaOffset = useMemo(() => ({
    x: (canvasSize.width - outputAreaSize.width) / 2,
    y: (canvasSize.height - outputAreaSize.height) / 2,
  }), [canvasSize.height, canvasSize.width, outputAreaSize.height, outputAreaSize.width]);

  const imageBoxInOutput = useMemo(
    () =>
      resolveEditorImageBox({
        source: { width: sourceImage.width, height: sourceImage.height },
        frame: outputAreaSize,
        framing,
      }),
    [outputAreaSize, framing, sourceImage.height, sourceImage.width],
  );

  const imageBoxInCanvas = useMemo(
    () => ({
      x: outputAreaOffset.x + imageBoxInOutput.x,
      y: outputAreaOffset.y + imageBoxInOutput.y,
      width: imageBoxInOutput.width,
      height: imageBoxInOutput.height,
    }),
    [imageBoxInOutput, outputAreaOffset],
  );

  const baseImageSize = useMemo(() => {
    const baseScale = Math.min(
      outputAreaSize.width / sourceImage.width,
      outputAreaSize.height / sourceImage.height,
    );
    return {
      width: Math.max(1, sourceImage.width * baseScale),
      height: Math.max(1, sourceImage.height * baseScale),
    };
  }, [outputAreaSize.height, outputAreaSize.width, sourceImage.height, sourceImage.width]);

  const canvasReady = canvasSize.width > 1 && canvasSize.height > 1;

  useEffect(() => {
    if (zoom !== framing.viewport.zoom) {
      onViewportChange({ ...framing.viewport, zoom });
    }
  }, [framing.viewport, onViewportChange, zoom]);

  useEffect(() => {
    const node = viewportHostRef.current;
    if (!node) return;

    const syncSize = () => {
      setCanvasSize(
        fitFrameBoxWithinBounds(
          { width: node.clientWidth, height: node.clientHeight },
          ratio,
        ),
      );
    };

    syncSize();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => syncSize());
    observer.observe(node);
    return () => observer.disconnect();
  }, [ratio]);

  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [canvasSize.height, canvasSize.width, imageBoxInCanvas.height, imageBoxInCanvas.width, imageBoxInCanvas.x, imageBoxInCanvas.y]);

  const commitViewportFromBox = useCallback(
    (boxInOutput: EditorImageBox) => {
      if (!canvasReady) return;
      onViewportChange(
        resolveViewportFromImageBox({
          imageBox: boxInOutput,
          source: { width: sourceImage.width, height: sourceImage.height },
          frame: outputAreaSize,
        }),
      );
    },
    [canvasReady, outputAreaSize, onViewportChange, sourceImage.height, sourceImage.width],
  );

  const clearLegacyCropArea = useCallback(() => {
    dragStartBoxRef.current = null;
    resizeStartBoxRef.current = null;
    onCropAreaChange(undefined);
  }, [onCropAreaChange]);

  const toOutputBox = useCallback(
    (boxInCanvas: EditorImageBox): EditorImageBox => ({
      x: boxInCanvas.x - outputAreaOffset.x,
      y: boxInCanvas.y - outputAreaOffset.y,
      width: boxInCanvas.width,
      height: boxInCanvas.height,
    }),
    [outputAreaOffset],
  );

  const handleCanvasRef = useCallback((node: HTMLDivElement | null) => {
    canvasRef.current = node;
    setCanvasElement(node);
  }, []);

  const handleDragStart = useCallback(
    (event: OnDragStart) => {
      dragStartBoxRef.current = imageBoxInCanvas;
      event.set([0, 0]);
    },
    [imageBoxInCanvas],
  );

  const handleDrag = useCallback(
    (event: OnDrag) => {
      const startBox = dragStartBoxRef.current ?? imageBoxInCanvas;
      const boxInCanvas: EditorImageBox = {
        ...startBox,
        x: startBox.x + event.beforeTranslate[0],
        y: startBox.y + event.beforeTranslate[1],
      };
      commitViewportFromBox(toOutputBox(boxInCanvas));
    },
    [commitViewportFromBox, imageBoxInCanvas, toOutputBox],
  );

  const handleResizeStart = useCallback(
    (event: OnResizeStart) => {
      resizeStartBoxRef.current = imageBoxInCanvas;
      event.set([imageBoxInCanvas.width, imageBoxInCanvas.height]);
      event.setRatio(sourceImage.width / sourceImage.height);
      event.setMin([baseImageSize.width * minZoom, baseImageSize.height * minZoom]);
      event.setMax([baseImageSize.width * maxEditorZoom, baseImageSize.height * maxEditorZoom]);
      if (event.dragStart) {
        event.dragStart.set([0, 0]);
      }
    },
    [baseImageSize, imageBoxInCanvas, minZoom, sourceImage.height, sourceImage.width],
  );

  const handleResize = useCallback(
    (event: OnResize) => {
      const startBox = resizeStartBoxRef.current ?? imageBoxInCanvas;
      const boxInCanvas: EditorImageBox = {
        x: startBox.x + event.drag.beforeTranslate[0],
        y: startBox.y + event.drag.beforeTranslate[1],
        width: event.boundingWidth,
        height: event.boundingHeight,
      };
      commitViewportFromBox(toOutputBox(boxInCanvas));
    },
    [commitViewportFromBox, imageBoxInCanvas, toOutputBox],
  );

  return (
    <div
      ref={viewportHostRef}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background/50 px-4 py-4"
    >
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRequestUpload}
          className="pointer-events-auto h-9 rounded-md bg-background/80 backdrop-blur"
        >
          <Upload className="h-4 w-4" />
          {t("common.upload")}
        </Button>
        <span className="rounded-md border border-border/70 bg-background/72 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur">
          {ratio.width}:{ratio.height}
        </span>
      </div>

      {/* 大画布 —— 暗色背景，容纳图片自由拖放 */}
      <div
        ref={handleCanvasRef}
        className="relative"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      >
        {/* 输出区 —— 亮色区域，位于画布中央 */}
        <div
          className="absolute border-2 border-white/90 bg-white/15 shadow-[0_0_80px_rgba(255,255,255,0.05)] dark:bg-white/8"
          style={{
            left: outputAreaOffset.x,
            top: outputAreaOffset.y,
            width: outputAreaSize.width,
            height: outputAreaSize.height,
          }}
        />

        {/* 图片 —— 可拖拽/缩放，不受输出区裁剪 */}
        <div
          ref={imageTargetRef}
          className="absolute touch-none select-none cursor-move"
          style={{
            left: imageBoxInCanvas.x,
            top: imageBoxInCanvas.y,
            width: imageBoxInCanvas.width,
            height: imageBoxInCanvas.height,
          }}
          aria-label={t("workspace.framingTitle")}
        >
          <img
            src={sourceImage.objectUrl}
            alt={sourceImage.name}
            draggable={false}
            className="pointer-events-none h-full w-full select-none object-fill drop-shadow-[0_12px_36px_rgba(15,23,42,0.45)]"
          />
        </div>

        {/* 输出区描边叠加层 —— 始终可见，标记裁剪边界 */}
        <div
          className="pointer-events-none absolute border-2 border-white/90"
          style={{
            left: outputAreaOffset.x,
            top: outputAreaOffset.y,
            width: outputAreaSize.width,
            height: outputAreaSize.height,
          }}
        />

        {canvasReady ? (
          <Moveable
            ref={moveableRef}
            target={imageTargetRef}
            container={canvasElement}
            rootContainer={canvasElement}
            viewContainer={canvasElement}
            flushSync={flushSync}
            draggable
            resizable
            keepRatio
            origin={false}
            edge={false}
            linePadding={10}
            controlPadding={18}
            renderDirections={moveableHandleDirections as unknown as string[]}
            useResizeObserver
            useMutationObserver
            className="framing-moveable"
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={clearLegacyCropArea}
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={clearLegacyCropArea}
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border/70 bg-background/76 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
        {t("workspace.framingHint")}
      </div>

      <div className="pointer-events-none absolute bottom-11 right-4 z-20 rounded-md border border-border/70 bg-background/76 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur">
        {isZh ? `缩放范围 ${minZoom.toFixed(2)}x - ${maxEditorZoom.toFixed(0)}x` : `Scale ${minZoom.toFixed(2)}x - ${maxEditorZoom.toFixed(0)}x`}
      </div>
    </div>
  );
};
