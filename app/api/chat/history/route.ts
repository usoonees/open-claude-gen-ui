import {
  deleteChat,
  listChats,
  readChat,
  renameChat,
  resolvePendingGeneratedTitle,
  writeChat,
} from "@/lib/chat-store";
import {
  getChatSystemPrompt,
} from "@/lib/chat-agent";
import type { ChatModelSelection } from "@/lib/chat-model-config";
import type { ChatUIMessage } from "@/lib/chat-message";
import {
  getDefaultChatModelSelection,
  normalizeChatModelSelection,
} from "@/lib/chat-models";
import {
  getExampleChatById,
  listExampleChatSummaries,
} from "@/lib/example-chats";
import { isGenerativeUITrustedModeEnabled } from "@/lib/generative-ui-runtime";
import { getChatToolTraceList } from "@/lib/chat-tools";
import {
  isShowcaseOnlyEnabled,
  showcaseReadOnlyResponse,
} from "@/lib/showcase-mode";
import { after } from "next/server";

type SaveRequest = {
  id?: string;
  messages?: ChatUIMessage[];
  modelSelection?: ChatModelSelection;
};

type RenameRequest = {
  id?: string;
  title?: string;
};

function getIdFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("id")?.trim() || "";
}

function buildChatTrace(modelSelection: ChatModelSelection) {
  const now = new Date();
  const generativeUITrustedModeEnabled = isGenerativeUITrustedModeEnabled();
  const systemPrompt = getChatSystemPrompt(now, {
    generativeUITrustedModeEnabled,
  });

  return {
    systemPrompt,
    tools: getChatToolTraceList(generativeUITrustedModeEnabled),
    capturedAt: now.toISOString(),
    modelSelection,
  };
}

export async function GET(request: Request) {
  if (isShowcaseOnlyEnabled()) {
    const id = getIdFromRequest(request);

    if (id) {
      const example = getExampleChatById(id);

      if (!example) {
        return new Response("Chat not found.", { status: 404 });
      }

      return Response.json({
        id: example.sourceChatId,
        title: example.title,
        updatedAt: example.updatedAt,
        messages: example.messages,
        modelSelection:
          example.modelSelection ?? getDefaultChatModelSelection(),
      });
    }

    return Response.json({ chats: listExampleChatSummaries() });
  }

  const id = getIdFromRequest(request);

  if (id) {
    return Response.json(await readChat(id));
  }

  return Response.json({ chats: await listChats() });
}

export async function PUT(request: Request) {
  if (isShowcaseOnlyEnabled()) {
    return showcaseReadOnlyResponse();
  }

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

  const modelSelection = normalizeChatModelSelection(body.modelSelection);
  const chat = await writeChat(body.id, body.messages, {
    trace: buildChatTrace(modelSelection),
    deferGeneratedTitle: true,
    modelSelection,
  });

  if (chat.titleState === "pending") {
    after(async () => {
      await resolvePendingGeneratedTitle(body.id as string);
    });
  }

  return Response.json(chat);
}

export async function PATCH(request: Request) {
  if (isShowcaseOnlyEnabled()) {
    return showcaseReadOnlyResponse();
  }

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
  if (isShowcaseOnlyEnabled()) {
    return showcaseReadOnlyResponse();
  }

  const id = getIdFromRequest(request);

  if (!id) {
    return new Response("Query must include an id.", { status: 400 });
  }

  await deleteChat(id);

  return new Response(null, { status: 204 });
}
