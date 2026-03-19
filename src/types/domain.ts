export type ProviderKind = "openrouter" | "ark" | "aliyun" | "custom";

export type ThemeVariant = "dark" | "light";
export type TimeVariant = "dawn" | "day" | "dusk" | "night";
export type PrepareMode = "crop" | "pad";

export interface AspectRatioPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface LoadedImage {
  id: string;
  name: string;
  mimeType: string;
  blob: Blob;
  width: number;
  height: number;
  objectUrl: string;
}

export interface PreparedImage {
  id: string;
  sourceImageId: string;
  blob: Blob;
  width: number;
  height: number;
  objectUrl: string;
  mode: PrepareMode;
  ratioId: string;
}

export interface SceneAnalysis {
  summary: string;
  subjects: string[];
  foreground: string[];
  background: string[];
  lighting: string;
  palette: string[];
  risks: string[];
  tone?: "light" | "dark";
  timeOfDay?: TimeVariant;
}

export interface PromptVariant {
  id: string;
  label: string;
  theme: ThemeVariant;
  timeOfDay: TimeVariant;
  prompt: string;
  negativePrompt: string;
  seed: number;
}

export interface PromptPlan {
  generatedAt: string;
  basePrompt: string;
  userOverlayPrompt: string;
  localChanges: string;
  variants: PromptVariant[];
}

export interface GenerationResult {
  variantId: string;
  blob: Blob;
  objectUrl: string;
  width: number;
  height: number;
  provider: ProviderKind;
  source: "provider";
  createdAt: string;
}

export type GenerationStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export interface GenerationTask extends PromptVariant {
  status: GenerationStatus;
  progress: number;
  error?: string;
  result?: GenerationResult;
}

export interface AlignmentResult {
  variantId: string;
  score: number;
  alignedBlob?: Blob;
  alignedObjectUrl?: string;
  status: "idle" | "succeeded" | "failed";
  error?: string;
}

export interface ExportMapping {
  day: string[];
  sunrise: string[];
  sunset: string[];
  night: string[];
}
