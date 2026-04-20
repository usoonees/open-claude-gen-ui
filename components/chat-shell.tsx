"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const starterPrompts = [
  "What are the advantages of using Next.js?",
  "Write code to demonstrate dijkstra's algorithm",
  "Help me write an essay about silicon valley",
  "What is the weather in San Francisco?",
];

type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

function textFromMessage(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function reasoningFromMessage(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => part.text)
    .join("");
}

function MarkdownBlock({ children }: { children: string }) {
  if (!children.trim()) {
    return null;
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

function ReasoningBlock({
  reasoning,
  isStreaming,
}: {
  reasoning: string;
  isStreaming: boolean;
}) {
  const [isOpen, setIsOpen] = useState(isStreaming);

  useEffect(() => {
    setIsOpen(isStreaming);
  }, [isStreaming]);

  return (
    <details
      className="reasoning-block"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      open={isOpen}
    >
      <summary>Thinking</summary>
      <MarkdownBlock>{reasoning}</MarkdownBlock>
    </details>
  );
}

function MessageContent({
  message,
  isReasoningStreaming,
}: {
  message: UIMessage;
  isReasoningStreaming: boolean;
}) {
  const reasoning = reasoningFromMessage(message);
  const text = textFromMessage(message);

  return (
    <>
      {reasoning ? (
        <ReasoningBlock
          isStreaming={isReasoningStreaming}
          reasoning={reasoning}
        />
      ) : null}
      <MarkdownBlock>{text}</MarkdownBlock>
    </>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 8h8v8H8z" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5h16v14H4zM9 5v14" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m21 8.5-9.8 9.8a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.4 9.4a2 2 0 0 1-2.8-2.8l8.6-8.6" />
    </svg>
  );
}

function VercelIcon() {
  return (
    <svg aria-hidden="true" className="vercel-mark" viewBox="0 0 24 24">
      <path d="M12 4 22 20H2L12 4Z" />
    </svg>
  );
}

function createChatId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `chat-${Date.now().toString(36)}`;
}

function debugChat(event: string, detail: Record<string, unknown> = {}) {
  const time = Math.round(performance.now());
  console.debug(`[chat-ui ${time}ms] ${event}`, detail);
}

export function ChatShell({ initialChatId }: { initialChatId?: string }) {
  const [chatId, setChatId] = useState<string | null>(() => initialChatId ?? null);
  const [chatList, setChatList] = useState<ChatSummary[]>([]);
  const [input, setInput] = useState("");
  const chatIdRef = useRef(chatId);
  const lastLoadedChatIdRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest(request) {
          return {
            body: {
              id: chatIdRef.current,
              messages: request.messages,
              trigger: request.trigger,
            },
          };
        },
      }),
    []
  );

  const { error, messages, sendMessage, setMessages, status, stop } = useChat({
    transport,
    onFinish: () => {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const trimmedInput = input.trim();
  const streamingAssistantMessageId = useMemo(() => {
    if (status !== "streaming") {
      return null;
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "assistant") {
        return messages[index]?.id ?? null;
      }
    }

    return null;
  }, [messages, status]);

  useEffect(() => {
    debugChat("render-state", {
      chatId,
      chatCount: chatList.length,
      messageCount: messages.length,
      status,
    });
  }, [chatId, chatList.length, messages.length, status]);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  async function loadChatList() {
    const startedAt = performance.now();
    debugChat("history-list:start", { activeChatId: chatIdRef.current });
    const response = await fetch("/api/chat/history");

    if (!response.ok) {
      debugChat("history-list:error", { status: response.status });
      return;
    }

    const data = (await response.json()) as { chats?: ChatSummary[] };
    const nextChats = Array.isArray(data.chats) ? data.chats : [];
    setChatList(nextChats);
    debugChat("history-list:done", {
      count: nextChats.length,
      durationMs: Math.round(performance.now() - startedAt),
    });
  }

  useEffect(() => {
    loadChatList();
  }, []);

  useEffect(() => {
    const nextChatId = initialChatId ?? null;

    if (nextChatId !== chatIdRef.current) {
      debugChat("route-param-sync", {
        from: chatIdRef.current,
        to: nextChatId,
      });
      setChatId(nextChatId);
      chatIdRef.current = nextChatId;
    }
  }, [initialChatId]);

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      if (!chatId) {
        lastLoadedChatIdRef.current = null;
        setMessages([]);
        debugChat("chat-load:skip-empty-id");
        return;
      }

      if (lastLoadedChatIdRef.current === chatId) {
        debugChat("chat-load:skip-same-id", { chatId });
        return;
      }

      const startedAt = performance.now();
      debugChat("chat-load:start", { chatId });
      const response = await fetch(
        `/api/chat/history?id=${encodeURIComponent(chatId)}`
      );

      if (!response.ok) {
        debugChat("chat-load:error", { chatId, status: response.status });
        return;
      }

      const chat = (await response.json()) as { messages?: UIMessage[] };
      const nextMessages = Array.isArray(chat.messages) ? chat.messages : [];

      if (!ignore) {
        lastLoadedChatIdRef.current = chatId;
        setMessages(nextMessages);
        debugChat("chat-load:done", {
          chatId,
          messageCount: nextMessages.length,
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
    }

    loadHistory();

    return () => {
      ignore = true;
    };
  }, [chatId, setMessages]);

  async function saveMessages(nextMessages: UIMessage[]) {
    const startedAt = performance.now();
    debugChat("chat-save:start", {
      chatId,
      messageCount: nextMessages.length,
    });
    await fetch("/api/chat/history", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: chatId, messages: nextMessages }),
    });

    debugChat("chat-save:done", {
      chatId,
      durationMs: Math.round(performance.now() - startedAt),
    });
    await loadChatList();
  }

  function replaceUrl(nextId?: string | null) {
    const nextPath = nextId ? `/chat/${nextId}` : "/";

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      debugChat("url:pushState", { nextPath });
    }
  }

  function startNewChat() {
    debugChat("new-chat:start", { from: chatIdRef.current, to: null });
    stop();
    setChatId(null);
    chatIdRef.current = null;
    lastLoadedChatIdRef.current = null;
    setMessages([]);
    setInput("");
    replaceUrl(null);
    debugChat("new-chat:done", { chatId: null });
  }

  function openChat(nextId: string) {
    if (nextId === chatIdRef.current) {
      debugChat("open-chat:skip-active", { chatId: nextId });
      return;
    }

    debugChat("open-chat:start", { from: chatIdRef.current, to: nextId });
    stop();
    setChatId(nextId);
    chatIdRef.current = nextId;
    replaceUrl(nextId);
  }

  function ensureActiveChatId() {
    if (chatIdRef.current) {
      return chatIdRef.current;
    }

    const nextId = createChatId();
    setChatId(nextId);
    chatIdRef.current = nextId;
    replaceUrl(nextId);
    debugChat("draft-chat:activate", { chatId: nextId });
    return nextId;
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!trimmedInput || isBusy) {
      return;
    }

    const activeChatId = ensureActiveChatId();

    debugChat("send:start", {
      chatId: activeChatId,
      length: trimmedInput.length,
    });
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: trimmedInput }],
    });

    setInput("");
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  async function sendStarter(prompt: string) {
    if (isBusy) {
      return;
    }

    const activeChatId = ensureActiveChatId();

    debugChat("starter-send:start", {
      chatId: activeChatId,
      prompt,
    });
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: prompt }],
    });

    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Chat navigation">
        <div className="sidebar-top">
          <button
            aria-label="Toggle sidebar"
            className="ghost-icon"
            title="Toggle sidebar"
            type="button"
          >
            <PanelIcon />
          </button>
          <a
            aria-label="Vercel chatbot template"
            className="brand-button"
            href="https://vercel.com/templates/next.js/chatbot"
            rel="noreferrer"
            target="_blank"
            title="Vercel chatbot template"
          >
            <VercelIcon />
          </a>
        </div>

        <button
          className="new-chat-button"
          onClick={startNewChat}
          type="button"
        >
          <NewChatIcon />
          <span>New Chat</span>
        </button>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <p>Chats</p>
            {chatList.length > 0 ? (
              <span className="chat-count">{chatList.length}</span>
            ) : null}
          </div>
          {chatList.length === 0 ? (
            <span className="empty-history">No saved conversations</span>
          ) : (
            chatList.map((chat) => (
              <Link
                className={chat.id === chatId ? "chat-link active" : "chat-link"}
                href={`/chat/${chat.id}`}
                key={chat.id}
                onClick={(event) => {
                  event.preventDefault();
                  openChat(chat.id);
                }}
                title={chat.id}
              >
                <span>{chat.title}</span>
              </Link>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>ACK/Ark endpoint ready</span>
        </div>
      </aside>

      <section className="chat-panel" aria-label="AI chat">
        <header className="chat-header">
          <button
            aria-label="Toggle sidebar"
            className="ghost-icon mobile-only"
            title="Toggle sidebar"
            type="button"
          >
            <PanelIcon />
          </button>
          <button className="visibility-button" type="button">
            Private
          </button>
          <div className="header-spacer" />
          <a
            aria-label="Deploy with Vercel"
            className="deploy-button"
            href="https://vercel.com/templates/next.js/chatbot"
            rel="noreferrer"
            target="_blank"
          >
            <VercelIcon />
            <span>Deploy with Vercel</span>
          </a>
          <button
            aria-label="Start a new chat"
            className="ghost-icon"
            onClick={startNewChat}
            title="Start a new chat"
            type="button"
          >
            <NewChatIcon />
          </button>
        </header>

        <div className="message-scroll">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h1>What can I help with?</h1>
              <p>Ask a question, write code, or explore ideas.</p>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article
                  className={`message message-${message.role}`}
                  key={message.id}
                >
                  <span className="message-role">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  <MessageContent
                    isReasoningStreaming={
                      message.id === streamingAssistantMessageId
                    }
                    message={message}
                  />
                </article>
              ))}
              {status === "submitted" && (
                <article className="message message-assistant">
                  <span className="message-role">Assistant</span>
                  <p className="pulse-text">Thinking...</p>
                </article>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="composer-wrap">
          {messages.length === 0 && (
            <div className="starter-grid">
              {starterPrompts.map((prompt) => (
                <button
                  className="starter-card"
                  key={prompt}
                  onClick={() => sendStarter(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {error && <p className="error-banner">{error.message}</p>}

          <form className="composer" onSubmit={submitMessage}>
            <label className="sr-only" htmlFor="chat-input">
              Message
            </label>
            <textarea
              id="chat-input"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage();
                }
              }}
              placeholder="Ask anything..."
              rows={3}
              value={input}
            />
            <div className="composer-footer">
              <div className="tool-row">
                <button
                  aria-label="Attach file"
                  className="tool-button"
                  title="Attach file"
                  type="button"
                >
                  <PaperclipIcon />
                </button>
                <button className="model-pill" type="button">
                  Doubao Seed
                </button>
                <button className="model-pill" type="button">
                  Volcengine ACK
                </button>
              </div>
              {isBusy ? (
                <button
                  aria-label="Stop response"
                  className="send-button"
                  onClick={stop}
                  title="Stop response"
                  type="button"
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  aria-label="Send message"
                  className="send-button"
                  disabled={!trimmedInput}
                  title="Send message"
                  type="submit"
                >
                  <SendIcon />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
