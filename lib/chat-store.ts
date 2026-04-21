import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChatUIMessage } from "@/lib/chat-message";
import type { ChatToolTrace } from "@/lib/chat-tools";

const storeDir = path.join(process.cwd(), ".data", "chats");

export type StoredChatTrace = {
  systemPrompt: string;
  tools: ChatToolTrace[];
  capturedAt: string;
};

export type StoredChat = {
  id: string;
  messages: ChatUIMessage[];
  title: string;
  updatedAt: string;
  titleSource?: "generated" | "custom";
  trace?: StoredChatTrace;
};

export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

function isCustomTitle(chat: Partial<StoredChat> | null | undefined) {
  return chat?.titleSource === "custom" && typeof chat.title === "string";
}

async function readStoredChatFile(id: string): Promise<StoredChat | null> {
  try {
    const file = await readFile(chatPath(id), "utf8");
    return JSON.parse(file) as StoredChat;
  } catch {
    return null;
  }
}

function sanitizeTrace(trace: StoredChatTrace | undefined) {
  if (!trace) {
    return undefined;
  }

  return {
    systemPrompt:
      typeof trace.systemPrompt === "string" ? trace.systemPrompt : "",
    tools: Array.isArray(trace.tools) ? trace.tools : [],
    capturedAt:
      typeof trace.capturedAt === "string"
        ? trace.capturedAt
        : new Date().toISOString(),
  } satisfies StoredChatTrace;
}

async function ensureStoreDir() {
  await mkdir(storeDir, { recursive: true, mode: 0o700 });
}

function chatPath(id: string) {
  return path.join(storeDir, `${encodeURIComponent(id)}.json`);
}

function titleFromMessages(messages: ChatUIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text =
    firstUserMessage?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim() || "New chat";

  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
}

function sanitizeMessages(messages: ChatUIMessage[]) {
  return messages.filter((message) => message.role !== "system");
}

export async function listChats(): Promise<ChatSummary[]> {
  await ensureStoreDir();

  const entries = await readdir(storeDir, { withFileTypes: true });
  const chats = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        try {
          const file = await readFile(path.join(storeDir, entry.name), "utf8");
          const chat = JSON.parse(file) as StoredChat;

          return {
            id: chat.id,
            title: chat.title || titleFromMessages(chat.messages || []),
            updatedAt: chat.updatedAt || new Date(0).toISOString(),
          };
        } catch {
          return null;
        }
      })
  );

  return chats
    .filter((chat): chat is ChatSummary => Boolean(chat?.id))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function readChat(id: string): Promise<StoredChat> {
  const chat = await readStoredChatFile(id);

  if (!chat) {
    return {
      id,
      messages: [],
      title: "New chat",
      updatedAt: new Date(0).toISOString(),
      titleSource: "generated",
      trace: undefined,
    };
  }

  const messages = Array.isArray(chat.messages)
    ? (chat.messages as ChatUIMessage[])
    : [];
  const generatedTitle = titleFromMessages(messages);

  return {
    id: chat.id || id,
    messages,
    title: isCustomTitle(chat) ? chat.title.trim() : chat.title || generatedTitle,
    updatedAt: chat.updatedAt || new Date(0).toISOString(),
    titleSource: chat.titleSource === "custom" ? "custom" : "generated",
    trace: sanitizeTrace(chat.trace),
  };
}

export async function writeChat(
  id: string,
  messages: ChatUIMessage[],
  options?: {
    trace?: StoredChatTrace;
  }
) {
  await ensureStoreDir();

  const cleanMessages = sanitizeMessages(messages);
  const existingChat = await readStoredChatFile(id);
  const generatedTitle = titleFromMessages(cleanMessages);
  const customTitle =
    existingChat?.titleSource === "custom" && typeof existingChat.title === "string"
      ? existingChat.title.trim()
      : null;
  const chat: StoredChat = {
    id,
    messages: cleanMessages,
    title: customTitle || generatedTitle,
    updatedAt: new Date().toISOString(),
    titleSource: customTitle ? "custom" : "generated",
    trace: sanitizeTrace(options?.trace) ?? sanitizeTrace(existingChat?.trace),
  };

  await writeFile(chatPath(id), `${JSON.stringify(chat, null, 2)}\n`, {
    mode: 0o600,
  });

  return chat;
}

export async function renameChat(id: string, title: string) {
  await ensureStoreDir();

  const existingChat = await readStoredChatFile(id);

  if (!existingChat) {
    return null;
  }

  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error("Chat title cannot be empty.");
  }

  const messages = Array.isArray(existingChat.messages) ? existingChat.messages : [];
  const chat: StoredChat = {
    id: existingChat.id || id,
    messages,
    title: normalizedTitle,
    updatedAt: new Date().toISOString(),
    titleSource: "custom",
    trace: sanitizeTrace(existingChat.trace),
  };

  await writeFile(chatPath(id), `${JSON.stringify(chat, null, 2)}\n`, {
    mode: 0o600,
  });

  return chat;
}

export async function deleteChat(id: string) {
  await ensureStoreDir();

  await rm(chatPath(id), { force: true });
}
