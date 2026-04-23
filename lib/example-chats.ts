import type { ChatModelSelection } from "@/lib/chat-model-config";
import type { ChatUIMessage } from "@/lib/chat-message";
import aiNewsExample from "@/lib/example-chats/data/ai-news.json";
import chartExample from "@/lib/example-chats/data/chart.json";
import nbaExample from "@/lib/example-chats/data/nba.json";
import ragExample from "@/lib/example-chats/data/rag.json";
import roadmapExample from "@/lib/example-chats/data/roadmap.json";
import svgExample from "@/lib/example-chats/data/svg.json";

export type ExampleChatSummary = {
  id: string;
  title: string;
  titleState: "ready";
  updatedAt: string;
};

export type ExampleChat = {
  slug: string;
  sourceChatId: string;
  title: string;
  description: string;
  updatedAt: string;
  modelSelection: ChatModelSelection | null;
  modelId: string | null;
  messages: ChatUIMessage[];
};

const EXAMPLE_CHATS = [
  ragExample,
  aiNewsExample,
  chartExample,
  svgExample,
  nbaExample,
  roadmapExample,
] as ExampleChat[];

export function listExampleChats() {
  return EXAMPLE_CHATS;
}

export function listExampleChatSummaries(): ExampleChatSummary[] {
  return [...EXAMPLE_CHATS]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .map((example) => ({
      id: example.sourceChatId,
      title: example.title,
      titleState: "ready",
      updatedAt: example.updatedAt,
    }));
}

export function getExampleChat(slug: string) {
  return EXAMPLE_CHATS.find((example) => example.slug === slug) ?? null;
}

export function getExampleChatById(id: string) {
  return (
    EXAMPLE_CHATS.find(
      (example) => example.sourceChatId === id || example.slug === id
    ) ?? null
  );
}

export function getDefaultExampleChatId() {
  return EXAMPLE_CHATS[0]?.sourceChatId ?? null;
}
