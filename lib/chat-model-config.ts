export const CHAT_PROVIDER_IDS = [
  "volcengine",
  "volcengine-coding",
  "openai",
  "minimax",
  "deepseek",
  "openrouter",
  "anthropic",
  "google",
] as const;

export type ChatProviderId = (typeof CHAT_PROVIDER_IDS)[number];

export type ChatModelSelection = {
  providerId: ChatProviderId;
  modelId: string;
};

export type ChatProviderOption = {
  id: ChatProviderId;
  label: string;
  description: string;
  apiKeyEnv: string;
  configured: boolean;
  credentialSource: "frontend" | "env" | null;
  credentialUpdatedAt?: string;
  keyPreview?: string;
  canListModels: boolean;
  defaultModelId: string;
  suggestedModels: string[];
};
