import type { UIMessage } from "ai";
import { listChats, readChat, writeChat } from "@/lib/chat-store";

type SaveRequest = {
  id?: string;
  messages?: UIMessage[];
};

function getIdFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("id")?.trim() || "";
}

export async function GET(request: Request) {
  const id = getIdFromRequest(request);

  if (id) {
    return Response.json(await readChat(id));
  }

  return Response.json({ chats: await listChats() });
}

export async function PUT(request: Request) {
  let body: SaveRequest;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return new Response("Request body must include a messages array.", {
      status: 400,
    });
  }

  if (!body.id) {
    return new Response("Request body must include an id.", { status: 400 });
  }

  return Response.json(await writeChat(body.id, body.messages));
}
