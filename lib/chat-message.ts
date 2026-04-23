import type { UIDataTypes, UIMessage } from "ai";
import type { ChatUITools } from "@/lib/chat-tools";

export type ChatMessageMetadata = {
  modelId?: string;
};

export type ChatUIMessage = UIMessage<
  ChatMessageMetadata,
  UIDataTypes,
  ChatUITools
>;

export function getAssistantMessageModelId(message: ChatUIMessage) {
  const modelId = message.metadata?.modelId;
  return typeof modelId === "string" && modelId.trim() ? modelId : null;
}
