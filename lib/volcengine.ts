import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_MODEL = "doubao-seed-2-0-pro-260215";

function readEnv(primary: string, fallback?: string) {
  return process.env[primary] ?? (fallback ? process.env[fallback] : undefined);
}

export const volcengineConfig = {
  apiKey: readEnv("VOLCENGINE_ACK_API_KEY", "VOLCENGINE_ARK_API_KEY") ?? "",
  baseURL:
    readEnv("VOLCENGINE_ACK_BASE_URL", "VOLCENGINE_ARK_BASE_URL") ??
    DEFAULT_BASE_URL,
  model:
    readEnv("VOLCENGINE_ACK_MODEL", "VOLCENGINE_ARK_MODEL") ?? DEFAULT_MODEL,
};

const volcengine = createOpenAICompatible({
  name: "volcengine-ack",
  apiKey: volcengineConfig.apiKey,
  baseURL: volcengineConfig.baseURL,
  includeUsage: true,
});

export function getVolcengineChatModel() {
  return volcengine.chatModel(volcengineConfig.model);
}
