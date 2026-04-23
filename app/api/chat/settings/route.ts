import { deleteStoredTavilyCredential, writeStoredTavilyCredential } from "@/lib/tavily-credentials-store";
import { getTavilySettingsSummary } from "@/lib/tavily-settings";

type UpdateSettingsRequest = {
  tavilyApiKey?: string;
};

function getSettingsPayload() {
  return {
    tavily: getTavilySettingsSummary(),
  };
}

export async function GET() {
  return Response.json(getSettingsPayload());
}

export async function PUT(request: Request) {
  let body: UpdateSettingsRequest;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const apiKey = body.tavilyApiKey?.trim() || "";

  if (!apiKey) {
    return new Response("Tavily API key is required.", { status: 400 });
  }

  writeStoredTavilyCredential(apiKey);
  return Response.json(getSettingsPayload());
}

export async function DELETE() {
  deleteStoredTavilyCredential();
  return Response.json(getSettingsPayload());
}
