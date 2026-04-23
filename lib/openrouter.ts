import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-5-mini";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getOpenRouterConfig() {
  return {
    apiKey: readEnv("OPENROUTER_API_KEY"),
    baseURL: readEnv("OPENROUTER_BASE_URL") || DEFAULT_BASE_URL,
    model: readEnv("OPENROUTER_MODEL") || DEFAULT_MODEL,
  };
}

export function getOpenRouterProvider(options?: {
  apiKey?: string;
  baseURL?: string;
}) {
  const config = getOpenRouterConfig();

  return createOpenAICompatible({
    name: "openrouter",
    apiKey: options?.apiKey ?? config.apiKey,
    baseURL: options?.baseURL ?? config.baseURL,
    includeUsage: true,
  });
}
