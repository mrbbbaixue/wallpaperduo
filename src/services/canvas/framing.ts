import type { CanvasFraming, CanvasViewport } from "@/types/domain";

export interface SizeLike {
  width: number;
  height: number;
}

export interface BoxLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResolvedDrawTarget {
  outputSize: SizeLike;
  imageBox: BoxLike;
}

const OUTPUT_AREA_PADDING_FRACTION = 0.88;
const MIN_SCALE = 0.35;
const MAX_SCALE = 4;
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

export const getEditorMinScale = () => MIN_SCALE;
export const getEditorMaxScale = () => MAX_SCALE;

export const clampEditorScale = (scale: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number.isFinite(scale) ? scale : 1));

const resolveImageContainScale = (canvas: SizeLike, source: SizeLike): number => {
  if (canvas.width <= 0 || canvas.height <= 0 || source.width <= 0 || source.height <= 0) {
    return 1;
  }
  return Math.min(canvas.width / source.width, canvas.height / source.height);
};

// 亮色取景框在画布内的位置/尺寸：按 ratio 居中，最大化但留 padding 给图片溢出
export const resolveOutputAreaBox = ({
  canvas,
  ratio,
}: {
  canvas: SizeLike;
  ratio: SizeLike;
}): BoxLike => {
  const size = fitFrameBoxWithinBounds(
    {
      width: canvas.width * OUTPUT_AREA_PADDING_FRACTION,
      height: canvas.height * OUTPUT_AREA_PADDING_FRACTION,
    },
    ratio,
  );
  return {
    x: (canvas.width - size.width) / 2,
    y: (canvas.height - size.height) / 2,
    width: size.width,
    height: size.height,
  };
};

// 图片在画布内的位置/尺寸（画布参考系）
export const resolveImageBoxOnCanvas = ({
  canvas,
  source,
  viewport,
}: {
  canvas: SizeLike;
  source: SizeLike;
  viewport?: CanvasViewport;
}): BoxLike => {
  const baseScale = resolveImageContainScale(canvas, source);
  const scale = clampEditorScale(viewport?.scale ?? 1);
  const width = Math.max(1, source.width * baseScale * scale);
  const height = Math.max(1, source.height * baseScale * scale);
  const cx = viewport?.cx ?? 0.5;
  const cy = viewport?.cy ?? 0.5;
  return {
    x: cx * canvas.width - width / 2,
    y: cy * canvas.height - height / 2,
    width,
    height,
  };
};

// 反向：从拖拽/缩放后的图片 box 回推 viewport；cx/cy 钉在 [0,1] 防止图片被拖丢
export const resolveViewportFromImageBox = ({
  canvas,
  source,
  imageBox,
}: {
  canvas: SizeLike;
  source: SizeLike;
  imageBox: BoxLike;
}): CanvasViewport => {
  const baseScale = resolveImageContainScale(canvas, source);
  const safeBaseWidth = Math.max(1, source.width * baseScale);
  const cxRaw = canvas.width > 0 ? (imageBox.x + imageBox.width / 2) / canvas.width : 0.5;
  const cyRaw = canvas.height > 0 ? (imageBox.y + imageBox.height / 2) / canvas.height : 0.5;
  return {
    cx: Math.min(1, Math.max(0, cxRaw)),
    cy: Math.min(1, Math.max(0, cyRaw)),
    scale: clampEditorScale(imageBox.width / safeBaseWidth),
  };
};

// 默认 viewport：图片居中、刚好 contain 亮色框
export const resolveDefaultViewport = ({
  canvas,
  source,
  ratio,
}: {
  canvas: SizeLike;
  source: SizeLike;
  ratio: SizeLike;
}): CanvasViewport => {
  const outputBox = resolveOutputAreaBox({ canvas, ratio });
  const baseScale = resolveImageContainScale(canvas, source);
  const containScale = Math.min(
    outputBox.width / source.width,
    outputBox.height / source.height,
  );
  const safeBaseScale = baseScale > 0 ? baseScale : 1;
  return {
    cx: 0.5,
    cy: 0.5,
    scale: clampEditorScale(containScale / safeBaseScale),
  };
};

export const resolveDefaultCanvasFraming = ({
  canvas,
  source,
  ratio,
}: {
  canvas: SizeLike;
  source: SizeLike;
  ratio: SizeLike;
}): CanvasFraming => ({
  viewport: resolveDefaultViewport({ canvas, source, ratio }),
});

// 图片是否未完全覆盖亮色框（决定输出会带透明外扩区）
export const hasExpansionArea = ({
  canvas,
  source,
  ratio,
  framing,
}: {
  canvas: SizeLike;
  source: SizeLike;
  ratio: SizeLike;
  framing?: CanvasFraming;
}): boolean => {
  const imageBox = resolveImageBoxOnCanvas({ canvas, source, viewport: framing?.viewport });
  const outputBox = resolveOutputAreaBox({ canvas, ratio });
  return (
    imageBox.x > outputBox.x + EPSILON ||
    imageBox.y > outputBox.y + EPSILON ||
    imageBox.x + imageBox.width < outputBox.x + outputBox.width - EPSILON ||
    imageBox.y + imageBox.height < outputBox.y + outputBox.height - EPSILON
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

// 输出像素尺寸：按 ratio 在源图分辨率下取最大覆盖，再约束最大边
export const resolveOutputPixelSize = ({
  source,
  ratio,
}: {
  source: SizeLike;
  ratio: SizeLike;
}): SizeLike => {
  const sourceRatio = source.width / source.height;
  const targetRatio = getAspectRatio(ratio);
  let outputWidth: number;
  let outputHeight: number;
  if (sourceRatio > targetRatio) {
    outputWidth = source.width;
    outputHeight = Math.round(source.width / targetRatio);
  } else {
    outputWidth = Math.round(source.height * targetRatio);
    outputHeight = source.height;
  }
  return scaleCanvasToMaxEdge({ width: outputWidth, height: outputHeight });
};

// prepareCanvas 用：算出图片在输出像素 canvas 上要绘制的 box
export const resolveImageDrawBoxInOutput = ({
  canvas,
  source,
  ratio,
  framing,
}: {
  canvas: SizeLike;
  source: SizeLike;
  ratio: SizeLike;
  framing?: CanvasFraming;
}): ResolvedDrawTarget => {
  const outputSize = resolveOutputPixelSize({ source, ratio });
  const outputBox = resolveOutputAreaBox({ canvas, ratio });
  const imageBox = resolveImageBoxOnCanvas({ canvas, source, viewport: framing?.viewport });
  const factor = outputBox.width > 0 ? outputSize.width / outputBox.width : 1;
  return {
    outputSize,
    imageBox: {
      x: (imageBox.x - outputBox.x) * factor,
      y: (imageBox.y - outputBox.y) * factor,
      width: imageBox.width * factor,
      height: imageBox.height * factor,
    },
  };
};
