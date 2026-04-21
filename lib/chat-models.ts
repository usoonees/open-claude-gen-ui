import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { createProviderRegistry } from "ai";
import {
  CHAT_PROVIDER_IDS,
  type ChatModelSelection,
  type ChatProviderId,
  type ChatProviderOption,
} from "@/lib/chat-model-config";
import { getVolcengineProvider, volcengineConfig } from "@/lib/volcengine";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";
const DEFAULT_GOOGLE_MODEL = "gemini-2.5-flash";
const ANTHROPIC_VERSION = "2023-06-01";

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

const providerCatalog = {
  volcengine: {
    id: "volcengine",
    label: "Volcengine ACK",
    description: "OpenAI-compatible Volcengine Ark or ACK endpoint",
    apiKeyEnv: "VOLCENGINE_ACK_API_KEY",
    configured: Boolean(volcengineConfig.apiKey),
    canListModels: true,
    defaultModelId: volcengineConfig.model,
    suggestedModels: [volcengineConfig.model],
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    description: "OpenAI Responses and chat models",
    apiKeyEnv: "OPENAI_API_KEY",
    configured: Boolean(readEnv("OPENAI_API_KEY")),
    canListModels: true,
    defaultModelId: readEnv("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL,
    suggestedModels: [
      readEnv("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL,
      "gpt-5",
      "gpt-4.1-mini",
    ],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    description: "Claude models through Anthropic Messages API",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    configured: Boolean(readEnv("ANTHROPIC_API_KEY")),
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
    configured: Boolean(readEnv("GOOGLE_GENERATIVE_AI_API_KEY")),
    canListModels: true,
    defaultModelId: readEnv("GOOGLE_MODEL") || DEFAULT_GOOGLE_MODEL,
    suggestedModels: [
      readEnv("GOOGLE_MODEL") || DEFAULT_GOOGLE_MODEL,
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ],
  },
} satisfies Record<ChatProviderId, ChatProviderOption>;

const chatProviderRegistry = createProviderRegistry({
  volcengine: getVolcengineProvider(),
  openai,
  anthropic,
  google,
});

function isChatProviderId(value: string): value is ChatProviderId {
  return CHAT_PROVIDER_IDS.includes(value as ChatProviderId);
}

function firstConfiguredProviderId() {
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

export function listChatProviders() {
  return CHAT_PROVIDER_IDS.map((providerId) => providerCatalog[providerId]);
}

export function getChatProviderOption(providerId: ChatProviderId) {
  return providerCatalog[providerId];
}

export function getDefaultChatModelSelection(): ChatModelSelection {
  const providerId = firstConfiguredProviderId() ?? "volcengine";
  return {
    providerId,
    modelId: providerCatalog[providerId].defaultModelId,
  };
}

export function normalizeChatModelSelection(
  value: Partial<ChatModelSelection> | null | undefined
): ChatModelSelection {
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
      return "VOLCENGINE_ACK_API_KEY is empty. Add your Volcengine API key to .env.local before chatting.";
    case "openai":
      return "OPENAI_API_KEY is empty. Add your OpenAI API key to .env.local before chatting.";
    case "anthropic":
      return "ANTHROPIC_API_KEY is empty. Add your Anthropic API key to .env.local before chatting.";
    case "google":
      return "GOOGLE_GENERATIVE_AI_API_KEY is empty. Add your Google API key to .env.local before chatting.";
  }
}

export function isChatModelSelectionConfigured(selection: ChatModelSelection) {
  return providerCatalog[selection.providerId].configured;
}

export function getChatLanguageModel(selection: ChatModelSelection): LanguageModel {
  return chatProviderRegistry.languageModel(
    `${selection.providerId}:${selection.modelId}`
  );
}

export async function fetchChatProviderModels(providerId: ChatProviderId) {
  switch (providerId) {
    case "volcengine":
      if (!volcengineConfig.apiKey) {
        throw new Error(
          getMissingProviderKeyMessage({
            providerId: "volcengine",
            modelId: providerCatalog.volcengine.defaultModelId,
          })
        );
      }

      return fetchOpenAICompatibleModels(
        volcengineConfig.baseURL,
        volcengineConfig.apiKey
      );
    case "openai": {
      const apiKey = readEnv("OPENAI_API_KEY");

      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY is empty. Add your OpenAI API key to .env.local before loading models."
        );
      }

      return fetchOpenAICompatibleModels("https://api.openai.com/v1", apiKey);
    }
    case "anthropic": {
      const apiKey = readEnv("ANTHROPIC_API_KEY");

      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY is empty. Add your Anthropic API key to .env.local before loading models."
        );
      }

      return fetchAnthropicModels(apiKey);
    }
    case "google": {
      const apiKey = readEnv("GOOGLE_GENERATIVE_AI_API_KEY");

      if (!apiKey) {
        throw new Error(
          "GOOGLE_GENERATIVE_AI_API_KEY is empty. Add your Google API key to .env.local before loading models."
        );
      }

      return fetchGoogleModels(apiKey);
    }
  }
}
