import type { PromptVariant } from "@/types/domain";
import { canvasToBlob, loadImageFromBlob } from "@/utils/image";

const overlays: Record<PromptVariant["timeOfDay"], { color: string; alpha: number }> = {
  dawn: { color: "#ffbd7a", alpha: 0.2 },
  day: { color: "#f8fafc", alpha: 0.08 },
  dusk: { color: "#ff8a3c", alpha: 0.18 },
  night: { color: "#2f3b7d", alpha: 0.26 },
};

export const renderLocalFallbackVariant = async (
  source: Blob,
  variant: PromptVariant,
): Promise<Blob> => {
  const image = await loadImageFromBlob(source);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }

  canvas.width = image.width;
  canvas.height = image.height;

  const brightness = variant.theme === "dark" ? 0.78 : 1.08;
  const saturation = variant.theme === "dark" ? 1.06 : 0.95;
  const contrast = variant.theme === "dark" ? 1.08 : 1.02;
  ctx.filter = `brightness(${brightness}) saturate(${saturation}) contrast(${contrast})`;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  const overlay = overlays[variant.timeOfDay];
  ctx.fillStyle = overlay.color;
  ctx.globalAlpha = overlay.alpha;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  if (variant.timeOfDay === "night") {
    ctx.fillStyle = "rgba(250,245,210,0.14)";
    ctx.beginPath();
    ctx.arc(
      canvas.width * 0.83,
      canvas.height * 0.22,
      Math.max(40, canvas.width * 0.035),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  if (variant.timeOfDay === "day") {
    ctx.fillStyle = "rgba(255,245,180,0.16)";
    ctx.beginPath();
    ctx.arc(
      canvas.width * 0.8,
      canvas.height * 0.2,
      Math.max(45, canvas.width * 0.04),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  return canvasToBlob(canvas, "image/png");
};
