import { writeChat } from "@/lib/chat-store";
import { chatAgent, chatSystemPrompt } from "@/lib/chat-agent";
import type { ChatUIMessage } from "@/lib/chat-message";
import { getChatToolTraceList } from "@/lib/chat-tools";
import { langsmithClient } from "@/lib/langsmith-ai";
import { volcengineConfig } from "@/lib/volcengine";
import { createAgentUIStreamResponse } from "ai";
import { after } from "next/server";

export const maxDuration = 60;

function buildChatTrace() {
  return {
    systemPrompt: chatSystemPrompt,
    tools: getChatToolTraceList(),
    capturedAt: new Date().toISOString(),
  };
}

type ChatRequest = {
  id?: string;
  messages?: ChatUIMessage[];
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

  if (!volcengineConfig.apiKey) {
    return new Response(
      "VOLCENGINE_ACK_API_KEY is empty. Add your Volcengine API key to .env.local before chatting.",
      { status: 503 }
    );
  }

  if (process.env.LANGSMITH_TRACING === "true") {
    after(async () => {
      await langsmithClient.awaitPendingTraceBatches();
    });
  }

  return createAgentUIStreamResponse({
    agent: chatAgent,
    uiMessages: body.messages,
    sendReasoning: true,
    onFinish: async ({ messages }) => {
      await writeChat(body.id as string, messages, {
        trace: buildChatTrace(),
      });
    },
  });
}
