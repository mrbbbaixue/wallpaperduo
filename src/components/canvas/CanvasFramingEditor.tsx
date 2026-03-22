import Cropper from "react-easy-crop";
import type { Area, Point, Size } from "react-easy-crop";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { clampEditorZoom, getAspectRatio, getEditorMinZoom } from "@/services/canvas/framing";
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

const defaultFrameSize: Size = { width: 1, height: 1 };

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
  const [frameSize, setFrameSize] = useState<Size>(defaultFrameSize);
  const aspect = useMemo(() => getAspectRatio(ratio), [ratio]);
  const minZoom = getEditorMinZoom(prepareMode);
  const zoom = clampEditorZoom(framing.viewport.zoom, prepareMode);
  const crop = useMemo<Point>(
    () => ({
      x: framing.viewport.x * frameSize.width,
      y: framing.viewport.y * frameSize.height,
    }),
    [frameSize.height, frameSize.width, framing.viewport.x, framing.viewport.y],
  );

  useEffect(() => {
    if (zoom !== framing.viewport.zoom) {
      onViewportChange({
        ...framing.viewport,
        zoom,
      });
    }
  }, [framing.viewport, onViewportChange, zoom]);

  const handleCropChange = useCallback(
    (nextCrop: Point) => {
      onViewportChange({
        x: frameSize.width > 0 ? nextCrop.x / frameSize.width : 0,
        y: frameSize.height > 0 ? nextCrop.y / frameSize.height : 0,
        zoom,
      });
    },
    [frameSize.height, frameSize.width, onViewportChange, zoom],
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

  const handleCropSizeChange = useCallback((nextSize: Size) => {
    setFrameSize(nextSize);
  }, []);

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

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(0,0,0,0))]">
        <Cropper
          image={sourceImage.objectUrl}
          crop={crop}
          zoom={zoom}
          rotation={0}
          aspect={aspect}
          minZoom={minZoom}
          maxZoom={4}
          cropShape="rect"
          objectFit={prepareMode === "crop" ? "cover" : "contain"}
          showGrid
          restrictPosition
          zoomWithScroll
          onCropChange={handleCropChange}
          onZoomChange={handleZoomChange}
          onCropComplete={handleCropComplete}
          onCropSizeChange={handleCropSizeChange}
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
