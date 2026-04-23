import {
  CHAT_PROVIDER_IDS,
  type ChatProviderId,
} from "@/lib/chat-model-config";
import {
  fetchChatProviderModels,
  getChatProviderOption,
  getMissingProviderKeyMessage,
} from "@/lib/chat-models";
import {
  readStoredProviderModels,
  writeStoredProviderModels,
} from "@/lib/provider-model-cache";

function getProviderId(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("providerId")?.trim() || "";
}

function shouldForceRefresh(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("force") === "1";
}

export async function GET(request: Request) {
  const providerId = getProviderId(request);
  const forceRefresh = shouldForceRefresh(request);

  if (!providerId) {
    return new Response("Query must include a providerId.", { status: 400 });
  }

  if (!CHAT_PROVIDER_IDS.includes(providerId as ChatProviderId)) {
    return new Response("Unknown providerId.", { status: 400 });
  }

  const provider = getChatProviderOption(providerId as ChatProviderId);

  if (!provider.canListModels) {
    return Response.json({ models: [], source: "manual" });
  }

  if (!provider.configured) {
    return new Response(
      getMissingProviderKeyMessage({
        providerId: provider.id,
        modelId: provider.defaultModelId,
      }),
      { status: 503 }
    );
  }

  if (!forceRefresh) {
    const storedModels = await readStoredProviderModels(providerId as ChatProviderId);

    if (storedModels && storedModels.models.length > 0) {
      return Response.json({
        models: storedModels.models,
        source: "server-cache",
        fetchedAt: storedModels.updatedAt,
      });
    }
  }

  try {
    const models = await fetchChatProviderModels(providerId as ChatProviderId);
    const storedModels = await writeStoredProviderModels(
      providerId as ChatProviderId,
      models
    );

    return Response.json({
      models: storedModels.models,
      source: "provider-api",
      fetchedAt: storedModels.updatedAt,
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unable to load models.",
      { status: 503 }
    );
  }
}
