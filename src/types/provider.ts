// Provider 模板定义
export interface ProviderTemplate {
  id: string;
  name: string;
  baseUrl: string;
  generateUrl?: string;
  defaultModel: string;
  defaultVisionModel?: string;
}

// 用户配置的 Provider
export interface ProviderConfig {
  templateId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  generateUrl?: string;
}

// 预设模板
export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: "ark",
    name: "火山引擎 Ark",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    generateUrl: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
    defaultModel: "Doubao-Seedream-5.0-Lite",
    defaultVisionModel: "doubao-seed-2-0-lite",
  },
  {
    id: "aliyun",
    name: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    generateUrl:
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    defaultModel: "wanx2.1-t2i-turbo",
    defaultVisionModel: "qwen-vl-max",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.0-flash-exp:free",
    defaultVisionModel: "google/gemini-2.0-flash-exp:free",
  },
  {
    id: "custom",
    name: "自定义",
    baseUrl: "",
    defaultModel: "",
  },
];