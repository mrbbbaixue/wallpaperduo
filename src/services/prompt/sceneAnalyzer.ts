import type { PreparedImage, SceneAnalysis } from "@/types/domain";
import type { ProviderConfig } from "@/types/provider";
import { analyzePreparedImage } from "@/services/api/workerClient";
import { toUserError } from "@/utils/error";
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
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    luminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    warm += r - b;
    cool += b - r;
    rSum += r;
    gSum += g;
    bSum += b;
  }

  const pixels = imageData.length / 4;
  const avgLuminance = luminance / pixels;
  const avgR = Math.round(rSum / pixels);
  const avgG = Math.round(gSum / pixels);
  const avgB = Math.round(bSum / pixels);

  // Tone detection
  const tone: "light" | "dark" = avgLuminance > 128 ? "light" : "dark";

  // Time of day inference based on color temperature and luminance
  const warmRatio = warm / pixels;
  let inferredTime: "dawn" | "day" | "dusk" | "night";
  if (avgLuminance < 60) {
    inferredTime = "night";
  } else if (avgLuminance < 100 && warmRatio > 20) {
    inferredTime = "dusk";
  } else if (avgLuminance < 120 && warmRatio > 10) {
    inferredTime = "dawn";
  } else {
    inferredTime = "day";
  }

  const mood =
    avgLuminance > 150
      ? "明亮的日间光照"
      : avgLuminance > 95
        ? "均衡的自然光线"
        : "低光环境";
  const paletteTone = warm > cool ? "暖色调" : "冷色调";

  return {
    summary: `${mood}场景，${paletteTone}，适合进行时段光照变换。`,
    subjects: ["主体建筑/物体", "环境细节"],
    foreground: ["前景主体边缘", "光源细节"],
    background: ["天空渐变", "纵深氛围"],
    lighting: mood,
    palette: [paletteTone, `rgb(${avgR},${avgG},${avgB})`],
    risks: ["避免改变构图几何", "保持关键物体位置"],
    tone,
    timeOfDay: inferredTime,
  };
};

export interface SceneAnalysisRunResult {
  analysis: SceneAnalysis;
  source: "remote" | "local-fallback";
  warning?: string;
}

export const runSceneAnalysis = async (
  provider: ProviderConfig,
  prepared: PreparedImage,
  userPrompt: string,
): Promise<SceneAnalysisRunResult> => {
  try {
    const result = await analyzePreparedImage(prepared, provider, userPrompt);
    // Ensure tone and timeOfDay are present (may be missing from provider response)
    if (!result.tone || !result.timeOfDay) {
      const localAnalysis = await buildLocalAnalysis(prepared);
      return {
        source: "remote",
        analysis: {
          ...result,
          tone: result.tone ?? localAnalysis.tone,
          timeOfDay: result.timeOfDay ?? localAnalysis.timeOfDay,
        },
      };
    }
    return {
      source: "remote",
      analysis: result,
    };
  } catch (error) {
    return {
      source: "local-fallback",
      warning: toUserError(error),
      analysis: await buildLocalAnalysis(prepared),
    };
  }
};
