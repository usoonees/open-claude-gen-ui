"use client";

import {
  GenerativeWidget,
  downloadGenerativeWidgetZip,
  type DownloadableGenerativeWidget,
} from "@/components/generative-widget";
import { normalizeShowWidgetToolInput } from "@/lib/generative-ui/show-widget-input";
import type { ChatUIMessage } from "@/lib/chat-message";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
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
  titleState?: "pending" | "ready";
  updatedAt: string;
};

type MessagePart = ChatUIMessage["parts"][number];

type ToolLikePart = {
  type: string;
  toolName?: string;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
    | "output-denied"
    | "approval-requested"
    | "approval-responded";
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: {
    approved: boolean;
  };
};

type ToolEvent = {
  label: string;
  tone: "running" | "done" | "error";
  detail: string;
  variant?: "default" | "readme";
  inputPreview?: string;
  readmeModules?: string[];
  sources?: Array<{
    url: string;
    title: string;
  }>;
};

type ThinkingItem =
  | {
      kind: "reasoning";
      key: string;
      text: string;
    }
  | {
      kind: "tool";
      key: string;
      event: ToolEvent;
    };

type WidgetToolInput = {
  iHaveSeenReadMe?: boolean;
  title?: string;
  widgetCode?: string;
  loadingMessages?: string[];
};

type RenderableMessageItem =
  | {
      kind: "text";
      key: string;
      text: string;
    }
  | {
      kind: "widget";
      key: string;
      title: string;
      widgetCode: string;
      loadingMessages: string[];
      status: "streaming" | "ready" | "error";
      errorText?: string;
    };

declare global {
  interface Window {
    sendPrompt?: (text: string) => void;
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function widgetInputFromUnknown(input: unknown): WidgetToolInput {
  return normalizeShowWidgetToolInput(input);
}

function textFromMessage(message: ChatUIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function copyTextFromMessage(message: ChatUIMessage) {
  const text = textFromMessage(message).trim();

  if (text) {
    return text;
  }

  return reasoningFromMessage(message).trim();
}

function reasoningFromMessage(message: ChatUIMessage) {
  return message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => part.text)
    .join("");
}

function isWidgetToolPart(part: MessagePart): part is Extract<MessagePart, { type: "tool-showWidget" }> {
  return part.type === "tool-showWidget";
}

function isVisualizeReadMeToolPart(
  part: MessagePart
): part is Extract<MessagePart, { type: "tool-visualizeReadMe" }> {
  return part.type === "tool-visualizeReadMe";
}

function formatToolName(partType: string, dynamicToolName?: string) {
  const rawName =
    partType === "dynamic-tool" ? dynamicToolName ?? "tool" : partType.slice(5);

  return rawName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isToolLikePart(
  part: MessagePart
): part is MessagePart & ToolLikePart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function createToolInputPreview(input: unknown, maxLength = 420) {
  if (input === undefined) {
    return null;
  }

  let preview: string;

  try {
    preview = JSON.stringify(input, null, 2);
  } catch {
    preview = String(input);
  }

  if (!preview.trim()) {
    return null;
  }

  if (preview.length <= maxLength) {
    return preview;
  }

  return `${preview.slice(0, maxLength - 1)}...`;
}

function readmeModulesFromUnknown(input: unknown) {
  const record = asRecord(input);
  const modules = record?.modules;

  if (!Array.isArray(modules)) {
    return [];
  }

  return modules.filter((module): module is string => typeof module === "string");
}

function formatReadmeModule(module: string) {
  return module
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function summarizeReadmeSelection(modules: string[], pendingLabel = "Selecting modules") {
  if (modules.length === 0) {
    return pendingLabel;
  }

  return `${modules.length} module${modules.length === 1 ? "" : "s"} selected`;
}

function summarizeReadmeModules(modules: string[]) {
  if (modules.length === 0) {
    return "Waiting for module selection";
  }

  return modules.map((module) => formatReadmeModule(module)).join(", ");
}

function summarizeToolPart(part: MessagePart): ToolEvent | null {
  if (!isToolLikePart(part)) {
    return null;
  }

  const label = isVisualizeReadMeToolPart(part)
    ? "visualizeReadMe"
    : formatToolName(
        part.type,
        part.type === "dynamic-tool" ? part.toolName : undefined
      );
  const readmeModules = isVisualizeReadMeToolPart(part)
    ? readmeModulesFromUnknown(part.input)
    : [];

  if (isVisualizeReadMeToolPart(part)) {
    switch (part.state) {
      case "input-streaming":
        return {
          label,
          tone: "running",
          detail: summarizeReadmeSelection(readmeModules),
          variant: "readme",
          readmeModules,
        };
      case "input-available":
        return {
          label,
          tone: "running",
          detail: summarizeReadmeSelection(readmeModules, "Selection ready"),
          variant: "readme",
          readmeModules,
        };
      case "output-available":
        return {
          label,
          tone: "done",
          detail: summarizeReadmeSelection(readmeModules, "Selection ready"),
          variant: "readme",
          readmeModules,
        };
      case "output-error":
        return {
          label,
          tone: "error",
          detail: part.errorText ?? "Guideline load failed.",
          variant: "readme",
          readmeModules,
        };
      case "output-denied":
        return {
          label,
          tone: "error",
          detail: "Guideline tool call denied.",
          variant: "readme",
          readmeModules,
        };
      case "approval-requested":
        return {
          label,
          tone: "running",
          detail: summarizeReadmeSelection(
            readmeModules,
            "Waiting for selection approval"
          ),
          variant: "readme",
          readmeModules,
        };
      case "approval-responded":
        return {
          label,
          tone: part.approval?.approved ? "done" : "error",
          detail: part.approval?.approved
            ? summarizeReadmeSelection(readmeModules, "Selection approved")
            : "Selection denied.",
          variant: "readme",
          readmeModules,
        };
      default:
        return null;
    }
  }

  switch (part.state) {
    case "input-streaming":
      if (isWidgetToolPart(part)) {
        const input = widgetInputFromUnknown(part.input);
        return {
          label,
          tone: "running",
          detail: input.loadingMessages?.[0] ?? "Streaming widget...",
        };
      }

      return {
        label,
        tone: "running",
        detail: "Preparing tool input...",
      };
    case "input-available": {
      const input = asRecord(part.input);

      if (isWidgetToolPart(part)) {
        return {
          label,
          tone: "running",
          detail: "Finalizing widget...",
        };
      }

      const query =
        input && typeof input.query === "string"
          ? input.query
          : null;

      return {
        label,
        tone: "running",
        detail: query ? `Working on "${query}"` : "Running tool...",
      };
    }
    case "output-available": {
      const output = asRecord(part.output);

      if (isWidgetToolPart(part)) {
        return {
          label,
          tone: "done",
          detail:
            typeof output?.title === "string"
              ? `Widget "${output.title.replace(/_/g, " ")}" ready.`
              : "Widget ready.",
        };
      }

      const results =
        output && Array.isArray(output.results)
          ? output.results
          : null;
      const query =
        output && typeof output.query === "string"
          ? output.query
          : null;

      return {
        label,
        tone: "done",
        detail:
          query && results
            ? `Finished "${query}" with ${results.length} source${results.length === 1 ? "" : "s"}`
            : "Tool finished.",
        sources:
          results?.flatMap((result) =>
            result &&
            typeof result === "object" &&
            "url" in result &&
            typeof result.url === "string"
              ? [
                  {
                    url: result.url,
                    title:
                      "title" in result && typeof result.title === "string"
                        ? result.title
                        : result.url,
                  },
                ]
              : []
          ) ?? [],
      };
    }
    case "output-error":
      return {
        label,
        tone: "error",
        detail: part.errorText ?? "Tool failed.",
      };
    case "output-denied":
      return {
        label,
        tone: "error",
        detail: "Tool call denied.",
      };
    case "approval-requested":
      return {
        label,
        tone: "running",
        detail: "Waiting for approval.",
      };
    case "approval-responded":
      return {
        label,
        tone: part.approval?.approved ? "done" : "error",
        detail: part.approval?.approved ? "Approved." : "Denied.",
      };
    default:
      return null;
  }
}

function thinkingItemsFromMessage(message: ChatUIMessage): ThinkingItem[] {
  return message.parts.flatMap<ThinkingItem>((part, index) => {
    if (part.type === "reasoning") {
      if (!part.text.trim()) {
        return [];
      }

      return [
        {
          kind: "reasoning" as const,
          key: `${part.type}-${index}`,
          text: part.text,
        },
      ];
    }

    const toolEvent = summarizeToolPart(part);

    if (!toolEvent) {
      return [];
    }

    return [
      {
        kind: "tool" as const,
        key:
          isToolLikePart(part)
            ? `${part.toolCallId}-${part.state}`
            : `tool-${index}`,
        event: toolEvent,
      },
    ];
  });
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

function ToolEventCard({ event }: { event: ToolEvent }) {
  return (
    <section
      className={`tool-card tool-card-${event.tone} tool-card-${event.variant ?? "default"}`}
    >
      <div className="tool-card-header">
        <span className="tool-badge">{event.label}</span>
        <span className="tool-status">
          {event.variant === "readme"
            ? `Selected ${summarizeReadmeModules(event.readmeModules ?? [])}`
            : event.detail}
        </span>
      </div>
      {event.inputPreview ? (
        <div className="tool-input-preview">
          <span>Tool input</span>
          <pre>{event.inputPreview}</pre>
        </div>
      ) : null}
      {event.sources && event.sources.length > 0 ? (
        <div className="tool-sources">
          {event.sources.slice(0, 3).map((source) => (
            <a
              className="tool-source-link"
              href={source.url}
              key={source.url}
              rel="noreferrer"
              target="_blank"
            >
              {source.title}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ThinkingBlock({
  items,
  shouldOpen,
}: {
  items: ThinkingItem[];
  shouldOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(shouldOpen);
  const contentId = useId();

  useEffect(() => {
    setIsOpen(shouldOpen);
  }, [shouldOpen]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className={`reasoning-block ${isOpen ? "is-open" : "is-closed"}`}>
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="reasoning-toggle"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>Thinking</span>
        <span aria-hidden="true" className="reasoning-chevron" />
      </button>
      <div
        aria-hidden={!isOpen}
        className="thinking-panel"
        id={contentId}
      >
        <div className="thinking-panel-inner">
          <div className="thinking-stack">
            {items.map((item) =>
              item.kind === "reasoning" ? (
                <MarkdownBlock key={item.key}>{item.text}</MarkdownBlock>
              ) : (
                <ToolEventCard event={item.event} key={item.key} />
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function renderableItemsFromMessage(message: ChatUIMessage): RenderableMessageItem[] {
  return message.parts.flatMap<RenderableMessageItem>((part, index) => {
    if (part.type === "text") {
      if (!part.text.trim()) {
        return [];
      }

      return [
        {
          kind: "text",
          key: `${message.id}-text-${index}`,
          text: part.text,
        },
      ];
    }

    if (!isWidgetToolPart(part)) {
      return [];
    }

    const input = widgetInputFromUnknown(part.input);

    return [
      {
        kind: "widget",
        key: `${part.toolCallId}-${part.state}`,
        title: input.title ?? "widget",
        widgetCode: input.widgetCode ?? "",
        loadingMessages: input.loadingMessages ?? [],
        status:
          part.state === "output-error"
            ? "error"
            : part.state === "input-streaming"
              ? "streaming"
              : "ready",
        errorText: part.state === "output-error" ? part.errorText : undefined,
      },
    ];
  });
}

function downloadableWidgetFromMessage(
  message: ChatUIMessage
): DownloadableGenerativeWidget | null {
  let downloadableWidget: DownloadableGenerativeWidget | null = null;

  for (const item of renderableItemsFromMessage(message)) {
    if (
      item.kind === "widget" &&
      item.status === "ready" &&
      item.widgetCode.trim()
    ) {
      downloadableWidget = {
        title: item.title,
        widgetCode: item.widgetCode,
      };
    }
  }

  return downloadableWidget;
}

function AssistantStreamingIndicator() {
  return (
    <div
      aria-live="polite"
      aria-label="Assistant is still generating"
      className="message-streaming-indicator"
      role="status"
    >
      <span aria-hidden="true" className="message-streaming-dots">
        <span className="message-streaming-dot" />
        <span className="message-streaming-dot" />
        <span className="message-streaming-dot" />
      </span>
    </div>
  );
}

function MessageContent({
  message,
  isStreaming = false,
}: {
  message: ChatUIMessage;
  isStreaming?: boolean;
}) {
  const thinkingItems = thinkingItemsFromMessage(message);
  const renderableItems = renderableItemsFromMessage(message);
  const hasVisibleOutput = renderableItems.length > 0;
  const shouldOpenThinking = !hasVisibleOutput;
  const showStreamingIndicator = isStreaming && !hasVisibleOutput;

  return (
    <>
      <ThinkingBlock items={thinkingItems} shouldOpen={shouldOpenThinking} />
      {showStreamingIndicator ? <AssistantStreamingIndicator /> : null}
      {renderableItems.map((item) =>
        item.kind === "text" ? (
          <MarkdownBlock key={item.key}>{item.text}</MarkdownBlock>
        ) : (
          <GenerativeWidget
            errorText={item.errorText}
            key={item.key}
            loadingMessages={item.loadingMessages}
            status={item.status}
            title={item.title}
            widgetCode={item.widgetCode}
          />
        )
      )}
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

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9 9h10v10H9z" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 12 5 5L20 7" />
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

function EllipsisIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
      <path d="m13.5 6.5 3 3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 7V4h6v3" />
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

function titleFromUserText(text: string) {
  const normalized = text.trim() || "New chat";

  return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized;
}

function createOptimisticUserMessage(text: string): ChatUIMessage {
  return {
    id: `local-${createChatId()}`,
    role: "user",
    parts: [{ type: "text", text }],
  };
}

function messageScrollSignature(messages: ChatUIMessage[]) {
  return messages
    .map((message) =>
      message.parts
        .map((part) => {
          if (part.type === "text" || part.type === "reasoning") {
            return `${part.type}:${part.text.length}`;
          }

          if (isWidgetToolPart(part)) {
            const input = widgetInputFromUnknown(part.input);
            const output = asRecord(part.output);
            const outputWidgetCode =
              typeof output?.widgetCode === "string" ? output.widgetCode : "";

            return [
              part.type,
              part.state,
              input.widgetCode?.length ?? 0,
              outputWidgetCode.length,
              part.errorText?.length ?? 0,
            ].join(":");
          }

          if (isToolLikePart(part)) {
            if (isVisualizeReadMeToolPart(part)) {
              return [
                part.type,
                part.state,
                readmeModulesFromUnknown(part.input).join(","),
                part.errorText?.length ?? 0,
              ].join(":");
            }

            return `${part.type}:${part.state}`;
          }

          return part.type;
        })
        .join(",")
    )
    .join(";");
}

export function ChatShell({ initialChatId }: { initialChatId?: string }) {
  const [chatId, setChatId] = useState<string | null>(() => initialChatId ?? null);
  const [chatList, setChatList] = useState<ChatSummary[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [chatPendingDelete, setChatPendingDelete] = useState<ChatSummary | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const chatIdRef = useRef(chatId);
  const lastLoadedChatIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldFollowStreamRef = useRef(true);
  const copyResetTimerRef = useRef<number | null>(null);
  const titleAnimationTimersRef = useRef<Map<string, number>>(new Map());
  const knownChatTitlesRef = useRef<Map<string, string>>(new Map());
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [animatedTitleChatIds, setAnimatedTitleChatIds] = useState<string[]>([]);
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

  const { error, messages, sendMessage, setMessages, status, stop } = useChat<ChatUIMessage>({
    transport,
    onFinish: () => {
      void loadChatList();
      requestAnimationFrame(() => {
        if (shouldFollowStreamRef.current) {
          scrollMessagesToBottom("smooth");
        }
      });
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const trimmedInput = input.trim();
  const streamScrollSignature = messageScrollSignature(messages);
  const streamingAssistantMessageId =
    status === "streaming"
      ? [...messages]
          .reverse()
          .find((message) => message.role === "assistant")?.id ?? null
      : null;

  function isMessageScrollAtBottom() {
    const element = messageScrollRef.current;

    if (!element) {
      return true;
    }

    return element.scrollHeight - element.scrollTop - element.clientHeight < 72;
  }

  function scrollMessagesToBottom(behavior: ScrollBehavior = "auto") {
    const element = messageScrollRef.current;

    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior,
      });
      return;
    }

    endRef.current?.scrollIntoView({ behavior });
  }

  function handleMessageScroll() {
    shouldFollowStreamRef.current = isMessageScrollAtBottom();
  }

  useEffect(() => {
    debugChat("render-state", {
      chatId,
      chatCount: chatList.length,
      messageCount: messages.length,
      status,
    });
  }, [chatId, chatList.length, messages.length, status]);

  useEffect(() => {
    if (!isBusy || !shouldFollowStreamRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      if (shouldFollowStreamRef.current) {
        scrollMessagesToBottom();
      }
    });
  }, [isBusy, status, streamScrollSignature]);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      titleAnimationTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });
      titleAnimationTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!editingChatId || !renameInputRef.current) {
      return;
    }

    renameInputRef.current.focus();
    renameInputRef.current.select();
  }, [editingChatId]);

  useEffect(() => {
    if (!openMenuChatId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        sidebarMenuRef.current &&
        event.target instanceof Node &&
        !sidebarMenuRef.current.contains(event.target)
      ) {
        setOpenMenuChatId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuChatId(null);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuChatId]);

  useEffect(() => {
    if (!chatPendingDelete) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setChatPendingDelete(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [chatPendingDelete]);

  useEffect(() => {
    window.sendPrompt = (text: string) => {
      void submitUserText(text, "widget");
    };

    return () => {
      delete window.sendPrompt;
    };
  });

  function animateChatTitle(chatId: string) {
    const existingTimer = titleAnimationTimersRef.current.get(chatId);

    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    setAnimatedTitleChatIds((current) => [
      ...current.filter((currentId) => currentId !== chatId),
      chatId,
    ]);

    const timer = window.setTimeout(() => {
      setAnimatedTitleChatIds((current) =>
        current.filter((currentId) => currentId !== chatId)
      );
      titleAnimationTimersRef.current.delete(chatId);
    }, 520);

    titleAnimationTimersRef.current.set(chatId, timer);
  }

  function mergeChatList(nextChats: ChatSummary[]) {
    const previousTitles = knownChatTitlesRef.current;
    const nextTitleMap = new Map<string, string>();

    nextChats.forEach((chat) => {
      nextTitleMap.set(chat.id, chat.title);

      const previousTitle = previousTitles.get(chat.id);

      if (previousTitle && previousTitle !== chat.title) {
        animateChatTitle(chat.id);
      }
    });

    knownChatTitlesRef.current = nextTitleMap;
    setChatList(nextChats);
  }

  function upsertChatSummary(chat: ChatSummary) {
    mergeChatList([
      chat,
      ...chatList.filter((currentChat) => currentChat.id !== chat.id),
    ]);
  }

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
    mergeChatList(nextChats);
    debugChat("history-list:done", {
      count: nextChats.length,
      durationMs: Math.round(performance.now() - startedAt),
    });
  }

  useEffect(() => {
    loadChatList();
  }, []);

  useEffect(() => {
    const hasPendingTitle = chatList.some((chat) => chat.titleState === "pending");

    if (!hasPendingTitle) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadChatList();
    }, 1400);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [chatList]);

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

      const chat = (await response.json()) as { messages?: ChatUIMessage[] };
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || !event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "k") {
        event.preventDefault();
        startNewChat();
        return;
      }

      if (key === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [startNewChat]);

  async function saveMessages(nextChatId: string, nextMessages: ChatUIMessage[]) {
    const startedAt = performance.now();
    debugChat("chat-save:start", {
      chatId: nextChatId,
      messageCount: nextMessages.length,
    });
    const response = await fetch("/api/chat/history", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: nextChatId, messages: nextMessages }),
    });

    if (!response.ok) {
      throw new Error(`Unable to save chat ${nextChatId}: ${response.status}`);
    }

    const savedChat = (await response.json()) as ChatSummary;
    upsertChatSummary(savedChat);

    debugChat("chat-save:done", {
      chatId: nextChatId,
      durationMs: Math.round(performance.now() - startedAt),
    });
  }

  async function persistOptimisticUserTurn(chatIdToSave: string, text: string) {
    try {
      await saveMessages(chatIdToSave, [
        ...messages,
        createOptimisticUserMessage(text),
      ]);
    } catch (error) {
      debugChat("chat-save:error", {
        chatId: chatIdToSave,
        error: error instanceof Error ? error.message : String(error),
      });
      setChatList((currentChats) => {
        const existingChat = currentChats.find((chat) => chat.id === chatIdToSave);
        const nextUpdatedAt = new Date().toISOString();

        if (existingChat) {
          return [
            { ...existingChat, updatedAt: nextUpdatedAt },
            ...currentChats.filter((chat) => chat.id !== chatIdToSave),
          ];
        }

        return [
          {
            id: chatIdToSave,
            title: titleFromUserText(text),
            updatedAt: nextUpdatedAt,
          },
          ...currentChats,
        ];
      });
    }
  }

  function replaceUrl(nextId?: string | null) {
    const nextPath = nextId ? `/chat/${nextId}` : "/";

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      debugChat("url:pushState", { nextPath });
    }
  }

  function focusComposer() {
    requestAnimationFrame(() => {
      const element = inputRef.current;

      if (!element) {
        return;
      }

      element.focus();
      const cursorPosition = element.value.length;
      element.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  function startNewChat() {
    debugChat("new-chat:start", { from: chatIdRef.current, to: null });
    stop();
    setOpenMenuChatId(null);
    setEditingChatId(null);
    setEditingTitle("");
    setChatPendingDelete(null);
    setChatId(null);
    chatIdRef.current = null;
    lastLoadedChatIdRef.current = null;
    setMessages([]);
    setInput("");
    replaceUrl(null);
    focusComposer();
    debugChat("new-chat:done", { chatId: null });
  }

  function toggleSidebar() {
    setIsSidebarOpen((current) => !current);
  }

  function openChat(nextId: string) {
    if (nextId === chatIdRef.current) {
      debugChat("open-chat:skip-active", { chatId: nextId });
      return;
    }

    debugChat("open-chat:start", { from: chatIdRef.current, to: nextId });
    stop();
    setOpenMenuChatId(null);
    setEditingChatId(null);
    setEditingTitle("");
    setChatPendingDelete(null);
    setChatId(nextId);
    chatIdRef.current = nextId;
    replaceUrl(nextId);
  }

  function ensureActiveChatId() {
    if (chatIdRef.current) {
      return chatIdRef.current;
    }

    const nextId = createChatId();
    // A brand-new chat has no persisted history yet. Mark it as locally loaded so
    // the history effect does not immediately replace the optimistic first user
    // message with an empty server response.
    lastLoadedChatIdRef.current = nextId;
    setChatId(nextId);
    chatIdRef.current = nextId;
    replaceUrl(nextId);
    debugChat("draft-chat:activate", { chatId: nextId });
    return nextId;
  }

  async function copyMessage(message: ChatUIMessage) {
    const text = copyTextFromMessage(message);

    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(message.id);

      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedMessageId((currentId) =>
          currentId === message.id ? null : currentId
        );
        copyResetTimerRef.current = null;
      }, 1600);
    } catch (error) {
      debugChat("copy-message:error", {
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function beginSidebarRename(chat: ChatSummary) {
    setOpenMenuChatId(null);
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  }

  function cancelSidebarRename() {
    setEditingChatId(null);
    setEditingTitle("");
  }

  async function commitSidebarRename(chat: ChatSummary) {
    const nextTitle = editingTitle.trim();

    if (!nextTitle || nextTitle === chat.title) {
      cancelSidebarRename();
      return;
    }

    const response = await fetch("/api/chat/history", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: chat.id, title: nextTitle }),
    });

    if (!response.ok) {
      debugChat("chat-rename:error", { chatId: chat.id, status: response.status });
      return;
    }

    cancelSidebarRename();
    await loadChatList();
  }

  function promptSidebarDelete(chat: ChatSummary) {
    setOpenMenuChatId(null);
    setChatPendingDelete(chat);
  }

  async function confirmSidebarDelete() {
    if (!chatPendingDelete) {
      return;
    }

    const chat = chatPendingDelete;
    setChatPendingDelete(null);

    const response = await fetch(
      `/api/chat/history?id=${encodeURIComponent(chat.id)}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      debugChat("chat-delete:error", { chatId: chat.id, status: response.status });
      return;
    }

    if (chat.id === chatIdRef.current) {
      startNewChat();
    }

    await loadChatList();
  }

  async function submitUserText(
    text: string,
    source: "composer" | "starter" | "widget"
  ) {
    const messageText = text.trim();

    if (!messageText || isBusy) {
      return;
    }

    const activeChatId = ensureActiveChatId();

    if (source === "composer") {
      setInput("");
    }

    debugChat(`${source}-send:start`, {
      chatId: activeChatId,
      length: messageText.length,
      prompt: source === "composer" ? undefined : messageText,
    });
    shouldFollowStreamRef.current = true;
    void persistOptimisticUserTurn(activeChatId, messageText);
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: messageText }],
    });

    requestAnimationFrame(() => {
      scrollMessagesToBottom("smooth");
    });
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    await submitUserText(trimmedInput, "composer");
  }

  async function sendStarter(prompt: string) {
    await submitUserText(prompt, "starter");
  }

  return (
    <main className="app-shell">
      <aside
        aria-label="Chat navigation"
        className={isSidebarOpen ? "sidebar" : "sidebar is-collapsed"}
      >
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <button
              aria-label="Toggle sidebar"
              className="ghost-icon"
              onClick={toggleSidebar}
              title="Toggle sidebar (Cmd+B)"
              type="button"
            >
              <PanelIcon />
            </button>
            <div className="header-spacer" />
          </div>

          <button
            className="new-chat-button"
            onClick={startNewChat}
            title="Start a new chat (Cmd+K)"
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
                <div
                  className={chat.id === chatId ? "chat-row active" : "chat-row"}
                  key={chat.id}
                  ref={openMenuChatId === chat.id ? sidebarMenuRef : null}
                >
                  {editingChatId === chat.id ? (
                    <input
                      aria-label={`Rename ${chat.title}`}
                      className="chat-title-input"
                      onBlur={() => {
                        void commitSidebarRename(chat);
                      }}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void commitSidebarRename(chat);
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelSidebarRename();
                        }
                      }}
                      ref={renameInputRef}
                      value={editingTitle}
                    />
                  ) : (
                    <Link
                      className={chat.id === chatId ? "chat-link active" : "chat-link"}
                      href={`/chat/${chat.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        openChat(chat.id);
                      }}
                      title={chat.title}
                    >
                      <span
                        className={
                          animatedTitleChatIds.includes(chat.id)
                            ? "chat-link-title is-refreshing"
                            : "chat-link-title"
                        }
                      >
                        {chat.title}
                      </span>
                    </Link>
                  )}
                  <button
                    aria-expanded={openMenuChatId === chat.id}
                    aria-haspopup="menu"
                    aria-label={`Open options for ${chat.title}`}
                    className={
                      openMenuChatId === chat.id
                        ? "chat-menu-trigger is-visible"
                        : "chat-menu-trigger"
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpenMenuChatId((current) =>
                        current === chat.id ? null : chat.id
                      );
                    }}
                    title="Chat options"
                    type="button"
                  >
                    <EllipsisIcon />
                  </button>
                  {openMenuChatId === chat.id ? (
                    <div
                      aria-label={`Options for ${chat.title}`}
                      className="chat-menu"
                      role="menu"
                    >
                      <button
                        className="chat-menu-item"
                        onClick={() => {
                          beginSidebarRename(chat);
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <PencilIcon />
                        <span>Rename</span>
                      </button>
                      <button
                        className="chat-menu-item danger"
                        onClick={() => {
                          promptSidebarDelete(chat);
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <TrashIcon />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {chatPendingDelete ? (
        <div
          aria-label="Delete chat confirmation"
          className="dialog-backdrop"
          onClick={() => setChatPendingDelete(null)}
          role="presentation"
        >
          <section
            aria-describedby="delete-chat-description"
            aria-labelledby="delete-chat-title"
            className="dialog-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <p className="dialog-eyebrow">Delete chat</p>
            <h2 id="delete-chat-title">Remove this conversation?</h2>
            <p className="dialog-description" id="delete-chat-description">
              <span>"{chatPendingDelete.title}"</span> will be removed from your sidebar history.
            </p>
            <div className="dialog-actions">
              <button
                className="dialog-button"
                onClick={() => setChatPendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="dialog-button danger"
                onClick={() => {
                  void confirmSidebarDelete();
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="chat-panel" aria-label="AI chat">
        <header className="chat-header">
          <button
            aria-label="Toggle sidebar"
            className={isSidebarOpen ? "ghost-icon mobile-only" : "ghost-icon"}
            onClick={toggleSidebar}
            title="Toggle sidebar (Cmd+B)"
            type="button"
          >
            <PanelIcon />
          </button>
          <div className="header-spacer" />
          <button
            aria-label="Start a new chat"
            className="ghost-icon"
            onClick={startNewChat}
            title="Start a new chat (Cmd+K)"
            type="button"
          >
            <NewChatIcon />
          </button>
        </header>

        <div
          className="message-scroll"
          onScroll={handleMessageScroll}
          ref={messageScrollRef}
        >
          {messages.length === 0 ? (
            <div className="empty-state">
              <h1>What can I help with?</h1>
              <p>Ask a question, write code, or explore ideas.</p>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => {
                const downloadableWidget =
                  message.role === "assistant"
                    ? downloadableWidgetFromMessage(message)
                    : null;
                const isStreamingAssistantMessage =
                  message.role === "assistant" &&
                  message.id === streamingAssistantMessageId;

                return (
                  <article
                    className={`message message-${message.role}`}
                    key={message.id}
                  >
                    {message.role === "user" ? (
                      <div className="message-user-row">
                        <button
                          aria-label="Copy user message"
                          className={`message-action-button ${
                            copiedMessageId === message.id ? "is-copied" : ""
                          }`}
                          onClick={() => {
                            void copyMessage(message);
                          }}
                          title={
                            copiedMessageId === message.id ? "Copied" : "Copy message"
                          }
                          type="button"
                        >
                          {copiedMessageId === message.id ? <CheckIcon /> : <CopyIcon />}
                        </button>
                        <div className="message-body">
                          <span className="message-role">You</span>
                          <MessageContent message={message} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="message-body">
                          <span className="message-role">Assistant</span>
                          <MessageContent
                            isStreaming={isStreamingAssistantMessage}
                            message={message}
                          />
                        </div>
                        {!isStreamingAssistantMessage ? (
                          <div className="message-actions">
                            <button
                              aria-label={
                                downloadableWidget
                                  ? "Copy widget HTML from assistant response"
                                  : "Copy assistant response"
                              }
                              className={`message-action-button ${
                                copiedMessageId === message.id ? "is-copied" : ""
                              }`}
                              onClick={() => {
                                void copyMessage(message);
                              }}
                              title={
                                copiedMessageId === message.id
                                  ? "Copied"
                                  : downloadableWidget
                                    ? "Copy widget HTML"
                                    : "Copy message"
                              }
                              type="button"
                            >
                              {copiedMessageId === message.id ? (
                                <CheckIcon />
                              ) : (
                                <CopyIcon />
                              )}
                            </button>
                            {downloadableWidget ? (
                              <button
                                aria-label="Download widget HTML files"
                                className="message-action-button"
                                onClick={() => {
                                  downloadGenerativeWidgetZip(downloadableWidget);
                                }}
                                title="Download widget HTML"
                                type="button"
                              >
                                <DownloadIcon />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </article>
                );
              })}
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
              ref={inputRef}
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
