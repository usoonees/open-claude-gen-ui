import * as ai from "ai";
import { Client } from "langsmith";
import { wrapAISDK } from "langsmith/experimental/vercel";

export const langsmithClient = new Client();

export const tracedAI = wrapAISDK(ai, {
  client: langsmithClient,
  name: "chat-agent",
  tags: ["chat", "tool-loop", "volcengine"],
  metadata: {
    app: "open-claude-gen-ui",
    route: "/api/chat",
  },
  traceResponseMetadata: true,
});
