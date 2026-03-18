import type { PreparedImage, PromptVariant, ProviderKind, SceneAnalysis } from "@/types/domain";
export type { ProviderKind } from "@/types/domain";

export interface ConnectivityResult {
  ok: boolean;
  provider: ProviderKind;
  latencyMs: number;
  message: string;
  details?: string;
}

export interface ComfyNodeMapping {
  positivePromptNodeId: string;
  negativePromptNodeId: string;
  seedNodeId: string;
  widthNodeId: string;
  heightNodeId: string;
  inputImageNodeId?: string;
  timeVariableNodeId?: string;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  timeoutMs: number;
  concurrency: number;
  extraHeaders: string;
}

export interface ComfyProviderConfig extends ProviderConfig {
  workflowTemplate: string;
  nodeMapping: ComfyNodeMapping;
}

export type ProviderConfigRecord = {
  openrouter: ProviderConfig;
  ark: ProviderConfig;
  aliyun: ProviderConfig;
  comfyui: ComfyProviderConfig;
};

export interface AnalyzeInput {
  prepared: PreparedImage;
  userPrompt: string;
}

export interface GenerateInput {
  prepared: PreparedImage;
  variant: PromptVariant;
}

export interface GeneratedPayload {
  blob: Blob;
  provider: ProviderKind;
  source: "provider" | "local-fallback";
}

export interface ImageProvider {
  name: ProviderKind;
  testConnection(): Promise<ConnectivityResult>;
  analyzeImage(input: AnalyzeInput): Promise<SceneAnalysis>;
  generateVariant(input: GenerateInput): Promise<GeneratedPayload>;
}
