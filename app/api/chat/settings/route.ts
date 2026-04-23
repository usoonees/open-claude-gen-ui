import { deleteStoredTavilyCredential, writeStoredTavilyCredential } from "@/lib/tavily-credentials-store";
import { getGenerativeUITrustedModeSummary, writeStoredGenerativeUITrustedModeOverride } from "@/lib/generative-ui-runtime";
import { getTavilySettingsSummary } from "@/lib/tavily-settings";
import type { AppSettingsPayload } from "@/lib/chat-settings-config";

type UpdateSettingsRequest = {
  tavilyApiKey?: string;
  generativeUITrusted?: boolean;
};

function getSettingsPayload(): AppSettingsPayload {
  return {
    tavily: getTavilySettingsSummary(),
    generativeUI: getGenerativeUITrustedModeSummary(),
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
  const hasTavilyApiKey = Boolean(apiKey);
  const hasGenerativeUITrustedValue =
    typeof body.generativeUITrusted === "boolean";

  if (!hasTavilyApiKey && !hasGenerativeUITrustedValue) {
    return new Response(
      "Request body must include tavilyApiKey or generativeUITrusted.",
      { status: 400 }
    );
  }

  if (hasTavilyApiKey) {
    writeStoredTavilyCredential(apiKey);
  }

  if (hasGenerativeUITrustedValue) {
    writeStoredGenerativeUITrustedModeOverride(body.generativeUITrusted as boolean);
  }

  return Response.json(getSettingsPayload());
}

export async function DELETE() {
  deleteStoredTavilyCredential();
  return Response.json(getSettingsPayload());
}
