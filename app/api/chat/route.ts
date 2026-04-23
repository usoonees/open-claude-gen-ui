import { writeChat } from "@/lib/chat-store";
import { createChatAgent, getChatSystemPrompt } from "@/lib/chat-agent";
import {
  normalizePreShowWidgetTextMessages,
  normalizePreShowWidgetTextStream,
} from "@/lib/chat-widget-stream";
import type { ChatModelSelection } from "@/lib/chat-model-config";
import type { ChatMessageMetadata, ChatUIMessage } from "@/lib/chat-message";
import {
  getMissingProviderKeyMessage,
  isChatModelSelectionConfigured,
  normalizeChatModelSelection,
} from "@/lib/chat-models";
import { getChatToolTraceList } from "@/lib/chat-tools";
import { langsmithClient } from "@/lib/langsmith-ai";
import { createAgentUIStream, createUIMessageStreamResponse } from "ai";
import { after } from "next/server";

export const maxDuration = 60;

function buildAssistantMessageMetadata(
  modelSelection: ChatModelSelection
): ChatMessageMetadata {
  return {
    modelId: modelSelection.modelId,
  };
}

function buildChatTrace(
  modelSelection: ChatModelSelection,
  systemPrompt: string,
  capturedAt: string
) {
  return {
    systemPrompt,
    tools: getChatToolTraceList(),
    capturedAt,
    modelSelection,
  };
}

type ChatRequest = {
  id?: string;
  messages?: ChatUIMessage[];
  modelSelection?: ChatModelSelection;
};

export async function POST(request: Request) {
  let body: ChatRequest;

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
  const now = new Date();
  const systemPrompt = getChatSystemPrompt(now);
  const capturedAt = now.toISOString();

  if (!isChatModelSelectionConfigured(modelSelection)) {
    return new Response(getMissingProviderKeyMessage(modelSelection), { status: 503 });
  }

  if (process.env.LANGSMITH_TRACING === "true") {
    after(async () => {
      await langsmithClient.awaitPendingTraceBatches();
    });
  }

  const stream = normalizePreShowWidgetTextStream(
    await createAgentUIStream({
      agent: createChatAgent(modelSelection, systemPrompt),
      uiMessages: body.messages,
      messageMetadata: () => buildAssistantMessageMetadata(modelSelection),
      sendReasoning: true,
      onFinish: async ({ messages }) => {
        await writeChat(
          body.id as string,
          normalizePreShowWidgetTextMessages(messages as ChatUIMessage[]),
          {
            trace: buildChatTrace(modelSelection, systemPrompt, capturedAt),
            modelSelection,
          }
        );
      },
    })
  );

  return createUIMessageStreamResponse({ stream });
}
