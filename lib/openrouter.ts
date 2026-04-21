import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-5-mini";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export const openrouterConfig = {
  apiKey: readEnv("OPENROUTER_API_KEY"),
  baseURL: readEnv("OPENROUTER_BASE_URL") || DEFAULT_BASE_URL,
  model: readEnv("OPENROUTER_MODEL") || DEFAULT_MODEL,
};

const openrouter = createOpenAICompatible({
  name: "openrouter",
  apiKey: openrouterConfig.apiKey,
  baseURL: openrouterConfig.baseURL,
  includeUsage: true,
});

export function getOpenRouterProvider() {
  return openrouter;
}
