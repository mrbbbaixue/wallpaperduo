import type { CanvasFraming, PrepareMode } from "@/types/domain";

export interface SizeLike {
  width: number;
  height: number;
}

export interface ResolvedFramingRender {
  outputWidth: number;
  outputHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

const MIN_PAD_ZOOM = 0.35;
const MAX_OUTPUT_EDGE = 2480;
const EPSILON = 0.5;

export const getAspectRatio = (ratio: SizeLike) => ratio.width / ratio.height;

export const getEditorMinZoom = (mode: PrepareMode) => (mode === "crop" ? 1 : MIN_PAD_ZOOM);

export const clampEditorZoom = (zoom: number, mode: PrepareMode) =>
  Math.min(4, Math.max(getEditorMinZoom(mode), Number.isFinite(zoom) ? zoom : 1));

export const getPrepareCanvasSize = (
  source: SizeLike,
  ratio: SizeLike,
  mode: PrepareMode,
): SizeLike => {
  const targetRatio = getAspectRatio(ratio);
  const sourceRatio = source.width / source.height;

  if (mode === "crop") {
    if (sourceRatio > targetRatio) {
      return {
        width: Math.round(source.height * targetRatio),
        height: source.height,
      };
    }

    return {
      width: source.width,
      height: Math.round(source.width / targetRatio),
    };
  }

  if (sourceRatio > targetRatio) {
    return {
      width: source.width,
      height: Math.round(source.width / targetRatio),
    };
  }

  return {
    width: Math.round(source.height * targetRatio),
    height: source.height,
  };
};

export const resolveFramingRender = ({
  source,
  ratio,
  mode,
  framing,
}: {
  source: SizeLike;
  ratio: SizeLike;
  mode: PrepareMode;
  framing?: CanvasFraming;
}): ResolvedFramingRender => {
  const output = getPrepareCanvasSize(source, ratio, mode);
  const baseScale =
    mode === "crop"
      ? Math.max(output.width / source.width, output.height / source.height)
      : Math.min(output.width / source.width, output.height / source.height);
  const zoom = clampEditorZoom(framing?.viewport.zoom ?? 1, mode);
  const offsetX = framing?.viewport.x ?? 0;
  const offsetY = framing?.viewport.y ?? 0;
  const drawWidth = source.width * baseScale * zoom;
  const drawHeight = source.height * baseScale * zoom;

  return {
    outputWidth: output.width,
    outputHeight: output.height,
    drawX: (output.width - drawWidth) / 2 + offsetX * output.width,
    drawY: (output.height - drawHeight) / 2 + offsetY * output.height,
    drawWidth,
    drawHeight,
  };
};

export const hasExpansionArea = ({
  source,
  ratio,
  mode,
  framing,
}: {
  source: SizeLike;
  ratio: SizeLike;
  mode: PrepareMode;
  framing?: CanvasFraming;
}) => {
  if (mode !== "pad") {
    return false;
  }

  const render = resolveFramingRender({ source, ratio, mode, framing });

  return (
    render.drawX > EPSILON ||
    render.drawY > EPSILON ||
    render.drawX + render.drawWidth < render.outputWidth - EPSILON ||
    render.drawY + render.drawHeight < render.outputHeight - EPSILON
  );
};

export const scaleCanvasToMaxEdge = (canvas: SizeLike): SizeLike => {
  const maxEdge = Math.max(canvas.width, canvas.height);
  if (maxEdge <= MAX_OUTPUT_EDGE) {
    return canvas;
  }

  const scale = MAX_OUTPUT_EDGE / maxEdge;
  return {
    width: Math.round(canvas.width * scale),
    height: Math.round(canvas.height * scale),
  };
};
