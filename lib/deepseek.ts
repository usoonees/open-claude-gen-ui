import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getDeepSeekConfig() {
  return {
    apiKey: readEnv("DEEPSEEK_API_KEY"),
    baseURL: readEnv("DEEPSEEK_BASE_URL") || DEFAULT_BASE_URL,
    model: readEnv("DEEPSEEK_MODEL") || DEFAULT_MODEL,
  };
}

export function getDeepSeekProvider(options?: {
  apiKey?: string;
  baseURL?: string;
}) {
  const config = getDeepSeekConfig();

  return createOpenAICompatible({
    name: "deepseek",
    apiKey: options?.apiKey ?? config.apiKey,
    baseURL: options?.baseURL ?? config.baseURL,
    includeUsage: true,
  });
}
