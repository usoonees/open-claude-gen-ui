import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";
const DEFAULT_MODEL = "ark-code-latest";
export const VOLCENGINE_CODING_SUGGESTED_MODELS = [
  DEFAULT_MODEL,
  "doubao-seed-2.0-code",
  "doubao-seed-2.0-pro",
  "doubao-seed-2.0-lite",
  "doubao-seed-code",
  "glm-4.7",
  "deepseek-v3.2",
  "kimi-k2.5",
  "minimax-m2.5",
] as const;

function readEnv(primary: string, fallback?: string) {
  return process.env[primary] ?? (fallback ? process.env[fallback] : undefined);
}

export function getVolcengineCodingConfig() {
  return {
    apiKey:
      readEnv("VOLCENGINE_CODING_API_KEY", "VOLCENGINE_ARK_CODING_API_KEY") ??
      "",
    baseURL:
      readEnv("VOLCENGINE_CODING_BASE_URL", "VOLCENGINE_ARK_CODING_BASE_URL") ??
      DEFAULT_BASE_URL,
    model:
      readEnv("VOLCENGINE_CODING_MODEL", "VOLCENGINE_ARK_CODING_MODEL") ??
      DEFAULT_MODEL,
  };
}

export function getVolcengineCodingProvider(options?: {
  apiKey?: string;
  baseURL?: string;
}) {
  const config = getVolcengineCodingConfig();

  return createOpenAICompatible({
    name: "volcengine-coding",
    apiKey: options?.apiKey ?? config.apiKey,
    baseURL: options?.baseURL ?? config.baseURL,
    includeUsage: true,
  });
}

export function getVolcengineCodingChatModel(
  modelId = getVolcengineCodingConfig().model
) {
  return getVolcengineCodingProvider().chatModel(modelId);
}
