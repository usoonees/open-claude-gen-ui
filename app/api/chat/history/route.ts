import { deleteChat, listChats, readChat, renameChat, writeChat } from "@/lib/chat-store";
import { chatSystemPrompt } from "@/lib/chat-agent";
import type { ChatUIMessage } from "@/lib/chat-message";
import { getChatToolTraceList } from "@/lib/chat-tools";

type SaveRequest = {
  id?: string;
  messages?: ChatUIMessage[];
};

type RenameRequest = {
  id?: string;
  title?: string;
};

function getIdFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("id")?.trim() || "";
}

function buildChatTrace() {
  return {
    systemPrompt: chatSystemPrompt,
    tools: getChatToolTraceList(),
    capturedAt: new Date().toISOString(),
  };
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

  return Response.json(
    await writeChat(body.id, body.messages, {
      trace: buildChatTrace(),
    })
  );
}

export async function PATCH(request: Request) {
  let body: RenameRequest;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  if (!body.id) {
    return new Response("Request body must include an id.", { status: 400 });
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    return new Response("Request body must include a non-empty title.", {
      status: 400,
    });
  }

  try {
    const chat = await renameChat(body.id, body.title);

    if (!chat) {
      return new Response("Chat not found.", { status: 404 });
    }

    return Response.json(chat);
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unable to rename chat.",
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const id = getIdFromRequest(request);

  if (!id) {
    return new Response("Query must include an id.", { status: 400 });
  }

  await deleteChat(id);

  return new Response(null, { status: 204 });
}
