import JSZip from "jszip";
import { saveAs } from "file-saver";

import type { GenerationTask } from "@/types/domain";

type ElheifEncoder = {
  encode?: (input: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    quality?: number;
  }) => Promise<Uint8Array>;
};

declare global {
  interface Window {
    elheif?: ElheifEncoder;
  }
}

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("ELHEIF_SCRIPT_LOAD_FAILED"));
    document.head.append(script);
  });

const loadExperimentalEncoder = async (): Promise<ElheifEncoder> => {
  if (!window.elheif) {
    await loadScript("https://unpkg.com/elheif@latest/dist/elheif.js");
  }
  if (!window.elheif?.encode) {
    throw new Error("ELHEIF_ENCODER_UNAVAILABLE");
  }
  return window.elheif;
};

const blobToImageData = async (
  blob: Blob,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("CANVAS_CONTEXT_UNAVAILABLE"));
        return;
      }
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({
        data: data.data,
        width: canvas.width,
        height: canvas.height,
      });
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });

const getSucceededTasks = (tasks: GenerationTask[]) =>
  tasks.filter((task) => task.status === "succeeded" && task.result?.blob);

export const exportHeicWithFallback = async (
  tasks: GenerationTask[],
  fileStem: string,
  experimentalEnabled: boolean,
): Promise<{ format: "heic-zip" | "png-zip"; blob: Blob }> => {
  const succeeded = getSucceededTasks(tasks);
  if (!succeeded.length) {
    throw new Error("NO_GENERATED_IMAGES");
  }
  const zip = new JSZip();

  if (experimentalEnabled) {
    try {
      const encoder = await loadExperimentalEncoder();
      for (let i = 0; i < succeeded.length; i += 1) {
        const task = succeeded[i];
        if (!task.result?.blob) {
          continue;
        }
        const image = await blobToImageData(task.result.blob);
        const encoded = await encoder.encode!({
          data: image.data,
          width: image.width,
          height: image.height,
          quality: 88,
        });
        zip.file(`${fileStem}_${i + 1}.heic`, encoded);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${fileStem}_heic.zip`);
      return { format: "heic-zip", blob };
    } catch {
      // Fallback handled below.
    }
  }

  succeeded.forEach((task, index) => {
    if (task.result?.blob) {
      zip.file(`${fileStem}_${index + 1}.png`, task.result.blob);
    }
  });
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${fileStem}_png_fallback.zip`);
  return { format: "png-zip", blob };
};
