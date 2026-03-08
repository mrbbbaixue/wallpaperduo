import type { AspectRatioPreset } from "@/types/domain";

export const aspectRatios: AspectRatioPreset[] = [
  { id: "3:1", label: "3:1", width: 3, height: 1 },
  { id: "16:9", label: "16:9", width: 16, height: 9 },
  { id: "16:10", label: "16:10", width: 16, height: 10 },
  { id: "21:9", label: "21:9", width: 21, height: 9 },
  { id: "32:9", label: "32:9", width: 32, height: 9 },
  { id: "custom", label: "Custom", width: 1, height: 1 },
];

export const defaultCustomRatio = { width: 3, height: 1 };
