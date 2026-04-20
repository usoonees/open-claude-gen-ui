import {
  convertToModelMessages,
  type UIMessage,
  streamText,
} from "ai";
import { writeChat } from "@/lib/chat-store";
import { getVolcengineChatModel, volcengineConfig } from "@/lib/volcengine";

export const maxDuration = 60;

type ChatRequest = {
  id?: string;
  messages?: UIMessage[];
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

  const modelMessages = await convertToModelMessages(body.messages);

  const result = streamText({
    model: getVolcengineChatModel(),
    system:
      "You are a concise, practical AI assistant. Ask clarifying questions only when the request cannot be handled safely from the available context.",
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    sendReasoning: true,
    onFinish: async ({ messages }) => {
      await writeChat(body.id as string, messages);
    },
  });
}
