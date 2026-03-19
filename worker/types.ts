export interface ProviderConfig {
  templateId?: "openrouter" | "ark" | "aliyun" | "custom";
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  generateUrl?: string;
}

export interface AnalyzeRequest {
  image: string;
  provider: ProviderConfig;
  prompt?: string;
}

export interface GenerateRequest {
  image: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  provider: ProviderConfig;
}

export interface SceneAnalysis {
  summary: string;
  subjects: string[];
  foreground: string[];
  background: string[];
  lighting: string;
  palette: string[];
  risks: string[];
}
