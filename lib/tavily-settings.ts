import type { TavilySettingsSummary } from "@/lib/chat-settings-config";
import { readStoredTavilyCredential } from "@/lib/tavily-credentials-store";

const DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com";

type ResolvedTavilyCredential = {
  apiKey: string;
  source: "frontend" | "env";
  keyPreview?: string;
  updatedAt?: string;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getResolvedTavilyCredential(): ResolvedTavilyCredential | null {
  const storedCredential = readStoredTavilyCredential();

  if (storedCredential?.apiKey) {
    return {
      apiKey: storedCredential.apiKey,
      source: storedCredential.source,
      keyPreview: storedCredential.keyPreview,
      updatedAt: storedCredential.updatedAt,
    };
  }

  const envApiKey = readEnv("TAVILY_API_KEY");

  if (!envApiKey) {
    return null;
  }

  return {
    apiKey: envApiKey,
    source: "env",
  };
}

export function getTavilyRuntimeConfig() {
  return {
    apiKey: getResolvedTavilyCredential()?.apiKey ?? "",
    baseURL: readEnv("TAVILY_BASE_URL") || DEFAULT_TAVILY_BASE_URL,
  };
}

export function getTavilySettingsSummary(): TavilySettingsSummary {
  const credential = getResolvedTavilyCredential();

  return {
    apiKeyEnv: "TAVILY_API_KEY",
    configured: Boolean(credential?.apiKey),
    credentialSource: credential?.source ?? null,
    credentialUpdatedAt: credential?.updatedAt,
    keyPreview: credential?.keyPreview,
    baseURL: getTavilyRuntimeConfig().baseURL,
  };
}
