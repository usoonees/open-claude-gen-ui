import { ToolLoopAgent, jsonSchema, stepCountIs, tool } from "ai";
import { getVolcengineChatModel } from "@/lib/volcengine";
import { searchTavily } from "@/lib/tavily";

const tavilySearchTool = tool({
  description:
    "Search the live web for current information, recent news, or facts that need fresh sources.",
  inputSchema: jsonSchema<{
    query: string;
    topic?: "general" | "news";
    maxResults?: number;
  }>({
    type: "object",
    additionalProperties: false,
    properties: {
      query: {
        type: "string",
        description: "The exact search query to run on the web.",
      },
      topic: {
        type: "string",
        enum: ["general", "news"],
        description: "Use news for recent events and general for broader lookup.",
      },
      maxResults: {
        type: "integer",
        minimum: 1,
        maximum: 8,
        description: "How many search results to retrieve. Prefer 3 to 5.",
      },
    },
    required: ["query"],
  }),
  execute: async ({ query, topic, maxResults }) =>
    searchTavily({ query, topic, maxResults }),
});

export const chatAgent = new ToolLoopAgent({
  model: getVolcengineChatModel(),
  instructions: `You are a concise, practical AI assistant.

Use the tavilySearch tool whenever the user asks for current information, recent news, live web facts, or anything that should be verified on the web.
After using the tool, answer directly and include the relevant source URLs when they materially support the answer.
Do not claim you searched the web unless you actually used the tool.`,
  stopWhen: stepCountIs(5),
  tools: {
    tavilySearch: tavilySearchTool,
  },
});
