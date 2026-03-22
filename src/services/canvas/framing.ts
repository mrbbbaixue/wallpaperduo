import type { CanvasFraming } from "@/types/domain";

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

export interface EditorImageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionedPoint {
  left: number;
  top: number;
}

const MIN_EXPANSION_ZOOM = 0.35;
const MAX_OUTPUT_EDGE = 2480;
const EPSILON = 0.5;

export const getAspectRatio = (ratio: SizeLike) => ratio.width / ratio.height;

export const fitFrameBoxWithinBounds = (bounds: SizeLike, ratio: SizeLike): SizeLike => {
  const boundedWidth = Math.max(1, bounds.width);
  const boundedHeight = Math.max(1, bounds.height);
  const targetAspect = getAspectRatio(ratio);
  const boundsAspect = boundedWidth / boundedHeight;

  if (boundsAspect > targetAspect) {
    return {
      width: Math.max(1, Math.round(boundedHeight * targetAspect)),
      height: boundedHeight,
    };
  }

  return {
    width: boundedWidth,
    height: Math.max(1, Math.round(boundedWidth / targetAspect)),
  };
};

export const getEditorMinZoom = () => MIN_EXPANSION_ZOOM;

export const clampEditorZoom = (zoom: number) =>
  Math.min(4, Math.max(getEditorMinZoom(), Number.isFinite(zoom) ? zoom : 1));

export const getPrepareCanvasSize = (source: SizeLike, ratio: SizeLike): SizeLike => {
  const targetRatio = getAspectRatio(ratio);
  const sourceRatio = source.width / source.height;

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

export const getDefaultExpansionZoom = ({
  source,
  ratio,
}: {
  source: SizeLike;
  ratio: SizeLike;
}) => {
  const output = getPrepareCanvasSize(source, ratio);
  const containScale = Math.min(output.width / source.width, output.height / source.height);
  const coverScale = Math.max(output.width / source.width, output.height / source.height);

  if (containScale <= 0 || !Number.isFinite(containScale) || !Number.isFinite(coverScale)) {
    return 1;
  }

  return clampEditorZoom(coverScale / containScale);
};

export const resolveDefaultCanvasFraming = ({
  source,
  ratio,
}: {
  source: SizeLike;
  ratio: SizeLike;
}): CanvasFraming => ({
  viewport: {
    x: 0,
    y: 0,
    zoom: getDefaultExpansionZoom({ source, ratio }),
  },
});

export const resolveFramingRender = ({
  source,
  ratio,
  framing,
}: {
  source: SizeLike;
  ratio: SizeLike;
  framing?: CanvasFraming;
}): ResolvedFramingRender => {
  const output = getPrepareCanvasSize(source, ratio);
  const baseScale = Math.min(output.width / source.width, output.height / source.height);
  const zoom = clampEditorZoom(
    framing?.viewport.zoom ?? getDefaultExpansionZoom({ source, ratio }),
  );
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

export const resolveEditorImageBox = ({
  source,
  frame,
  framing,
}: {
  source: SizeLike;
  frame: SizeLike;
  framing?: CanvasFraming;
}): EditorImageBox => {
  const baseScale = Math.min(frame.width / source.width, frame.height / source.height);
  const targetRatio = { width: frame.width, height: frame.height };
  const zoom = clampEditorZoom(
    framing?.viewport.zoom ?? getDefaultExpansionZoom({ source, ratio: targetRatio }),
  );
  const offsetX = framing?.viewport.x ?? 0;
  const offsetY = framing?.viewport.y ?? 0;
  const width = source.width * baseScale * zoom;
  const height = source.height * baseScale * zoom;

  return {
    x: (frame.width - width) / 2 + offsetX * frame.width,
    y: (frame.height - height) / 2 + offsetY * frame.height,
    width,
    height,
  };
};

export const resolveZoomHandlePosition = ({
  visibleBox,
  frame,
  handleSize = 32,
  padding = 8,
}: {
  visibleBox: EditorImageBox;
  frame: SizeLike;
  handleSize?: number;
  padding?: number;
}): PositionedPoint => {
  const minLeft = padding;
  const minTop = padding;
  const maxLeft = Math.max(minLeft, frame.width - handleSize - padding);
  const maxTop = Math.max(minTop, frame.height - handleSize - padding);

  return {
    left: Math.min(maxLeft, Math.max(minLeft, visibleBox.x + visibleBox.width - handleSize - padding)),
    top: Math.min(maxTop, Math.max(minTop, visibleBox.y + visibleBox.height - handleSize - padding)),
  };
};

export const hasExpansionArea = ({
  source,
  ratio,
  framing,
}: {
  source: SizeLike;
  ratio: SizeLike;
  framing?: CanvasFraming;
}) => {
  const render = resolveFramingRender({ source, ratio, framing });

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
