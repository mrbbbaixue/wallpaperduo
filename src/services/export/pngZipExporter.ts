import { saveAs } from "file-saver";
import JSZip from "jszip";

import type { AlignmentResult, GenerationTask } from "@/types/domain";

interface PngZipExportInput {
  tasks: GenerationTask[];
  alignmentResults?: Record<string, AlignmentResult>;
  fileStem: string;
}

const pickBlob = (task: GenerationTask, aligned?: AlignmentResult): Blob | undefined => {
  if (aligned?.status === "succeeded" && aligned.alignedBlob) {
    return aligned.alignedBlob;
  }
  return task.result?.blob;
};

export const buildPngZipBlob = async (input: PngZipExportInput): Promise<Blob> => {
  const succeeded = input.tasks.filter((task) => task.status === "succeeded" && task.result?.blob);
  if (!succeeded.length) {
    throw new Error("NO_GENERATED_IMAGES");
  }

  const zip = new JSZip();
  succeeded.forEach((task, index) => {
    const blob = pickBlob(task, input.alignmentResults?.[task.id]);
    if (!blob) {
      return;
    }
    const safeLabel = task.label.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const suffix = safeLabel || `variant_${index + 1}`;
    zip.file(`${input.fileStem}_${suffix}.png`, blob);
  });

  return zip.generateAsync({ type: "blob" });
};

export const downloadPngZip = async (input: PngZipExportInput): Promise<Blob> => {
  const blob = await buildPngZipBlob(input);
  saveAs(blob, `${input.fileStem}.zip`);
  return blob;
};
