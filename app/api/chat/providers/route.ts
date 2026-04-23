import {
  CHAT_PROVIDER_IDS,
  type ChatProviderId,
} from "@/lib/chat-model-config";
import {
  getDefaultChatModelSelection,
  listChatProviders,
} from "@/lib/chat-models";
import {
  deleteStoredProviderCredential,
  writeStoredProviderCredential,
} from "@/lib/provider-credentials-store";

type UpdateProviderRequest = {
  providerId?: string;
  apiKey?: string;
};

function isChatProviderId(value: string): value is ChatProviderId {
  return CHAT_PROVIDER_IDS.includes(value as ChatProviderId);
}

function getProvidersPayload() {
  return {
    providers: listChatProviders(),
    defaultSelection: getDefaultChatModelSelection(),
  };
}

export async function GET() {
  return Response.json(getProvidersPayload());
}

export async function PUT(request: Request) {
  let body: UpdateProviderRequest;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const providerId = body.providerId?.trim() || "";
  const apiKey = body.apiKey?.trim() || "";

  if (!isChatProviderId(providerId)) {
    return new Response("Unknown providerId.", { status: 400 });
  }

  if (!apiKey) {
    return new Response("API key is required.", { status: 400 });
  }

  writeStoredProviderCredential(providerId, apiKey);
  return Response.json(getProvidersPayload());
}

export async function DELETE(request: Request) {
  let body: UpdateProviderRequest;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const providerId = body.providerId?.trim() || "";

  if (!isChatProviderId(providerId)) {
    return new Response("Unknown providerId.", { status: 400 });
  }

  deleteStoredProviderCredential(providerId);
  return Response.json(getProvidersPayload());
}
