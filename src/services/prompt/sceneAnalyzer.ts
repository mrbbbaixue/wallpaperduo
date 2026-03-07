import type { ImageProvider } from "@/types/provider";
import type { PreparedImage, SceneAnalysis } from "@/types/domain";
import { loadImageFromBlob } from "@/utils/image";

const buildLocalAnalysis = async (prepared: PreparedImage): Promise<SceneAnalysis> => {
  const image = await loadImageFromBlob(prepared.blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }

  canvas.width = Math.max(64, Math.floor(image.width / 8));
  canvas.height = Math.max(64, Math.floor(image.height / 8));
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let luminance = 0;
  let warm = 0;
  let cool = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    luminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    warm += r - b;
    cool += b - r;
  }

  const pixels = imageData.length / 4;
  const avgLuminance = luminance / pixels;
  const mood =
    avgLuminance > 150
      ? "bright daytime mood"
      : avgLuminance > 95
        ? "balanced natural light"
        : "low-light mood";
  const paletteTone = warm > cool ? "warm amber palette" : "cool cyan palette";

  return {
    summary: `Scene with ${mood}, ${paletteTone}, suitable for temporal lighting transitions.`,
    subjects: ["main architecture", "environment details"],
    foreground: ["major subject edges", "light source details"],
    background: ["sky gradient", "ambient depth"],
    lighting: mood,
    palette: [paletteTone, avgLuminance > 130 ? "high-key contrast" : "low-key contrast"],
    risks: ["avoid changing composition geometry", "preserve key object positions"],
  };
};

export const runSceneAnalysis = async (
  provider: ImageProvider,
  prepared: PreparedImage,
  userPrompt: string,
): Promise<SceneAnalysis> => {
  try {
    return await provider.analyzeImage({
      prepared,
      userPrompt,
    });
  } catch {
    return buildLocalAnalysis(prepared);
  }
};
