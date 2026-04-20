import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UIMessage } from "ai";

const storeDir = path.join(process.cwd(), ".data", "chats");

export type StoredChat = {
  id: string;
  messages: UIMessage[];
  title: string;
  updatedAt: string;
};

export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

async function ensureStoreDir() {
  await mkdir(storeDir, { recursive: true, mode: 0o700 });
}

function chatPath(id: string) {
  return path.join(storeDir, `${encodeURIComponent(id)}.json`);
}

function titleFromMessages(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text =
    firstUserMessage?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim() || "New chat";

  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
}

function sanitizeMessages(messages: UIMessage[]) {
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
  try {
    const file = await readFile(chatPath(id), "utf8");
    const chat = JSON.parse(file) as StoredChat;

    return {
      id: chat.id || id,
      messages: Array.isArray(chat.messages) ? chat.messages : [],
      title: chat.title || titleFromMessages(chat.messages || []),
      updatedAt: chat.updatedAt || new Date(0).toISOString(),
    };
  } catch {
    return {
      id,
      messages: [],
      title: "New chat",
      updatedAt: new Date(0).toISOString(),
    };
  }
}

export async function writeChat(id: string, messages: UIMessage[]) {
  await ensureStoreDir();

  const cleanMessages = sanitizeMessages(messages);
  const chat: StoredChat = {
    id,
    messages: cleanMessages,
    title: titleFromMessages(cleanMessages),
    updatedAt: new Date().toISOString(),
  };

  await writeFile(chatPath(id), `${JSON.stringify(chat, null, 2)}\n`, {
    mode: 0o600,
  });

  return chat;
}
