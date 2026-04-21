import { getDefaultChatModelSelection, listChatProviders } from "@/lib/chat-models";

export async function GET() {
  return Response.json({
    providers: listChatProviders(),
    defaultSelection: getDefaultChatModelSelection(),
  });
}
