import {
  readChatPreferences,
  writeChatPreferences,
} from "@/lib/chat-preferences-store";
import {
  isShowcaseOnlyEnabled,
  showcaseReadOnlyResponse,
} from "@/lib/showcase-mode";

type SavePreferencesRequest = {
  hiddenModelKeys?: unknown;
};

export async function GET() {
  return Response.json(await readChatPreferences());
}

export async function PUT(request: Request) {
  if (isShowcaseOnlyEnabled()) {
    return showcaseReadOnlyResponse();
  }

  let body: SavePreferencesRequest;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  return Response.json(
    await writeChatPreferences({
      hiddenModelKeys: body.hiddenModelKeys,
    })
  );
}
