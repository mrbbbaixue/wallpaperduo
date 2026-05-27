import Pica from "pica";

import { resolveImageDrawBoxInOutput, scaleCanvasToMaxEdge } from "@/services/canvas/framing";
import type { CanvasFraming } from "@/types/domain";
import { canvasToBlob, loadImageFromBlob } from "@/utils/image";

const pica = new Pica();

export interface PrepareCanvasInput {
  source: Blob;
  ratio: { width: number; height: number };
  canvas: { width: number; height: number };
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
  canvas: canvasSize,
  framing,
}: PrepareCanvasInput): Promise<PrepareCanvasOutput> => {
  const image = await loadImageFromBlob(source);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }

  const { outputSize, imageBox } = resolveImageDrawBoxInOutput({
    canvas: canvasSize,
    source: { width: image.width, height: image.height },
    ratio,
    framing,
  });

  canvas.width = outputSize.width;
  canvas.height = outputSize.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, imageBox.x, imageBox.y, imageBox.width, imageBox.height);

  const resized = await resizeIfNeeded(canvas);
  const blob = await canvasToBlob(resized, "image/png");

  return {
    blob,
    width: resized.width,
    height: resized.height,
  };
};
