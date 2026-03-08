import Pica from "pica";

import type { PrepareMode } from "@/types/domain";
import { canvasToBlob, loadImageFromBlob } from "@/utils/image";

const pica = new Pica();
const MAX_EDGE = 2480;

export interface PrepareCanvasInput {
  source: Blob;
  ratio: { width: number; height: number };
  mode: PrepareMode;
}

export interface PrepareCanvasOutput {
  blob: Blob;
  width: number;
  height: number;
}

const resizeIfNeeded = async (canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> => {
  const maxEdge = Math.max(canvas.width, canvas.height);
  if (maxEdge <= MAX_EDGE) {
    return canvas;
  }

  const scale = MAX_EDGE / maxEdge;
  const target = document.createElement("canvas");
  target.width = Math.round(canvas.width * scale);
  target.height = Math.round(canvas.height * scale);
  await pica.resize(canvas, target);
  return target;
};

export const prepareCanvasImage = async ({
  source,
  ratio,
  mode,
}: PrepareCanvasInput): Promise<PrepareCanvasOutput> => {
  const image = await loadImageFromBlob(source);
  const targetRatio = ratio.width / ratio.height;
  const sourceRatio = image.width / image.height;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }

  if (mode === "crop") {
    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;

    if (sourceRatio > targetRatio) {
      sw = Math.round(image.height * targetRatio);
      sx = Math.round((image.width - sw) / 2);
    } else {
      sh = Math.round(image.width / targetRatio);
      sy = Math.round((image.height - sh) / 2);
    }

    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  } else {
    if (sourceRatio > targetRatio) {
      canvas.width = image.width;
      canvas.height = Math.round(image.width / targetRatio);
    } else {
      canvas.width = Math.round(image.height * targetRatio);
      canvas.height = image.height;
    }

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

    const scaleFit = Math.min(canvas.width / image.width, canvas.height / image.height);
    const fitWidth = image.width * scaleFit;
    const fitHeight = image.height * scaleFit;
    const fitX = (canvas.width - fitWidth) / 2;
    const fitY = (canvas.height - fitHeight) / 2;
    ctx.drawImage(image, fitX, fitY, fitWidth, fitHeight);
  }

  const resized = await resizeIfNeeded(canvas);
  const blob = await canvasToBlob(resized, "image/png");

  return {
    blob,
    width: resized.width,
    height: resized.height,
  };
};
