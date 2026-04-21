import type { UIDataTypes, UIMessage } from "ai";
import type { ChatUITools } from "@/lib/chat-tools";

export type ChatUIMessage = UIMessage<unknown, UIDataTypes, ChatUITools>;
