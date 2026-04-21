import { generateText } from "ai";
import type { ChatUIMessage } from "@/lib/chat-message";
import type { ChatModelSelection } from "@/lib/chat-model-config";
import {
  getChatLanguageModel,
  isChatModelSelectionConfigured,
  normalizeChatModelSelection,
} from "@/lib/chat-models";

const LEGACY_TITLE_LENGTH = 48;
const GENERATED_TITLE_LENGTH = 45;

function textFromMessage(message: ChatUIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateTitle(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function normalizeGeneratedTitle(title: string) {
  const cleaned = title
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^[\-\*\d.\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return truncateTitle(cleaned, GENERATED_TITLE_LENGTH);
}

function titlePromptFromMessages(messages: ChatUIMessage[]) {
  const transcript = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      const text = textFromMessage(message);

      if (!text) {
        return null;
      }

      const clippedText =
        text.length > 240 ? `${text.slice(0, 237).trimEnd()}...` : text;

      return `${message.role === "user" ? "User" : "Assistant"}: ${clippedText}`;
    })
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 4)
    .join("\n");

  return transcript.trim();
}

export function fallbackTitleFromMessages(messages: ChatUIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage ? textFromMessage(firstUserMessage) : "New chat";

  return truncateTitle(text, LEGACY_TITLE_LENGTH);
}

export function canGenerateChatTitle(
  messages: ChatUIMessage[],
  selection?: ChatModelSelection
) {
  return Boolean(
    isChatModelSelectionConfigured(normalizeChatModelSelection(selection)) &&
      titlePromptFromMessages(messages)
  );
}

export async function generateChatTitle(
  messages: ChatUIMessage[],
  selection?: ChatModelSelection
) {
  const normalizedSelection = normalizeChatModelSelection(selection);

  if (!canGenerateChatTitle(messages, normalizedSelection)) {
    return null;
  }

  const prompt = titlePromptFromMessages(messages);

  try {
    const { text } = await generateText({
      model: getChatLanguageModel(normalizedSelection),
      system: [
        "Generate a short sidebar title for a chat conversation.",
        "Return only the title text.",
        "Use sentence case.",
        "Keep it specific, natural, and under 45 characters.",
        "Prefer 2 to 6 words.",
        "Do not use quotes, markdown, labels, or trailing punctuation.",
      ].join(" "),
      prompt,
      temperature: 0.2,
      maxOutputTokens: 24,
    });

    return normalizeGeneratedTitle(text);
  } catch {
    return null;
  }
}
