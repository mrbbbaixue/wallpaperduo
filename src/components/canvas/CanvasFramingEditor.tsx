import { Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Moveable, { type OnDrag, type OnDragStart, type OnResize, type OnResizeStart } from "react-moveable";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  clampEditorZoom,
  fitFrameBoxWithinBounds,
  getEditorMinZoom,
  resolveEditorImageBox,
  resolveViewportFromImageBox,
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

const defaultViewportSize = { width: 1, height: 1 };
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
  const frameShellRef = useRef<HTMLDivElement | null>(null);
  const imageTargetRef = useRef<HTMLDivElement | null>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const dragStartBoxRef = useRef<ReturnType<typeof resolveEditorImageBox> | null>(null);
  const resizeStartBoxRef = useRef<ReturnType<typeof resolveEditorImageBox> | null>(null);
  const [frameViewportSize, setFrameViewportSize] = useState(defaultViewportSize);
  const [frameShellElement, setFrameShellElement] = useState<HTMLDivElement | null>(null);
  const minZoom = getEditorMinZoom();
  const zoom = clampEditorZoom(framing.viewport.zoom);
  const frameReady = frameViewportSize.width > 1 && frameViewportSize.height > 1;
  const imageBox = useMemo(
    () =>
      resolveEditorImageBox({
        source: {
          width: sourceImage.width,
          height: sourceImage.height,
        },
        frame: frameViewportSize,
        framing,
      }),
    [frameViewportSize, framing, sourceImage.height, sourceImage.width],
  );
  const baseImageSize = useMemo(() => {
    const baseScale = Math.min(
      frameViewportSize.width / sourceImage.width,
      frameViewportSize.height / sourceImage.height,
    );

    return {
      width: Math.max(1, sourceImage.width * baseScale),
      height: Math.max(1, sourceImage.height * baseScale),
    };
  }, [frameViewportSize.height, frameViewportSize.width, sourceImage.height, sourceImage.width]);

  useEffect(() => {
    if (zoom !== framing.viewport.zoom) {
      onViewportChange({
        ...framing.viewport,
        zoom,
      });
    }
  }, [framing.viewport, onViewportChange, zoom]);

  useEffect(() => {
    const node = viewportHostRef.current;
    if (!node) {
      return;
    }

    const syncViewportSize = () => {
      setFrameViewportSize(
        fitFrameBoxWithinBounds(
          {
            width: node.clientWidth,
            height: node.clientHeight,
          },
          ratio,
        ),
      );
    };

    syncViewportSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncViewportSize();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ratio]);

  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [frameViewportSize.height, frameViewportSize.width, imageBox.height, imageBox.width, imageBox.x, imageBox.y]);

  const commitViewportFromBox = useCallback(
    (nextBox: ReturnType<typeof resolveEditorImageBox>) => {
      if (!frameReady) {
        return;
      }

      onViewportChange(
        resolveViewportFromImageBox({
          imageBox: nextBox,
          source: {
            width: sourceImage.width,
            height: sourceImage.height,
          },
          frame: frameViewportSize,
        }),
      );
    },
    [frameReady, frameViewportSize, onViewportChange, sourceImage.height, sourceImage.width],
  );

  const clearLegacyCropArea = useCallback(() => {
    dragStartBoxRef.current = null;
    resizeStartBoxRef.current = null;
    onCropAreaChange(undefined);
  }, [onCropAreaChange]);

  const handleFrameShellRef = useCallback((node: HTMLDivElement | null) => {
    frameShellRef.current = node;
    setFrameShellElement(node);
  }, []);

  const handleDragStart = useCallback(
    (event: OnDragStart) => {
      dragStartBoxRef.current = imageBox;
      event.set([0, 0]);
    },
    [imageBox],
  );

  const handleDrag = useCallback(
    (event: OnDrag) => {
      const startBox = dragStartBoxRef.current ?? imageBox;
      commitViewportFromBox({
        ...startBox,
        x: startBox.x + event.beforeTranslate[0],
        y: startBox.y + event.beforeTranslate[1],
      });
    },
    [commitViewportFromBox, imageBox],
  );

  const handleResizeStart = useCallback(
    (event: OnResizeStart) => {
      resizeStartBoxRef.current = imageBox;
      event.set([imageBox.width, imageBox.height]);
      event.setRatio(sourceImage.width / sourceImage.height);
      event.setMin([baseImageSize.width * minZoom, baseImageSize.height * minZoom]);
      event.setMax([baseImageSize.width * maxEditorZoom, baseImageSize.height * maxEditorZoom]);
      if (event.dragStart) {
        event.dragStart.set([0, 0]);
      }
    },
    [
      baseImageSize.height,
      baseImageSize.width,
      imageBox,
      minZoom,
      sourceImage.height,
      sourceImage.width,
    ],
  );

  const handleResize = useCallback(
    (event: OnResize) => {
      const startBox = resizeStartBoxRef.current ?? imageBox;
      commitViewportFromBox({
        x: startBox.x + event.drag.beforeTranslate[0],
        y: startBox.y + event.drag.beforeTranslate[1],
        width: event.boundingWidth,
        height: event.boundingHeight,
      });
    },
    [commitViewportFromBox, imageBox],
  );

  return (
    <div
      ref={viewportHostRef}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(0,0,0,0))] px-4 py-4"
    >
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
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

      <div
        ref={handleFrameShellRef}
        className="relative"
        style={{
          width: frameViewportSize.width,
          height: frameViewportSize.height,
        }}
      >
        <div className="relative h-full w-full overflow-hidden border border-white/85 bg-background/25 shadow-[0_18px_60px_rgba(5,10,18,0.35)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),rgba(0,0,0,0))]" />

          <div
            ref={imageTargetRef}
            className="absolute touch-none select-none cursor-move"
            style={{
              left: imageBox.x,
              top: imageBox.y,
              width: imageBox.width,
              height: imageBox.height,
            }}
            aria-label={t("workspace.framingTitle")}
          >
            <img
              src={sourceImage.objectUrl}
              alt={sourceImage.name}
              draggable={false}
              className="pointer-events-none h-full w-full select-none object-fill drop-shadow-[0_18px_48px_rgba(15,23,42,0.35)]"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 border border-white/65" />
        </div>

        {frameReady ? (
          <Moveable
            ref={moveableRef}
            target={imageTargetRef}
            container={frameShellElement}
            rootContainer={frameShellElement}
            viewContainer={frameShellElement}
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

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/70 bg-background/76 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
        {t("workspace.framingHint")}
      </div>

      <div className="pointer-events-none absolute bottom-11 right-4 z-10 rounded-md border border-border/70 bg-background/76 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur">
        {isZh ? `缩放范围 ${minZoom.toFixed(2)}x - ${maxEditorZoom.toFixed(0)}x` : `Scale ${minZoom.toFixed(2)}x - ${maxEditorZoom.toFixed(0)}x`}
      </div>
    </div>
  );
};
