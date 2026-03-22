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
} from "@/services/canvas/framing";
import type {
  CanvasCropArea,
  CanvasFraming,
  CanvasViewport,
  LoadedImage,
  PrepareMode,
} from "@/types/domain";

interface CanvasFramingEditorProps {
  sourceImage: LoadedImage;
  ratio: { width: number; height: number };
  prepareMode: PrepareMode;
  framing: CanvasFraming;
  onViewportChange: (viewport: CanvasViewport) => void;
  onCropAreaChange: (cropAreaPixels?: CanvasCropArea) => void;
  onReset: () => void;
}

const defaultViewportSize: Size = { width: 1, height: 1 };

export const CanvasFramingEditor = ({
  sourceImage,
  ratio,
  prepareMode,
  framing,
  onViewportChange,
  onCropAreaChange,
  onReset,
}: CanvasFramingEditorProps) => {
  const { t } = useTranslation();
  const viewportHostRef = useRef<HTMLDivElement | null>(null);
  const [frameViewportSize, setFrameViewportSize] = useState<Size>(defaultViewportSize);
  const aspect = useMemo(() => getAspectRatio(ratio), [ratio]);
  const minZoom = getEditorMinZoom(prepareMode);
  const zoom = clampEditorZoom(framing.viewport.zoom, prepareMode);
  const crop = useMemo<Point>(
    () => ({
      x: framing.viewport.x * frameViewportSize.width,
      y: framing.viewport.y * frameViewportSize.height,
    }),
    [frameViewportSize.height, frameViewportSize.width, framing.viewport.x, framing.viewport.y],
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
        zoom: clampEditorZoom(nextZoom, prepareMode),
      });
    },
    [framing.viewport, onViewportChange, prepareMode],
  );

  const handleCropComplete = useCallback(
    (_: Area, cropAreaPixels: Area) => {
      onCropAreaChange(cropAreaPixels);
    },
    [onCropAreaChange],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-background/78 px-4 py-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t("workspace.framingTitle")}
          </p>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {t("workspace.framingHint")}
          </p>
          <p className="text-xs text-muted-foreground/90">
            {prepareMode === "crop"
              ? t("workspace.modeCropHint")
              : t("workspace.modePadHint")}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onReset}>
          {t("workspace.resetFraming")}
        </Button>
      </div>

      <div
        ref={viewportHostRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(0,0,0,0))] px-4 py-4"
      >
        <div
          className="relative overflow-hidden border border-border/50 bg-background/25"
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
            objectFit={prepareMode === "crop" ? "cover" : "contain"}
            showGrid
            restrictPosition
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
        </div>
      </div>

      <div className="border-t border-border/70 bg-background/78 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="min-w-0 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t("workspace.zoom")}
          </span>
          <input
            type="range"
            min={minZoom}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(event) => handleZoomChange(Number(event.currentTarget.value))}
            className="h-2 w-full accent-foreground"
            aria-label={t("workspace.zoom")}
          />
          <span className="w-12 text-right text-xs text-muted-foreground">{zoom.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
};
