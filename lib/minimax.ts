import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "https://api.minimaxi.com/v1";
const DEFAULT_MODEL = "MiniMax-M2.7";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getMiniMaxConfig() {
  return {
    apiKey: readEnv("MINIMAX_API_KEY"),
    baseURL: readEnv("MINIMAX_BASE_URL") || DEFAULT_BASE_URL,
    model: readEnv("MINIMAX_MODEL") || DEFAULT_MODEL,
  };
}

export function getMiniMaxProvider(options?: {
  apiKey?: string;
  baseURL?: string;
}) {
  const config = getMiniMaxConfig();

  return createOpenAICompatible({
    name: "minimax",
    apiKey: options?.apiKey ?? config.apiKey,
    baseURL: options?.baseURL ?? config.baseURL,
    includeUsage: true,
  });
}
