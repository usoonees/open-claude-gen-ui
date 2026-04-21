import { jsonSchema, tool, type InferUITools } from "ai";
import {
  generativeUIModuleNames,
  getGenerativeUIGuidelines,
  isGenerativeUITrustedModeEnabled,
  type GenerativeUIModule,
} from "@/lib/generative-ui";
import { normalizeShowWidgetToolInput } from "@/lib/generative-ui/show-widget-input";
import { searchTavily } from "@/lib/tavily";

const tavilySearchDescription =
  "Search the live web for current information, recent news, or facts that need fresh sources.";

const tavilySearchInputSchema = {
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
      description: "How many search results to retrieve. Prefer 8 unless a narrower search is enough.",
    },
  },
  required: ["query"],
} as const;

export const tavilySearchTool = tool({
  description: tavilySearchDescription,
  inputSchema: jsonSchema<{
    query: string;
    topic?: "general" | "news";
    maxResults?: number;
  }>(tavilySearchInputSchema),
  execute: async ({ query, topic, maxResults }) =>
    searchTavily({ query, topic, maxResults }),
});

const visualizeReadMeDescription =
  "Load the generative UI design guidelines before the first visual widget. This should be an explicit visible tool call, and it must happen before any showWidget call.";

const visualizeReadMeInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    modules: {
      type: "array",
      items: {
        type: "string",
        enum: generativeUIModuleNames,
      },
      minItems: 1,
      description:
        "Choose the guideline module(s) that match the intended widget.",
    },
  },
  required: ["modules"],
} as const;

export const visualizeReadMeTool = tool({
  description: visualizeReadMeDescription,
  inputSchema: jsonSchema<{
    modules: GenerativeUIModule[];
  }>(visualizeReadMeInputSchema),
  execute: async ({ modules }) => ({
    modules,
    guidance: getGenerativeUIGuidelines(modules),
  }),
});

const showWidgetDescription =
  "Render compact, valid HTML or SVG as an inline generative UI widget inside the chat. Call visualizeReadMe first, never in the same assistant message or tool step as showWidget, follow its constraints exactly, and keep prose/explanation outside widgetCode.";

const showWidgetInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    iHaveSeenReadMe: {
      type: "boolean",
      description:
        "Set to true only after visualizeReadMe has already been called and completed earlier in this conversation.",
    },
    title: {
      type: "string",
      description:
        "Short snake_case identifier for the widget. Keep it concise and stable.",
    },
    loadingMessages: {
      type: "array",
      items: { type: "string" },
      description:
        "Short progress labels to show while the widget is still streaming. Required.",
    },
    widgetCode: {
      type: "string",
      description:
        "HTML or SVG fragment to render inline. No DOCTYPE, html, head, or body tags. Use valid CSS and the documented widget CSS variables for colors, fonts, borders, and radii.",
    },
  },
  required: ["iHaveSeenReadMe", "title", "loadingMessages", "widgetCode"],
} as const;

export const showWidgetTool = tool({
  description: showWidgetDescription,
  inputSchema: jsonSchema<{
    iHaveSeenReadMe: boolean;
    title: string;
    loadingMessages: string[];
    widgetCode: string;
  }>(showWidgetInputSchema),
  execute: async (input) => {
    const { iHaveSeenReadMe, title, loadingMessages, widgetCode } =
      normalizeShowWidgetToolInput(input);

    if (!iHaveSeenReadMe) {
      throw new Error(
        "showWidget requires visualizeReadMe first. Call visualizeReadMe, then retry showWidget with iHaveSeenReadMe: true."
      );
    }

    if (!title || !widgetCode || !loadingMessages?.length) {
      throw new Error(
        "showWidget requires title, loadingMessages, and widgetCode."
      );
    }

    return {
      rendered: true,
      title,
    };
  },
});

export const allChatTools = {
  tavilySearch: tavilySearchTool,
  visualizeReadMe: visualizeReadMeTool,
  showWidget: showWidgetTool,
};

export type ChatUITools = InferUITools<typeof allChatTools>;

export type ChatToolTrace = {
  name: string;
  description: string;
  inputSchema: unknown;
  enabled: boolean;
};

export function getChatTools() {
  if (isGenerativeUITrustedModeEnabled()) {
    return allChatTools;
  }

  return {
    tavilySearch: tavilySearchTool,
  };
}

export function getChatToolTraceList(): ChatToolTrace[] {
  const generativeUIEnabled = isGenerativeUITrustedModeEnabled();

  return [
    {
      name: "tavilySearch",
      description: tavilySearchDescription,
      inputSchema: tavilySearchInputSchema,
      enabled: true,
    },
    {
      name: "visualizeReadMe",
      description: visualizeReadMeDescription,
      inputSchema: visualizeReadMeInputSchema,
      enabled: generativeUIEnabled,
    },
    {
      name: "showWidget",
      description: showWidgetDescription,
      inputSchema: showWidgetInputSchema,
      enabled: generativeUIEnabled,
    },
  ];
}
