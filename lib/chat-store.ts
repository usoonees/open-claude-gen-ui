import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChatModelSelection } from "@/lib/chat-model-config";
import type { ChatUIMessage } from "@/lib/chat-message";
import {
  getDefaultChatModelSelection,
  normalizeChatModelSelection,
} from "@/lib/chat-models";
import {
  canGenerateChatTitle,
  fallbackTitleFromMessages,
  generateChatTitle,
} from "@/lib/chat-title";
import { normalizePreShowWidgetTextMessages } from "@/lib/chat-widget-stream";
import type { ChatToolTrace } from "@/lib/chat-tools";

const storeDir = path.join(process.cwd(), ".data", "chats");

export type StoredChatTrace = {
  systemPrompt: string;
  tools: ChatToolTrace[];
  capturedAt: string;
  modelSelection: ChatModelSelection;
};

export type StoredChat = {
  id: string;
  messages: ChatUIMessage[];
  modelSelection: ChatModelSelection;
  title: string;
  updatedAt: string;
  titleSource?: "generated" | "custom";
  titleState?: "pending" | "ready";
  trace?: StoredChatTrace;
};

export type ChatSummary = {
  id: string;
  title: string;
  titleState?: "pending" | "ready";
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
    modelSelection: normalizeChatModelSelection(trace.modelSelection),
  } satisfies StoredChatTrace;
}

function sanitizeModelSelection(selection: ChatModelSelection | undefined) {
  return selection ? normalizeChatModelSelection(selection) : undefined;
}

async function ensureStoreDir() {
  await mkdir(storeDir, { recursive: true, mode: 0o700 });
}

function chatPath(id: string) {
  return path.join(storeDir, `${encodeURIComponent(id)}.json`);
}

function sanitizeMessages(messages: ChatUIMessage[]) {
  return normalizePreShowWidgetTextMessages(
    messages.filter((message) => message.role !== "system")
  );
}

function isLegacyGeneratedTitle(
  chat: Partial<StoredChat> | null | undefined,
  messages: ChatUIMessage[]
) {
  return (
    chat?.titleSource !== "custom" &&
    typeof chat?.title === "string" &&
    chat.title.trim() === fallbackTitleFromMessages(messages)
  );
}

function hasResolvedGeneratedTitle(
  chat: Partial<StoredChat> | null | undefined,
  messages: ChatUIMessage[],
  requireReadyState = true
) {
  if (chat?.titleSource !== "generated" || typeof chat.title !== "string") {
    return false;
  }

  if (requireReadyState && chat.titleState === "pending") {
    return false;
  }

  return Boolean(chat.title.trim() && !isLegacyGeneratedTitle(chat, messages));
}

export async function listChats(): Promise<ChatSummary[]> {
  await ensureStoreDir();

  const entries = await readdir(storeDir, { withFileTypes: true });
  const chats = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry): Promise<ChatSummary | null> => {
        try {
          const file = await readFile(path.join(storeDir, entry.name), "utf8");
          const chat = JSON.parse(file) as StoredChat;

          return {
            id: chat.id,
            title: chat.title || fallbackTitleFromMessages(chat.messages || []),
            titleState: chat.titleState === "pending" ? "pending" : "ready",
            updatedAt: chat.updatedAt || new Date(0).toISOString(),
          } satisfies ChatSummary;
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
      modelSelection: getDefaultChatModelSelection(),
      title: "New chat",
      updatedAt: new Date(0).toISOString(),
      titleSource: "generated",
      titleState: "ready",
      trace: undefined,
    };
  }

  const messages = Array.isArray(chat.messages)
    ? normalizePreShowWidgetTextMessages(chat.messages as ChatUIMessage[])
    : [];
  const fallbackTitle = fallbackTitleFromMessages(messages);

  return {
    id: chat.id || id,
    messages,
    modelSelection:
      sanitizeModelSelection(chat.modelSelection) ??
      sanitizeTrace(chat.trace)?.modelSelection ??
      getDefaultChatModelSelection(),
    title: isCustomTitle(chat) ? chat.title.trim() : chat.title || fallbackTitle,
    updatedAt: chat.updatedAt || new Date(0).toISOString(),
    titleSource: chat.titleSource === "custom" ? "custom" : "generated",
    titleState: chat.titleState === "pending" ? "pending" : "ready",
    trace: sanitizeTrace(chat.trace),
  };
}

export async function writeChat(
  id: string,
  messages: ChatUIMessage[],
  options?: {
    trace?: StoredChatTrace;
    deferGeneratedTitle?: boolean;
    modelSelection?: ChatModelSelection;
  }
) {
  await ensureStoreDir();

  const cleanMessages = sanitizeMessages(messages);
  const existingChat = await readStoredChatFile(id);
  const fallbackTitle = fallbackTitleFromMessages(cleanMessages);
  const customTitle =
    existingChat?.titleSource === "custom" && typeof existingChat.title === "string"
      ? existingChat.title.trim()
      : null;
  const existingResolvedGeneratedTitle = hasResolvedGeneratedTitle(
    existingChat,
    cleanMessages
  )
    ? existingChat?.title.trim() || ""
    : "";
  const modelSelection =
    sanitizeModelSelection(options?.modelSelection) ??
    sanitizeModelSelection(existingChat?.modelSelection) ??
    sanitizeTrace(existingChat?.trace)?.modelSelection ??
    getDefaultChatModelSelection();
  const shouldKeepPendingGeneratedTitle =
    existingChat?.titleState === "pending" &&
    !customTitle &&
    !existingResolvedGeneratedTitle;
  const shouldDeferGeneratedTitle =
    !customTitle &&
    !existingResolvedGeneratedTitle &&
    (shouldKeepPendingGeneratedTitle ||
      (options?.deferGeneratedTitle === true &&
        canGenerateChatTitle(cleanMessages, modelSelection)));
  const title = customTitle || existingResolvedGeneratedTitle || fallbackTitle;
  const chat: StoredChat = {
    id,
    messages: cleanMessages,
    modelSelection,
    title,
    updatedAt: new Date().toISOString(),
    titleSource: customTitle ? "custom" : "generated",
    titleState: customTitle ? "ready" : shouldDeferGeneratedTitle ? "pending" : "ready",
    trace:
      sanitizeTrace(options?.trace) ??
      sanitizeTrace(existingChat?.trace) ?? {
        systemPrompt: "",
        tools: [],
        capturedAt: new Date().toISOString(),
        modelSelection,
      },
  };

  await writeFile(chatPath(id), `${JSON.stringify(chat, null, 2)}\n`, {
    mode: 0o600,
  });

  return chat;
}

export async function resolvePendingGeneratedTitle(id: string) {
  await ensureStoreDir();

  const existingChat = await readStoredChatFile(id);

  if (!existingChat) {
    return null;
  }

  if (isCustomTitle(existingChat)) {
    return existingChat;
  }

  const messages = Array.isArray(existingChat.messages)
    ? normalizePreShowWidgetTextMessages(existingChat.messages as ChatUIMessage[])
    : [];

  if (hasResolvedGeneratedTitle(existingChat, messages)) {
    return existingChat;
  }

  const fallbackTitle = fallbackTitleFromMessages(messages);
  const modelSelection =
    sanitizeModelSelection(existingChat.modelSelection) ??
    sanitizeTrace(existingChat.trace)?.modelSelection ??
    getDefaultChatModelSelection();
  const generatedTitle = await generateChatTitle(messages, modelSelection);
  const latestChat = await readStoredChatFile(id);

  if (!latestChat) {
    return null;
  }

  if (isCustomTitle(latestChat)) {
    return latestChat;
  }

  const latestMessages = Array.isArray(latestChat.messages)
    ? normalizePreShowWidgetTextMessages(latestChat.messages as ChatUIMessage[])
    : messages;
  const chat: StoredChat = {
    id: latestChat.id || id,
    messages: latestMessages,
    modelSelection:
      sanitizeModelSelection(latestChat.modelSelection) ??
      sanitizeTrace(latestChat.trace)?.modelSelection ??
      modelSelection,
    title: generatedTitle || fallbackTitleFromMessages(latestMessages) || fallbackTitle,
    updatedAt: latestChat.updatedAt || new Date().toISOString(),
    titleSource: "generated",
    titleState: "ready",
    trace: sanitizeTrace(latestChat.trace),
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

  const messages = Array.isArray(existingChat.messages)
    ? normalizePreShowWidgetTextMessages(existingChat.messages as ChatUIMessage[])
    : [];
  const chat: StoredChat = {
    id: existingChat.id || id,
    messages,
    modelSelection:
      sanitizeModelSelection(existingChat.modelSelection) ??
      sanitizeTrace(existingChat.trace)?.modelSelection ??
      getDefaultChatModelSelection(),
    title: normalizedTitle,
    updatedAt: new Date().toISOString(),
    titleSource: "custom",
    titleState: "ready",
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
