import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  CHAT_PROVIDER_IDS,
  type ChatModelSelection,
  type ChatProviderId,
  type ChatProviderOption,
} from "@/lib/chat-model-config";
import { getDeepSeekConfig, getDeepSeekProvider } from "@/lib/deepseek";
import { getOpenRouterConfig, getOpenRouterProvider } from "@/lib/openrouter";
import {
  type ProviderCredentialSource,
  readStoredProviderCredential,
} from "@/lib/provider-credentials-store";
import { getMiniMaxConfig, getMiniMaxProvider } from "@/lib/minimax";
import {
  getVolcengineCodingConfig,
  getVolcengineCodingProvider,
  VOLCENGINE_CODING_SUGGESTED_MODELS,
} from "@/lib/volcengine-coding";
import { getVolcengineConfig, getVolcengineProvider } from "@/lib/volcengine";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_MINIMAX_MODEL = "MiniMax-M2.7";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-5-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";
const DEFAULT_GOOGLE_MODEL = "gemini-2.5-flash";
const ANTHROPIC_VERSION = "2023-06-01";
const MINIMAX_SUGGESTED_MODELS = [
  DEFAULT_MINIMAX_MODEL,
  "MiniMax-M2.7-highspeed",
  "MiniMax-M2.5",
  "MiniMax-M2.5-highspeed",
  "MiniMax-M2.1",
  "MiniMax-M2.1-highspeed",
  "MiniMax-M2",
] as const;
const DEEPSEEK_SUGGESTED_MODELS = [
  DEFAULT_DEEPSEEK_MODEL,
  "deepseek-reasoner",
] as const;

type ResolvedProviderCredential = {
  apiKey: string;
  source: ProviderCredentialSource;
  keyPreview?: string;
  updatedAt?: string;
};

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function isChatProviderId(value: string): value is ChatProviderId {
  return CHAT_PROVIDER_IDS.includes(value as ChatProviderId);
}

function getProviderEnvApiKey(providerId: ChatProviderId) {
  switch (providerId) {
    case "volcengine":
      return getVolcengineConfig().apiKey.trim();
    case "volcengine-coding":
      return getVolcengineCodingConfig().apiKey.trim();
    case "openai":
      return readEnv("OPENAI_API_KEY");
    case "minimax":
      return getMiniMaxConfig().apiKey.trim();
    case "deepseek":
      return getDeepSeekConfig().apiKey.trim();
    case "openrouter":
      return getOpenRouterConfig().apiKey.trim();
    case "anthropic":
      return readEnv("ANTHROPIC_API_KEY");
    case "google":
      return readEnv("GOOGLE_GENERATIVE_AI_API_KEY");
  }
}

function getResolvedProviderCredential(
  providerId: ChatProviderId
): ResolvedProviderCredential | null {
  const storedCredential = readStoredProviderCredential(providerId);

  if (storedCredential?.apiKey) {
    return {
      apiKey: storedCredential.apiKey,
      source: storedCredential.source,
      keyPreview: storedCredential.keyPreview,
      updatedAt: storedCredential.updatedAt,
    };
  }

  const envApiKey = getProviderEnvApiKey(providerId);

  if (!envApiKey) {
    return null;
  }

  return {
    apiKey: envApiKey,
    source: "env",
  };
}

function buildProviderCatalog() {
  const volcengineConfig = getVolcengineConfig();
  const volcengineCodingConfig = getVolcengineCodingConfig();
  const minimaxConfig = getMiniMaxConfig();
  const deepseekConfig = getDeepSeekConfig();
  const openrouterConfig = getOpenRouterConfig();

  const providerCatalog = {
    volcengine: {
      id: "volcengine",
      label: "Volcengine ACK",
      description: "OpenAI-compatible Volcengine Ark or ACK endpoint",
      apiKeyEnv: "VOLCENGINE_ACK_API_KEY",
      canListModels: true,
      defaultModelId: volcengineConfig.model,
      suggestedModels: [volcengineConfig.model],
    },
    "volcengine-coding": {
      id: "volcengine-coding",
      label: "Volcengine Coding",
      description: "OpenAI-compatible Volcengine coding endpoint for Ark Code models",
      apiKeyEnv: "VOLCENGINE_CODING_API_KEY",
      canListModels: false,
      defaultModelId: volcengineCodingConfig.model,
      suggestedModels: uniqueStrings([
        volcengineCodingConfig.model,
        ...VOLCENGINE_CODING_SUGGESTED_MODELS,
      ]),
    },
    openai: {
      id: "openai",
      label: "OpenAI",
      description: "OpenAI Responses and chat models",
      apiKeyEnv: "OPENAI_API_KEY",
      canListModels: true,
      defaultModelId: readEnv("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL,
      suggestedModels: [
        readEnv("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL,
        "gpt-5",
        "gpt-4.1-mini",
      ],
    },
    minimax: {
      id: "minimax",
      label: "MiniMax",
      description: "OpenAI-compatible MiniMax text models",
      apiKeyEnv: "MINIMAX_API_KEY",
      canListModels: false,
      defaultModelId: minimaxConfig.model || DEFAULT_MINIMAX_MODEL,
      suggestedModels: uniqueStrings([
        minimaxConfig.model || DEFAULT_MINIMAX_MODEL,
        ...MINIMAX_SUGGESTED_MODELS,
      ]),
    },
    deepseek: {
      id: "deepseek",
      label: "DeepSeek",
      description: "OpenAI-compatible DeepSeek chat and reasoning models",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      canListModels: true,
      defaultModelId: deepseekConfig.model || DEFAULT_DEEPSEEK_MODEL,
      suggestedModels: uniqueStrings([
        deepseekConfig.model || DEFAULT_DEEPSEEK_MODEL,
        ...DEEPSEEK_SUGGESTED_MODELS,
      ]),
    },
    openrouter: {
      id: "openrouter",
      label: "OpenRouter",
      description: "OpenAI-compatible routed access to models from many providers",
      apiKeyEnv: "OPENROUTER_API_KEY",
      canListModels: true,
      defaultModelId: openrouterConfig.model || DEFAULT_OPENROUTER_MODEL,
      suggestedModels: [openrouterConfig.model || DEFAULT_OPENROUTER_MODEL],
    },
    anthropic: {
      id: "anthropic",
      label: "Anthropic",
      description: "Claude models through Anthropic Messages API",
      apiKeyEnv: "ANTHROPIC_API_KEY",
      canListModels: true,
      defaultModelId: readEnv("ANTHROPIC_MODEL") || DEFAULT_ANTHROPIC_MODEL,
      suggestedModels: [
        readEnv("ANTHROPIC_MODEL") || DEFAULT_ANTHROPIC_MODEL,
        "claude-opus-4-1",
        "claude-3-5-haiku-latest",
      ],
    },
    google: {
      id: "google",
      label: "Google",
      description: "Gemini models through Google Generative AI",
      apiKeyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
      canListModels: true,
      defaultModelId: readEnv("GOOGLE_MODEL") || DEFAULT_GOOGLE_MODEL,
      suggestedModels: [
        readEnv("GOOGLE_MODEL") || DEFAULT_GOOGLE_MODEL,
        "gemini-2.5-pro",
        "gemini-2.0-flash",
      ],
    },
  } satisfies Record<
    ChatProviderId,
    Omit<
      ChatProviderOption,
      "configured" | "credentialSource" | "credentialUpdatedAt" | "keyPreview"
    >
  >;

  return CHAT_PROVIDER_IDS.reduce(
    (accumulator, providerId) => {
      const credential = getResolvedProviderCredential(providerId);

      accumulator[providerId] = {
        ...providerCatalog[providerId],
        configured: Boolean(credential?.apiKey),
        credentialSource: credential?.source ?? null,
        credentialUpdatedAt: credential?.updatedAt,
        keyPreview: credential?.keyPreview,
      };

      return accumulator;
    },
    {} as Record<ChatProviderId, ChatProviderOption>
  );
}

function firstConfiguredProviderId() {
  const providerCatalog = buildProviderCatalog();
  return CHAT_PROVIDER_IDS.find((providerId) => providerCatalog[providerId].configured);
}

function parseOpenAICompatibleModelIds(payload: unknown) {
  const data = Array.isArray((payload as { data?: unknown[] })?.data)
    ? ((payload as { data: unknown[] }).data ?? [])
    : [];

  return uniqueStrings(
    data
      .map((entry) =>
        entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string"
          ? (entry as { id: string }).id
          : ""
      )
      .filter(Boolean)
  ).sort((left, right) => left.localeCompare(right));
}

async function fetchOpenAICompatibleModels(baseURL: string, apiKey: string) {
  const response = await fetch(`${baseURL}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch models: ${response.status}`);
  }

  return parseOpenAICompatibleModelIds(await response.json());
}

async function fetchAnthropicModels(apiKey: string) {
  const models: string[] = [];
  let afterId = "";

  while (true) {
    const url = new URL("https://api.anthropic.com/v1/models");

    if (afterId) {
      url.searchParams.set("after_id", afterId);
    }

    const response = await fetch(url, {
      headers: {
        "anthropic-version": ANTHROPIC_VERSION,
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Unable to fetch models: ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string }>;
      has_more?: boolean;
      last_id?: string;
    };

    models.push(
      ...((payload.data ?? [])
        .map((entry) => entry.id?.trim() || "")
        .filter(Boolean) as string[])
    );

    if (!payload.has_more || !payload.last_id) {
      break;
    }

    afterId = payload.last_id;
  }

  return uniqueStrings(models);
}

async function fetchGoogleModels(apiKey: string) {
  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("pageSize", "200");

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to fetch models: ${response.status}`);
  }

  const payload = (await response.json()) as {
    models?: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  return uniqueStrings(
    (payload.models ?? [])
      .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model) => model.name?.replace(/^models\//, "") ?? "")
      .filter(Boolean)
  );
}

function getRequiredProviderCredential(
  selection: ChatModelSelection
): ResolvedProviderCredential {
  const credential = getResolvedProviderCredential(selection.providerId);

  if (!credential?.apiKey) {
    throw new Error(getMissingProviderKeyMessage(selection));
  }

  return credential;
}

export function listChatProviders() {
  const providerCatalog = buildProviderCatalog();
  return CHAT_PROVIDER_IDS.map((providerId) => providerCatalog[providerId]);
}

export function getChatProviderOption(providerId: ChatProviderId) {
  return buildProviderCatalog()[providerId];
}

export function getDefaultChatModelSelection(): ChatModelSelection {
  const providerCatalog = buildProviderCatalog();
  const providerId = firstConfiguredProviderId() ?? "volcengine";
  return {
    providerId,
    modelId: providerCatalog[providerId].defaultModelId,
  };
}

export function normalizeChatModelSelection(
  value: Partial<ChatModelSelection> | null | undefined
): ChatModelSelection {
  const providerCatalog = buildProviderCatalog();
  const fallback = getDefaultChatModelSelection();
  const providerId =
    typeof value?.providerId === "string" && isChatProviderId(value.providerId)
      ? value.providerId
      : fallback.providerId;
  const modelId = value?.modelId?.trim() || providerCatalog[providerId].defaultModelId;

  return {
    providerId,
    modelId,
  };
}

export function getMissingProviderKeyMessage(selection: ChatModelSelection) {
  switch (selection.providerId) {
    case "volcengine":
      return "No Volcengine API key is configured. Add it in Connect provider or set VOLCENGINE_ACK_API_KEY in .env.local.";
    case "volcengine-coding":
      return "No Volcengine coding API key is configured. Add it in Connect provider or set VOLCENGINE_CODING_API_KEY in .env.local.";
    case "openai":
      return "No OpenAI API key is configured. Add it in Connect provider or set OPENAI_API_KEY in .env.local.";
    case "minimax":
      return "No MiniMax API key is configured. Add it in Connect provider or set MINIMAX_API_KEY in .env.local.";
    case "deepseek":
      return "No DeepSeek API key is configured. Add it in Connect provider or set DEEPSEEK_API_KEY in .env.local.";
    case "openrouter":
      return "No OpenRouter API key is configured. Add it in Connect provider or set OPENROUTER_API_KEY in .env.local.";
    case "anthropic":
      return "No Anthropic API key is configured. Add it in Connect provider or set ANTHROPIC_API_KEY in .env.local.";
    case "google":
      return "No Google API key is configured. Add it in Connect provider or set GOOGLE_GENERATIVE_AI_API_KEY in .env.local.";
  }
}

export function isChatModelSelectionConfigured(selection: ChatModelSelection) {
  return Boolean(getResolvedProviderCredential(selection.providerId));
}

export function getChatLanguageModel(selection: ChatModelSelection): LanguageModel {
  const credential = getRequiredProviderCredential(selection);

  switch (selection.providerId) {
    case "volcengine": {
      const config = getVolcengineConfig();
      return getVolcengineProvider({
        apiKey: credential.apiKey,
        baseURL: config.baseURL,
      }).languageModel(selection.modelId);
    }
    case "volcengine-coding": {
      const config = getVolcengineCodingConfig();
      return getVolcengineCodingProvider({
        apiKey: credential.apiKey,
        baseURL: config.baseURL,
      }).languageModel(selection.modelId);
    }
    case "openai":
      return createOpenAI({
        apiKey: credential.apiKey,
      }).languageModel(selection.modelId);
    case "minimax": {
      const config = getMiniMaxConfig();
      return getMiniMaxProvider({
        apiKey: credential.apiKey,
        baseURL: config.baseURL,
      }).languageModel(selection.modelId);
    }
    case "deepseek": {
      const config = getDeepSeekConfig();
      return getDeepSeekProvider({
        apiKey: credential.apiKey,
        baseURL: config.baseURL,
      }).languageModel(selection.modelId);
    }
    case "openrouter": {
      const config = getOpenRouterConfig();
      return getOpenRouterProvider({
        apiKey: credential.apiKey,
        baseURL: config.baseURL,
      }).languageModel(selection.modelId);
    }
    case "anthropic":
      return createAnthropic({
        apiKey: credential.apiKey,
      }).languageModel(selection.modelId);
    case "google":
      return createGoogleGenerativeAI({
        apiKey: credential.apiKey,
      }).languageModel(selection.modelId);
  }
}

export async function fetchChatProviderModels(providerId: ChatProviderId) {
  const providerCatalog = buildProviderCatalog();
  const credential = getResolvedProviderCredential(providerId);

  if (!credential?.apiKey) {
    throw new Error(
      getMissingProviderKeyMessage({
        providerId,
        modelId: providerCatalog[providerId].defaultModelId,
      })
    );
  }

  switch (providerId) {
    case "volcengine": {
      const config = getVolcengineConfig();
      return fetchOpenAICompatibleModels(config.baseURL, credential.apiKey);
    }
    case "volcengine-coding":
      return uniqueStrings(providerCatalog["volcengine-coding"].suggestedModels);
    case "openai":
      return fetchOpenAICompatibleModels("https://api.openai.com/v1", credential.apiKey);
    case "minimax":
      return uniqueStrings(providerCatalog.minimax.suggestedModels);
    case "deepseek": {
      const config = getDeepSeekConfig();
      return fetchOpenAICompatibleModels(config.baseURL, credential.apiKey);
    }
    case "openrouter": {
      const config = getOpenRouterConfig();
      return fetchOpenAICompatibleModels(config.baseURL, credential.apiKey);
    }
    case "anthropic":
      return fetchAnthropicModels(credential.apiKey);
    case "google":
      return fetchGoogleModels(credential.apiKey);
  }
}
