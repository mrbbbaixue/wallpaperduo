import JSZip from "jszip";
import { saveAs } from "file-saver";

import type { AlignmentResult, ExportMapping, GenerationTask } from "@/types/domain";

interface DdwExportInput {
  tasks: GenerationTask[];
  mapping: ExportMapping;
  alignmentResults?: Record<string, AlignmentResult>;
  fileStem: string;
}

interface ThemeJson {
  imageFilename: string;
  dayImageList: number[];
  nightImageList: number[];
  sunriseImageList?: number[];
  sunsetImageList?: number[];
  dayHighlight?: string;
  nightHighlight?: string;
}

const pickBlob = (task: GenerationTask, aligned?: AlignmentResult): Blob | undefined => {
  if (aligned?.status === "succeeded" && aligned.alignedBlob) {
    return aligned.alignedBlob;
  }
  return task.result?.blob;
};

const ensureRequiredLists = (theme: ThemeJson, imageCount: number): ThemeJson => {
  if (!theme.dayImageList.length && imageCount > 0) {
    theme.dayImageList = [1];
  }
  if (!theme.nightImageList.length && imageCount > 0) {
    theme.nightImageList = [Math.min(imageCount, 1)];
  }
  return theme;
};

export const buildDdwBlob = async (input: DdwExportInput): Promise<Blob> => {
  const selectedTasks = input.tasks.filter(
    (task) => task.status === "succeeded" && task.result?.blob,
  );
  if (!selectedTasks.length) {
    throw new Error("NO_GENERATED_IMAGES");
  }

  const zip = new JSZip();
  const indexByVariantId = new Map<string, number>();

  for (let i = 0; i < selectedTasks.length; i += 1) {
    const task = selectedTasks[i];
    const index = i + 1;
    const blob = pickBlob(task, input.alignmentResults?.[task.id]);
    if (!blob) {
      continue;
    }
    const filename = `${input.fileStem}_${index}.png`;
    indexByVariantId.set(task.id, index);
    zip.file(filename, blob);
  }

  const mapIds = (ids: string[]) =>
    ids
      .map((id) => indexByVariantId.get(id))
      .filter((value): value is number => typeof value === "number");

  const themeJson: ThemeJson = {
    imageFilename: `${input.fileStem}_*.png`,
    dayImageList: mapIds(input.mapping.day),
    sunriseImageList: mapIds(input.mapping.sunrise),
    sunsetImageList: mapIds(input.mapping.sunset),
    nightImageList: mapIds(input.mapping.night),
    dayHighlight: "#f4d3a6",
    nightHighlight: "#6f8bb4",
  };

  const normalized = ensureRequiredLists(themeJson, indexByVariantId.size);
  if (!normalized.sunriseImageList?.length) {
    delete normalized.sunriseImageList;
  }
  if (!normalized.sunsetImageList?.length) {
    delete normalized.sunsetImageList;
  }

  zip.file("theme.json", JSON.stringify(normalized, null, 2));
  return zip.generateAsync({ type: "blob" });
};

export const downloadDdw = async (input: DdwExportInput): Promise<Blob> => {
  const blob = await buildDdwBlob(input);
  saveAs(blob, `${input.fileStem}.ddw`);
  return blob;
};
