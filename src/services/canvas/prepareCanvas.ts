import Pica from "pica";

import { resolveFramingRender, scaleCanvasToMaxEdge } from "@/services/canvas/framing";
import type { CanvasFraming, PrepareMode } from "@/types/domain";
import { canvasToBlob, loadImageFromBlob } from "@/utils/image";

const pica = new Pica();

export interface PrepareCanvasInput {
  source: Blob;
  ratio: { width: number; height: number };
  mode: PrepareMode;
  framing?: CanvasFraming;
}

export interface PrepareCanvasOutput {
  blob: Blob;
  width: number;
  height: number;
}

const resizeIfNeeded = async (canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> => {
  const resizedSize = scaleCanvasToMaxEdge(canvas);
  if (resizedSize.width === canvas.width && resizedSize.height === canvas.height) {
    return canvas;
  }

  const target = document.createElement("canvas");
  target.width = resizedSize.width;
  target.height = resizedSize.height;
  await pica.resize(canvas, target);
  return target;
};

export const prepareCanvasImage = async ({
  source,
  ratio,
  mode,
  framing,
}: PrepareCanvasInput): Promise<PrepareCanvasOutput> => {
  const image = await loadImageFromBlob(source);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }

  const render = resolveFramingRender({
    source: {
      width: image.width,
      height: image.height,
    },
    ratio,
    mode,
    framing,
  });

  canvas.width = render.outputWidth;
  canvas.height = render.outputHeight;

  if (mode === "crop") {
    ctx.drawImage(image, render.drawX, render.drawY, render.drawWidth, render.drawHeight);
  } else {
    const scaleBg = Math.max(canvas.width / image.width, canvas.height / image.height);
    const bgWidth = image.width * scaleBg;
    const bgHeight = image.height * scaleBg;
    const bgX = (canvas.width - bgWidth) / 2;
    const bgY = (canvas.height - bgHeight) / 2;

    ctx.filter = "blur(36px) brightness(0.82)";
    ctx.drawImage(image, bgX, bgY, bgWidth, bgHeight);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(12,16,20,0.28)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(image, render.drawX, render.drawY, render.drawWidth, render.drawHeight);
  }

  const resized = await resizeIfNeeded(canvas);
  const blob = await canvasToBlob(resized, "image/png");

  return {
    blob,
    width: resized.width,
    height: resized.height,
  };
};
