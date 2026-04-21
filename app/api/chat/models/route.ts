import type { ChatProviderId } from "@/lib/chat-model-config";
import { fetchChatProviderModels, getChatProviderOption } from "@/lib/chat-models";

function getProviderId(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("providerId")?.trim() || "";
}

export async function GET(request: Request) {
  const providerId = getProviderId(request);

  if (!providerId) {
    return new Response("Query must include a providerId.", { status: 400 });
  }

  if (!["volcengine", "openai", "anthropic", "google"].includes(providerId)) {
    return new Response("Unknown providerId.", { status: 400 });
  }

  const provider = getChatProviderOption(providerId as ChatProviderId);

  if (!provider.canListModels) {
    return Response.json({ models: [], source: "manual" });
  }

  try {
    const models = await fetchChatProviderModels(providerId as ChatProviderId);
    return Response.json({
      models,
      source: "provider-api",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unable to load models.",
      { status: 503 }
    );
  }
}
