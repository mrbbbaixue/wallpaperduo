import { Upload } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area, Point, Size } from "react-easy-crop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  clampEditorZoom,
  fitFrameBoxWithinBounds,
  getAspectRatio,
  getEditorMinZoom,
  resolveEditorImageBox,
  resolveZoomHandlePosition,
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

const defaultViewportSize: Size = { width: 1, height: 1 };
const minimumDragDistance = 18;
const zoomHandleSize = 32;

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
  const frameViewportRef = useRef<HTMLDivElement | null>(null);
  const cleanupZoomHandleDragRef = useRef<(() => void) | null>(null);
  const [frameViewportSize, setFrameViewportSize] = useState<Size>(defaultViewportSize);
  const aspect = useMemo(() => getAspectRatio(ratio), [ratio]);
  const minZoom = getEditorMinZoom();
  const zoom = clampEditorZoom(framing.viewport.zoom);
  const crop = useMemo<Point>(
    () => ({
      x: framing.viewport.x * frameViewportSize.width,
      y: framing.viewport.y * frameViewportSize.height,
    }),
    [frameViewportSize.height, frameViewportSize.width, framing.viewport.x, framing.viewport.y],
  );
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
  const visibleImageBox = useMemo(() => {
    const left = Math.max(0, imageBox.x);
    const top = Math.max(0, imageBox.y);
    const right = Math.min(frameViewportSize.width, imageBox.x + imageBox.width);
    const bottom = Math.min(frameViewportSize.height, imageBox.y + imageBox.height);

    return {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }, [frameViewportSize.height, frameViewportSize.width, imageBox]);
  const zoomHandlePosition = useMemo(
    () =>
      resolveZoomHandlePosition({
        visibleBox: visibleImageBox,
        frame: frameViewportSize,
        handleSize: zoomHandleSize,
      }),
    [frameViewportSize, visibleImageBox],
  );

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

  useEffect(
    () => () => {
      cleanupZoomHandleDragRef.current?.();
    },
    [],
  );

  const handleCropChange = useCallback(
    (nextCrop: Point) => {
      onViewportChange({
        x: frameViewportSize.width > 0 ? nextCrop.x / frameViewportSize.width : 0,
        y: frameViewportSize.height > 0 ? nextCrop.y / frameViewportSize.height : 0,
        zoom,
      });
    },
    [frameViewportSize.height, frameViewportSize.width, onViewportChange, zoom],
  );

  const handleZoomChange = useCallback(
    (nextZoom: number) => {
      onViewportChange({
        ...framing.viewport,
        zoom: clampEditorZoom(nextZoom),
      });
    },
    [framing.viewport, onViewportChange],
  );

  const handleCropComplete = useCallback(
    (_: Area, cropAreaPixels: Area) => {
      onCropAreaChange(cropAreaPixels);
    },
    [onCropAreaChange],
  );

  const handleZoomHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const frameRect = frameViewportRef.current?.getBoundingClientRect();
      if (!frameRect) {
        return;
      }

      cleanupZoomHandleDragRef.current?.();

      const imageCenterX = frameRect.left + imageBox.x + imageBox.width / 2;
      const imageCenterY = frameRect.top + imageBox.y + imageBox.height / 2;
      const startDistance = Math.max(
        minimumDragDistance,
        Math.hypot(event.clientX - imageCenterX, event.clientY - imageCenterY),
      );
      const startZoom = zoom;

      const teardown = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        document.body.style.cursor = "";
        cleanupZoomHandleDragRef.current = null;
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextDistance = Math.max(
          minimumDragDistance,
          Math.hypot(moveEvent.clientX - imageCenterX, moveEvent.clientY - imageCenterY),
        );
        handleZoomChange(startZoom * (nextDistance / startDistance));
      };

      const handlePointerUp = () => {
        teardown();
      };

      cleanupZoomHandleDragRef.current = teardown;
      document.body.style.cursor = "nwse-resize";
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [handleZoomChange, imageBox.height, imageBox.width, imageBox.x, imageBox.y, zoom],
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
        ref={frameViewportRef}
        className="relative overflow-hidden border border-white/85 bg-background/25 shadow-[0_18px_60px_rgba(5,10,18,0.35)]"
        style={{
          width: frameViewportSize.width,
          height: frameViewportSize.height,
        }}
      >
        <Cropper
          image={sourceImage.objectUrl}
          crop={crop}
          zoom={zoom}
          rotation={0}
          aspect={aspect}
          minZoom={minZoom}
          maxZoom={4}
          cropShape="rect"
          cropSize={frameViewportSize}
          objectFit="contain"
          showGrid
          restrictPosition={false}
          zoomWithScroll
          onCropChange={handleCropChange}
          onZoomChange={handleZoomChange}
          onCropComplete={handleCropComplete}
          style={{
            containerStyle: {
              background: "transparent",
            },
            cropAreaStyle: {
              border: "1px solid rgba(255,255,255,0.92)",
              boxShadow: "0 0 0 9999px rgba(10, 14, 21, 0.56)",
            },
            mediaStyle: {
              filter: "drop-shadow(0 18px 48px rgba(15, 23, 42, 0.35))",
            },
          }}
          cropperProps={{
            "aria-label": t("workspace.framingTitle"),
          }}
        />

        <div className="pointer-events-none absolute inset-0 border border-white/65" />

        {visibleImageBox.width > 0 && visibleImageBox.height > 0 ? (
          <button
            type="button"
            onPointerDown={handleZoomHandlePointerDown}
            aria-label={t("workspace.zoom")}
            className="absolute z-10 flex items-center justify-center rounded-full border border-white/80 bg-background/88 text-foreground shadow-lg backdrop-blur transition-transform hover:scale-105"
            style={{
              left: zoomHandlePosition.left,
              top: zoomHandlePosition.top,
              width: zoomHandleSize,
              height: zoomHandleSize,
              cursor: "nwse-resize",
            }}
          >
            <span className="pointer-events-none block h-3 w-3 rounded-sm border-r-2 border-t-2 border-current" />
          </button>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/70 bg-background/76 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
        {isZh
          ? "默认居中铺满；拖拽移动图片，滚轮或右下角手柄缩放"
          : "Starts centered and filled; drag to move, use wheel or the corner handle to zoom"}
      </div>
    </div>
  );
};
