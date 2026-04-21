"use client";

import {
  GenerativeWidget,
  downloadGenerativeWidgetZip,
  type DownloadableGenerativeWidget,
} from "@/components/generative-widget";
import type {
  ChatModelSelection,
  ChatProviderId,
  ChatProviderOption,
} from "@/lib/chat-model-config";
import { normalizeShowWidgetToolInput } from "@/lib/generative-ui/show-widget-input";
import { openTrustedWidgetLink } from "@/lib/generative-ui/browser-links";
import type { ChatUIMessage } from "@/lib/chat-message";
import { Chat as ReactChat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import {
  Children,
  FormEvent,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatSummary = {
  id: string;
  title: string;
  titleState?: "pending" | "ready";
  updatedAt: string;
};

type ChatController = ReactChat<ChatUIMessage>;

type ProviderModelsState = {
  status: "idle" | "loading" | "ready" | "error";
  models: string[];
  source: "suggested" | "provider-api";
  errorMessage?: string;
};

type ModelPickerView = "models" | "providers" | "manage";

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

type ModelVisibilityPreferencesPayload = {
  hiddenModelKeys?: unknown;
};

declare global {
  interface Window {
    sendPrompt?: (text: string) => void;
    openLink?: (url: string) => boolean;
  }
}

const DEFAULT_MODEL_SELECTION: ChatModelSelection = {
  providerId: "volcengine",
  modelId: "doubao-seed-2-0-pro-260215",
};

const MODEL_VISIBILITY_STORAGE_KEY = "open-visual-layout:model-visibility:v1";

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function modelVisibilityKey(providerId: string, modelId: string) {
  return `${providerId}:${modelId}`;
}

function normalizeHiddenModelKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return uniqueStrings(
    value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim())
  );
}

function buildProviderModelsState(
  provider: ChatProviderOption | undefined,
  existing?: ProviderModelsState
) {
  const suggestedModels = provider ? uniqueStrings(provider.suggestedModels) : [];

  if (!existing) {
    return {
      status: "idle",
      models: suggestedModels,
      source: "suggested",
    } satisfies ProviderModelsState;
  }

  return {
    ...existing,
    models: uniqueStrings([...existing.models, ...suggestedModels]),
  } satisfies ProviderModelsState;
}

function mergeModelOptions(
  provider: ChatProviderOption | undefined,
  state: ProviderModelsState | undefined,
  currentModelId: string
) {
  return uniqueStrings([
    currentModelId,
    ...(state?.models ?? []),
    ...(provider?.suggestedModels ?? []),
  ]);
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

function postWidgetReasoningFromMessage(message: ChatUIMessage) {
  let lastWidgetIndex = -1;

  for (let index = message.parts.length - 1; index >= 0; index -= 1) {
    if (isWidgetToolPart(message.parts[index])) {
      lastWidgetIndex = index;
      break;
    }
  }

  if (lastWidgetIndex < 0) {
    return "";
  }

  return message.parts
    .slice(lastWidgetIndex + 1)
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

  const compactName = rawName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment, index) => {
      const normalizedSegment = /^[A-Z0-9]+$/.test(segment)
        ? segment.toLowerCase()
        : segment;
      const [first = "", ...rest] = normalizedSegment;

      return index === 0
        ? `${first.toLowerCase()}${rest.join("")}`
        : `${first.toUpperCase()}${rest.join("")}`;
    })
    .join("");

  const canonicalNames: Record<string, string> = {
    showwidget: "showWidget",
    tavilysearch: "tavilySearch",
    visualizereadme: "visualizeReadMe",
  };

  return canonicalNames[compactName.toLowerCase()] ?? compactName;
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
      <ReactMarkdown
        components={{
          li: MarkdownListItem,
        }}
        remarkPlugins={[remarkGfm]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownListItem({
  children,
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"li"> & { node?: unknown }) {
  const childArray = Children.toArray(children).filter(
    (child) => !(typeof child === "string" && !child.trim())
  );
  const firstNestedListIndex = childArray.findIndex(
    (child) => isValidElement(child) && (child.type === "ul" || child.type === "ol")
  );

  if (firstNestedListIndex < 0) {
    const [firstChild, ...restChildren] = childArray;

    if (!isValidElement(firstChild) || firstChild.type !== "p") {
      return <li {...props}>{children}</li>;
    }

    const firstParagraphChildren = (
      firstChild.props as { children?: ReactNode }
    ).children;

    return (
      <li {...props}>
        <span className="markdown-list-item-content">{firstParagraphChildren}</span>
        {restChildren}
      </li>
    );
  }

  const leadingChildren = childArray.slice(0, firstNestedListIndex);
  const trailingChildren = childArray.slice(firstNestedListIndex);
  const contentChildren =
    leadingChildren.length === 1 &&
    isValidElement(leadingChildren[0]) &&
    leadingChildren[0].type === "p"
      ? (leadingChildren[0].props as { children?: ReactNode }).children
      : leadingChildren;

  if (leadingChildren.length === 0) {
    return <li {...props}>{children}</li>;
  }

  return (
    <li {...props}>
      <span className="markdown-list-item-content">{contentChildren}</span>
      {trailingChildren}
    </li>
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
            ? summarizeReadmeModules(event.readmeModules ?? [])
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

function AssistantWidgetReasoningPreview({
  reasoningText,
}: {
  reasoningText: string;
}) {
  return (
    <div
      aria-live="polite"
      aria-label="Assistant reasoning in progress"
      className="message-widget-reasoning-preview"
      role="status"
    >
      <MarkdownBlock>{reasoningText}</MarkdownBlock>
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
  const hasWidgetOutput = renderableItems.some((item) => item.kind === "widget");
  const hasTextOutput = renderableItems.some((item) => item.kind === "text");
  const hasStreamingWidgetLoading =
    isStreaming &&
    renderableItems.some(
      (item) =>
        item.kind === "widget" &&
        item.status === "streaming" &&
        item.loadingMessages.length > 0
    );
  const postWidgetReasoning = postWidgetReasoningFromMessage(message).trim();
  const shouldOpenThinking = !hasVisibleOutput;
  const showStreamingIndicator = isStreaming && !hasStreamingWidgetLoading;
  const showWidgetReasoningPreview =
    isStreaming && hasWidgetOutput && !hasTextOutput && postWidgetReasoning.length > 0;

  return (
    <>
      <ThinkingBlock items={thinkingItems} shouldOpen={shouldOpenThinking} />
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
      {showWidgetReasoningPreview ? (
        <AssistantWidgetReasoningPreview reasoningText={postWidgetReasoning} />
      ) : null}
      {showStreamingIndicator ? <AssistantStreamingIndicator /> : null}
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

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m21 21-4.35-4.35" />
      <path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TuneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 6h8" />
      <path d="M16 6h4" />
      <path d="M10 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
      <path d="M4 18h4" />
      <path d="M12 18h8" />
      <path d="M8 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
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
  const [starterPrompts, setStarterPrompts] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [providerOptions, setProviderOptions] = useState<ChatProviderOption[]>([]);
  const [defaultModelSelection, setDefaultModelSelection] =
    useState<ChatModelSelection>(DEFAULT_MODEL_SELECTION);
  const [draftModelSelection, setDraftModelSelection] =
    useState<ChatModelSelection>(DEFAULT_MODEL_SELECTION);
  const [chatModelSelections, setChatModelSelections] = useState<
    Record<string, ChatModelSelection>
  >({});
  const [providerModels, setProviderModels] = useState<
    Record<string, ProviderModelsState>
  >({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [chatPendingDelete, setChatPendingDelete] = useState<ChatSummary | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [modelPickerView, setModelPickerView] = useState<ModelPickerView>("models");
  const [modelQuery, setModelQuery] = useState("");
  const [providerQuery, setProviderQuery] = useState("");
  const [manageModelQuery, setManageModelQuery] = useState("");
  const [hiddenModelKeys, setHiddenModelKeys] = useState<string[]>([]);
  const chatIdRef = useRef(chatId);
  const defaultModelSelectionRef = useRef(defaultModelSelection);
  const draftModelSelectionRef = useRef(draftModelSelection);
  const lastLoadedChatIdRef = useRef<string | null>(null);
  const chatControllersRef = useRef<Map<string, ChatController>>(new Map());
  const chatModelSelectionsRef = useRef<Map<string, ChatModelSelection>>(new Map());
  const draftChatRef = useRef<ChatController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldFollowStreamRef = useRef(true);
  const copyResetTimerRef = useRef<number | null>(null);
  const titleAnimationTimersRef = useRef<Map<string, number>>(new Map());
  const knownChatTitlesRef = useRef<Map<string, string>>(new Map());
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [animatedTitleChatIds, setAnimatedTitleChatIds] = useState<string[]>([]);

  function getProviderOption(providerId: ChatProviderId | string) {
    return providerOptions.find((provider) => provider.id === providerId);
  }

  function normalizeLocalModelSelection(
    value: Partial<ChatModelSelection> | null | undefined
  ) {
    const fallback = defaultModelSelectionRef.current;
    const requestedProviderId = value?.providerId;
    const provider = requestedProviderId
      ? getProviderOption(requestedProviderId)
      : getProviderOption(fallback.providerId);
    const providerId = (provider?.id ?? fallback.providerId) as ChatProviderId;

    return {
      providerId,
      modelId: value?.modelId?.trim() || provider?.defaultModelId || fallback.modelId,
    } satisfies ChatModelSelection;
  }

  function writeDraftModelSelection(nextSelection: ChatModelSelection) {
    draftModelSelectionRef.current = nextSelection;
    setDraftModelSelection(nextSelection);
  }

  async function loadModelVisibilityPreferences() {
    let localHiddenModelKeys: string[] = [];

    try {
      localHiddenModelKeys = normalizeHiddenModelKeys(
        JSON.parse(
          window.localStorage.getItem(MODEL_VISIBILITY_STORAGE_KEY) ?? "[]"
        )
      );
    } catch {
      localHiddenModelKeys = [];
    }

    try {
      const response = await fetch("/api/chat/preferences");

      if (!response.ok) {
        throw new Error(`Unable to load preferences: `);
      }

      const data = (await response.json()) as ModelVisibilityPreferencesPayload;
      return normalizeHiddenModelKeys(data.hiddenModelKeys).length > 0
        ? normalizeHiddenModelKeys(data.hiddenModelKeys)
        : localHiddenModelKeys;
    } catch {
      return localHiddenModelKeys;
    }
  }

  async function saveModelVisibilityPreferences(nextHiddenModelKeys: string[]) {
    await fetch("/api/chat/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hiddenModelKeys: nextHiddenModelKeys }),
    });
  }

  function cacheChatModelSelection(chatKey: string, selection: ChatModelSelection) {
    const normalizedSelection = normalizeLocalModelSelection(selection);
    chatModelSelectionsRef.current.set(chatKey, normalizedSelection);
    setChatModelSelections((current) => ({
      ...current,
      [chatKey]: normalizedSelection,
    }));
  }

  function dropChatModelSelection(chatKey: string) {
    chatModelSelectionsRef.current.delete(chatKey);
    setChatModelSelections((current) => {
      const next = { ...current };
      delete next[chatKey];
      return next;
    });
  }

  function getModelSelectionForRequest(chatKey: string) {
    return (
      chatModelSelectionsRef.current.get(chatKey) ??
      (chatKey === "draft-chat"
        ? draftModelSelectionRef.current
        : defaultModelSelectionRef.current)
    );
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest(request) {
          return {
            body: {
              id: request.id,
              messages: request.messages,
              modelSelection: getModelSelectionForRequest(request.id),
              trigger: request.trigger,
            },
          };
        },
      }),
    []
  );

  function createChatController(id: string, initialMessages: ChatUIMessage[] = []) {
    return new ReactChat<ChatUIMessage>({
      id,
      messages: initialMessages,
      transport,
      onFinish: () => {
        void loadChatList();
        if (id !== chatIdRef.current) {
          return;
        }

        requestAnimationFrame(() => {
          if (shouldFollowStreamRef.current) {
            scrollMessagesToBottom("smooth");
          }
        });
      },
    });
  }

  function getChatController(id: string, initialMessages?: ChatUIMessage[]) {
    const existingController = chatControllersRef.current.get(id);

    if (existingController) {
      return existingController;
    }

    const nextController = createChatController(id, initialMessages);
    chatControllersRef.current.set(id, nextController);
    return nextController;
  }

  if (!draftChatRef.current) {
    draftChatRef.current = createChatController("draft-chat");
  }

  const activeChat = chatId
    ? getChatController(chatId)
    : draftChatRef.current;

  const { error, messages, setMessages, status, stop } = useChat<ChatUIMessage>({
    chat: activeChat,
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
  const activeModelSelection = chatId
    ? chatModelSelections[chatId] ?? defaultModelSelection
    : draftModelSelection;
  const activeProvider = getProviderOption(activeModelSelection.providerId);
  const activeProviderModels = providerModels[activeModelSelection.providerId];

  function isModelVisible(providerId: string, modelId: string) {
    return !hiddenModelKeys.includes(modelVisibilityKey(providerId, modelId));
  }

  function getProviderKnownModels(
    provider: ChatProviderOption | undefined,
    currentModelId = ""
  ) {
    return mergeModelOptions(provider, provider ? providerModels[provider.id] : undefined, currentModelId);
  }

  const groupedModelOptions = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();
    return providerOptions
      .filter(
        (provider) =>
          provider.configured || provider.id === activeModelSelection.providerId
      )
      .map((provider) => {
        const models = getProviderKnownModels(
          provider,
          provider.id === activeModelSelection.providerId
            ? activeModelSelection.modelId
            : ""
        ).filter((modelId) => {
          const isCurrentSelection =
            modelId === activeModelSelection.modelId &&
            provider.id === activeModelSelection.providerId;

          if (!isCurrentSelection && !isModelVisible(provider.id, modelId)) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            modelId.toLowerCase().includes(query) ||
            provider.label.toLowerCase().includes(query) ||
            provider.description.toLowerCase().includes(query)
          );
        });

        return {
          provider,
          models,
        };
      })
      .filter((entry) => entry.models.length > 0);
  }, [
    activeModelSelection.modelId,
    activeModelSelection.providerId,
    hiddenModelKeys,
    modelQuery,
    providerModels,
    providerOptions,
  ]);

  const providerSearchGroups = useMemo(() => {
    const query = providerQuery.trim().toLowerCase();
    const filteredProviders = providerOptions.filter((provider) => {
      if (!query) {
        return true;
      }

      return (
        provider.label.toLowerCase().includes(query) ||
        provider.description.toLowerCase().includes(query) ||
        provider.apiKeyEnv.toLowerCase().includes(query)
      );
    });

    return {
      connected: filteredProviders.filter((provider) => provider.configured),
      available: filteredProviders.filter((provider) => !provider.configured),
    };
  }, [providerOptions, providerQuery]);

  const manageableProviderGroups = useMemo(() => {
    const query = manageModelQuery.trim().toLowerCase();
    return providerOptions
      .filter(
        (provider) =>
          provider.configured || provider.id === activeModelSelection.providerId
      )
      .map((provider) => ({
        provider,
        models: getProviderKnownModels(
          provider,
          provider.id === activeModelSelection.providerId
            ? activeModelSelection.modelId
            : ""
        ).filter((modelId) => {
          if (!query) {
            return true;
          }

          return (
            modelId.toLowerCase().includes(query) ||
            provider.label.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((entry) => entry.models.length > 0);
  }, [
    activeModelSelection.modelId,
    activeModelSelection.providerId,
    manageModelQuery,
    providerModels,
    providerOptions,
  ]);

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
    defaultModelSelectionRef.current = defaultModelSelection;
  }, [defaultModelSelection]);

  useEffect(() => {
    draftModelSelectionRef.current = draftModelSelection;
  }, [draftModelSelection]);

  useEffect(() => {
    let ignore = false;

    async function hydrateModelVisibilityPreferences() {
      const nextHiddenModelKeys = await loadModelVisibilityPreferences();

      if (ignore) {
        return;
      }

      hasHydratedModelVisibilityRef.current = true;
      setHiddenModelKeys(nextHiddenModelKeys);
    }

    void hydrateModelVisibilityPreferences();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedModelVisibilityRef.current) {
      return;
    }

    window.localStorage.setItem(
      MODEL_VISIBILITY_STORAGE_KEY,
      JSON.stringify(hiddenModelKeys)
    );

    void saveModelVisibilityPreferences(hiddenModelKeys);
  }, [hiddenModelKeys]);

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
    if (!isModelPickerOpen) {
      return;
    }

    requestAnimationFrame(() => {
      modelSearchInputRef.current?.focus();
      modelSearchInputRef.current?.select();
    });

    function handlePointerDown(event: MouseEvent) {
      if (
        modelPickerRef.current &&
        event.target instanceof Node &&
        !modelPickerRef.current.contains(event.target)
      ) {
        setIsModelPickerOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModelPickerOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isModelPickerOpen, modelPickerView]);

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
    window.openLink = (url: string) => openTrustedWidgetLink(url);

    return () => {
      delete window.sendPrompt;
      delete window.openLink;
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

  function hydrateProviderModels(nextProviders: ChatProviderOption[]) {
    setProviderModels((current) => {
      const nextState: Record<string, ProviderModelsState> = {};

      nextProviders.forEach((provider) => {
        nextState[provider.id] = buildProviderModelsState(
          provider,
          current[provider.id]
        );
      });

      return nextState;
    });
  }

  async function loadProviderCatalog() {
    const response = await fetch("/api/chat/providers");

    if (!response.ok) {
      debugChat("provider-catalog:error", { status: response.status });
      return;
    }

    const data = (await response.json()) as {
      providers?: ChatProviderOption[];
      defaultSelection?: ChatModelSelection;
    };
    const nextProviders = Array.isArray(data.providers) ? data.providers : [];
    const nextDefaultSelection =
      data.defaultSelection?.providerId && data.defaultSelection?.modelId
        ? data.defaultSelection
        : DEFAULT_MODEL_SELECTION;
    const normalizeWithProviders = (
      value: Partial<ChatModelSelection> | null | undefined
    ) => {
      const fallback = nextDefaultSelection;
      const provider =
        nextProviders.find((entry) => entry.id === value?.providerId) ??
        nextProviders.find((entry) => entry.id === fallback.providerId);
      const providerId = (provider?.id ?? fallback.providerId) as ChatProviderId;

      return {
        providerId,
        modelId: value?.modelId?.trim() || provider?.defaultModelId || fallback.modelId,
      } satisfies ChatModelSelection;
    };

    setProviderOptions(nextProviders);
    hydrateProviderModels(nextProviders);
    defaultModelSelectionRef.current = nextDefaultSelection;
    setDefaultModelSelection(nextDefaultSelection);
    setDraftModelSelection((current) => {
      const nextSelection = normalizeWithProviders(current);
      draftModelSelectionRef.current = nextSelection;
      return nextSelection;
    });
    setChatModelSelections((current) => {
      const next: Record<string, ChatModelSelection> = {};

      Object.entries(current).forEach(([chatKey, selection]) => {
        const normalizedSelection = normalizeWithProviders(selection);
        chatModelSelectionsRef.current.set(chatKey, normalizedSelection);
        next[chatKey] = normalizedSelection;
      });

      return next;
    });
  }

  async function loadProviderModels(providerId: ChatProviderId, force = false) {
    const provider = getProviderOption(providerId);

    if (!provider?.canListModels) {
      return;
    }

    const currentState = providerModels[providerId];

    if (!force && currentState?.status === "loading") {
      return;
    }

    if (!force && currentState?.source === "provider-api" && currentState.models.length > 0) {
      return;
    }

    setProviderModels((current) => ({
      ...current,
      [providerId]: {
        ...(buildProviderModelsState(provider, current[providerId]) ?? {
          status: "idle",
          models: [],
          source: "suggested",
        }),
        status: "loading",
        errorMessage: undefined,
      },
    }));

    try {
      const response = await fetch(
        `/api/chat/models?providerId=${encodeURIComponent(providerId)}`
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as { models?: string[] };
      const loadedModels = Array.isArray(data.models)
        ? data.models.filter((model): model is string => typeof model === "string")
        : [];

      setProviderModels((current) => ({
        ...current,
        [providerId]: {
          status: "ready",
          models: uniqueStrings([
            ...mergeModelOptions(provider, current[providerId], ""),
            ...loadedModels,
          ]),
          source: "provider-api",
        },
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to load models.";

      setProviderModels((current) => ({
        ...current,
        [providerId]: {
          ...buildProviderModelsState(provider, current[providerId]),
          status: "error",
          errorMessage,
        },
      }));
    }
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
    void loadProviderCatalog();
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadStarterPrompts() {
      try {
        const response = await fetch("/api/starter-prompts");

        if (!response.ok) {
          throw new Error(`Unable to load starter prompts: ${response.status}`);
        }

        const data = (await response.json()) as { prompts?: unknown };
        const prompts = Array.isArray(data.prompts)
          ? data.prompts.filter((prompt): prompt is string => typeof prompt === "string")
          : [];

        if (!ignore) {
          setStarterPrompts(prompts);
        }
      } catch (error) {
        debugChat("starter-prompts:error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void loadStarterPrompts();

    return () => {
      ignore = true;
    };
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

      const existingController = chatControllersRef.current.get(chatId);

      if (
        existingController &&
        (existingController.messages.length > 0 ||
          existingController.status !== "ready")
      ) {
        lastLoadedChatIdRef.current = chatId;
        debugChat("chat-load:skip-local-controller", {
          chatId,
          messageCount: existingController.messages.length,
          status: existingController.status,
        });
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

      const chat = (await response.json()) as {
        messages?: ChatUIMessage[];
        modelSelection?: ChatModelSelection;
      };
      const nextMessages = Array.isArray(chat.messages) ? chat.messages : [];

      if (!ignore) {
        lastLoadedChatIdRef.current = chatId;
        if (chat.modelSelection) {
          cacheChatModelSelection(chatId, chat.modelSelection);
        }
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
    if (!activeProvider?.configured || !activeProvider.canListModels) {
      return;
    }

    const currentState = providerModels[activeProvider.id];

    if (!currentState || currentState.status !== "idle") {
      return;
    }

    void loadProviderModels(activeProvider.id);
  }, [activeProvider, providerModels]);

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
    const modelSelection = getModelSelectionForRequest(nextChatId);
    debugChat("chat-save:start", {
      chatId: nextChatId,
      messageCount: nextMessages.length,
      providerId: modelSelection.providerId,
      modelId: modelSelection.modelId,
    });
    const response = await fetch("/api/chat/history", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: nextChatId,
        messages: nextMessages,
        modelSelection,
      }),
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

  async function persistOptimisticUserTurn(
    chatIdToSave: string,
    message: ChatUIMessage,
    baseMessages: ChatUIMessage[]
  ) {
    try {
      await saveMessages(chatIdToSave, [...baseMessages, message]);
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
            title: titleFromUserText(message.parts.find(p => p.type === 'text')?.text || ""),
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
    setOpenMenuChatId(null);
    setEditingChatId(null);
    setEditingTitle("");
    setChatPendingDelete(null);
    setChatId(null);
    chatIdRef.current = null;
    lastLoadedChatIdRef.current = null;
    draftChatRef.current!.messages = [];
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
    cacheChatModelSelection(nextId, draftModelSelectionRef.current);
    replaceUrl(nextId);
    debugChat("draft-chat:activate", { chatId: nextId });
    return nextId;
  }

  function updateActiveModelSelection(nextSelection: Partial<ChatModelSelection>) {
    const normalizedSelection = normalizeLocalModelSelection({
      ...activeModelSelection,
      ...nextSelection,
    });

    if (chatIdRef.current) {
      cacheChatModelSelection(chatIdRef.current, normalizedSelection);
      return;
    }

    writeDraftModelSelection(normalizedSelection);
  }

  function selectProvider(providerId: ChatProviderId) {
    const provider = getProviderOption(providerId);

    updateActiveModelSelection({
      providerId,
      modelId: provider?.defaultModelId || activeModelSelection.modelId,
    });

    void loadProviderModels(providerId);
  }

  function updateModelId(modelId: string) {
    updateActiveModelSelection({ modelId });
  }

  function setModelVisibility(
    providerId: ChatProviderId,
    modelId: string,
    isVisible: boolean
  ) {
    const key = modelVisibilityKey(providerId, modelId);

    setHiddenModelKeys((current) =>
      isVisible
        ? current.filter((entry) => entry !== key)
        : uniqueStrings([...current, key])
    );
  }

  function setProviderModelVisibility(
    providerId: ChatProviderId,
    modelIds: string[],
    isVisible: boolean
  ) {
    const keys = new Set(modelIds.map((modelId) => modelVisibilityKey(providerId, modelId)));

    setHiddenModelKeys((current) => {
      if (isVisible) {
        return current.filter((entry) => !keys.has(entry));
      }

      return uniqueStrings([...current, ...keys]);
    });
  }

  function openProviderPicker() {
    setProviderQuery("");
    setModelPickerView("providers");
  }

  function openManageModels() {
    setManageModelQuery("");
    setModelPickerView("manage");
  }

  function returnToModelList() {
    setModelPickerView("models");
  }

  function applyManualModelQuery() {
    const nextModelId = modelQuery.trim();

    if (!nextModelId) {
      return;
    }

    updateModelId(nextModelId);
    setIsModelPickerOpen(false);
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
    const chatController = chatControllersRef.current.get(chat.id);
    void chatController?.stop();
    chatControllersRef.current.delete(chat.id);

    const response = await fetch(
      `/api/chat/history?id=${encodeURIComponent(chat.id)}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      debugChat("chat-delete:error", { chatId: chat.id, status: response.status });
      return;
    }

    dropChatModelSelection(chat.id);

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
    const activeChatController = getChatController(activeChatId);
    const userMessage = createOptimisticUserMessage(messageText);

    void persistOptimisticUserTurn(
      activeChatId,
      userMessage,
      activeChatController.messages
    );

    await activeChatController.sendMessage(userMessage);

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
            <div className="sidebar-history-list">
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
          <div className="chat-header-leading">
            <button
              aria-label="Toggle sidebar"
              className={isSidebarOpen ? "ghost-icon mobile-only" : "ghost-icon"}
              onClick={toggleSidebar}
              title="Toggle sidebar (Cmd+B)"
              type="button"
            >
              <PanelIcon />
            </button>
            <button
              aria-label="Start a new chat"
              className={isSidebarOpen ? "ghost-icon mobile-only" : "ghost-icon"}
              onClick={startNewChat}
              title="Start a new chat (Cmd+K)"
              type="button"
            >
              <NewChatIcon />
            </button>
          </div>
          <div className="header-spacer" />
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
              {messages.map((message, index) => {
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
                    key={message.id || `msg-${index}`}
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
          {messages.length === 0 && starterPrompts.length > 0 && (
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
                <div className="model-rail">
                  <button
                    aria-expanded={isModelPickerOpen}
                    className="model-trigger"
                    onClick={() => {
                      setModelPickerView("models");
                      setModelQuery("");
                      setProviderQuery("");
                      setManageModelQuery("");
                      setIsModelPickerOpen((current) => !current);
                    }}
                    title={
                      activeProvider
                        ? `${activeProvider.label} · ${activeModelSelection.modelId}`
                        : activeModelSelection.modelId
                    }
                    type="button"
                  >
                    <span className="model-trigger-text">{activeModelSelection.modelId}</span>
                    <ChevronDownIcon />
                  </button>
                </div>
                {isModelPickerOpen ? (
                  <div className="model-picker" ref={modelPickerRef}>
                    <div className="model-picker-topbar">
                      {modelPickerView !== "models" ? (
                        <button
                          aria-label="Back to model list"
                          className="picker-icon-button picker-back-button"
                          onClick={returnToModelList}
                          title="Back"
                          type="button"
                        >
                          <ChevronLeftIcon />
                        </button>
                      ) : null}
                      <div className="model-search">
                        <SearchIcon />
                        <input
                          aria-label={
                            modelPickerView === "providers"
                              ? "Search providers"
                              : "Search models"
                          }
                          className="model-search-input"
                          onChange={(event) => {
                            const nextValue = event.target.value;

                            if (modelPickerView === "models") {
                              setModelQuery(nextValue);
                              return;
                            }

                            if (modelPickerView === "providers") {
                              setProviderQuery(nextValue);
                              return;
                            }

                            setManageModelQuery(nextValue);
                          }}
                          onKeyDown={(event) => {
                            if (
                              modelPickerView === "models" &&
                              event.key === "Enter"
                            ) {
                              event.preventDefault();
                              applyManualModelQuery();
                            }
                          }}
                          placeholder={
                            modelPickerView === "providers"
                              ? "Search providers"
                              : "Search models"
                          }
                          ref={modelSearchInputRef}
                          value={
                            modelPickerView === "models"
                              ? modelQuery
                              : modelPickerView === "providers"
                                ? providerQuery
                                : manageModelQuery
                          }
                        />
                      </div>
                      {modelPickerView === "models" ? (
                        <>
                          <button
                            aria-label="Connect provider"
                            className="picker-icon-button"
                            onClick={openProviderPicker}
                            title="Connect Provider"
                            type="button"
                          >
                            <PlusIcon />
                          </button>
                          <button
                            aria-label="Manage models"
                            className="picker-icon-button"
                            onClick={openManageModels}
                            title="Manage Models"
                            type="button"
                          >
                            <TuneIcon />
                          </button>
                        </>
                      ) : null}
                    </div>
                    {modelPickerView === "providers" ? (
                      <>
                        <div className="model-group-list">
                          {providerSearchGroups.connected.length === 0 &&
                          providerSearchGroups.available.length === 0 ? (
                            <p className="model-empty-state">
                              No providers match that search.
                            </p>
                          ) : (
                            <>
                              {providerSearchGroups.connected.length > 0 ? (
                                <section className="model-group">
                                  <div className="model-group-label">
                                    <span>Connected</span>
                                  </div>
                                  <div className="provider-option-list">
                                    {providerSearchGroups.connected.map((provider) => (
                                      <button
                                        className={
                                          provider.id === activeModelSelection.providerId
                                            ? "provider-option is-active"
                                            : "provider-option"
                                        }
                                        key={provider.id}
                                        onClick={() => {
                                          selectProvider(provider.id);
                                          setModelQuery("");
                                          returnToModelList();
                                        }}
                                        type="button"
                                      >
                                        <span className="provider-option-copy">
                                          <span className="provider-option-title-row">
                                            <span className="provider-option-title">
                                              {provider.label}
                                            </span>
                                            <span className="model-group-badges">
                                              {provider.id === activeModelSelection.providerId ? (
                                                <span className="model-group-badge is-current">
                                                  Current
                                                </span>
                                              ) : null}
                                              <span className="model-group-badge">
                                                Connected
                                              </span>
                                            </span>
                                          </span>
                                          <span className="provider-option-description">
                                            {provider.description}
                                          </span>
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </section>
                              ) : null}
                              {providerSearchGroups.available.length > 0 ? (
                                <section className="model-group">
                                  <div className="model-group-label">
                                    <span>Available</span>
                                  </div>
                                  <div className="provider-option-list">
                                    {providerSearchGroups.available.map((provider) => (
                                      <button
                                        className={
                                          provider.id === activeModelSelection.providerId
                                            ? "provider-option is-active"
                                            : "provider-option"
                                        }
                                        key={provider.id}
                                        onClick={() => {
                                          selectProvider(provider.id);
                                          setModelQuery("");
                                          returnToModelList();
                                        }}
                                        type="button"
                                      >
                                        <span className="provider-option-copy">
                                          <span className="provider-option-title-row">
                                            <span className="provider-option-title">
                                              {provider.label}
                                            </span>
                                            <span className="model-group-badges">
                                              {provider.id === activeModelSelection.providerId ? (
                                                <span className="model-group-badge is-current">
                                                  Current
                                                </span>
                                              ) : null}
                                              <span className="model-group-badge">
                                                Set {provider.apiKeyEnv}
                                              </span>
                                            </span>
                                          </span>
                                          <span className="provider-option-description">
                                            {provider.description}
                                          </span>
                                          <span className="provider-option-meta">
                                            Add {provider.apiKeyEnv} to `.env.local`, then reload to
                                            enable this provider.
                                          </span>
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </section>
                              ) : null}
                            </>
                          )}
                        </div>
                      </>
                    ) : modelPickerView === "manage" ? (
                      <div className="model-group-list">
                        {manageableProviderGroups.length === 0 ? (
                          <p className="model-empty-state">
                            No models match that search.
                          </p>
                        ) : (
                          manageableProviderGroups.map(({ provider, models }) => {
                            const allVisible = models.every((modelId) =>
                              isModelVisible(provider.id, modelId)
                            );
                            const providerState = providerModels[provider.id];

                            return (
                              <section className="model-group" key={provider.id}>
                                <div className="model-group-label manage-group-label">
                                  <span className="model-group-title">{provider.label}</span>
                                  <div className="manage-group-actions">
                                    {provider.configured && provider.canListModels ? (
                                      <button
                                        className="picker-text-button"
                                        onClick={() => {
                                          void loadProviderModels(provider.id, true);
                                        }}
                                        type="button"
                                      >
                                        {providerState?.status === "loading" ? "Syncing..." : "Sync"}
                                      </button>
                                    ) : null}
                                    <button
                                      className="picker-text-button"
                                      onClick={() => {
                                        setProviderModelVisibility(
                                          provider.id,
                                          models,
                                          !allVisible
                                        );
                                      }}
                                      type="button"
                                    >
                                      {allVisible ? "Hide all" : "Show all"}
                                    </button>
                                  </div>
                                </div>
                                <div className="model-option-list">
                                  {models.map((modelId) => {
                                    const isVisible = isModelVisible(provider.id, modelId);

                                    return (
                                      <button
                                        className={
                                          isVisible
                                            ? "manage-model-option is-visible"
                                            : "manage-model-option"
                                        }
                                        key={`${provider.id}:${modelId}`}
                                        onClick={() => {
                                          setModelVisibility(
                                            provider.id,
                                            modelId,
                                            !isVisible
                                          );
                                        }}
                                        type="button"
                                      >
                                        <span className="model-option-main">{modelId}</span>
                                        <span className="manage-model-state">
                                          {isVisible ? "Shown" : "Hidden"}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {providerState?.status === "error" ? (
                                  <p className="selector-error">
                                    {providerState.errorMessage}
                                  </p>
                                ) : null}
                              </section>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <>
                        {modelQuery.trim() ? (
                          <button
                            className="manual-model-option"
                            onClick={() => {
                              applyManualModelQuery();
                            }}
                            type="button"
                          >
                            <span className="manual-model-label">Use custom model</span>
                            <span className="manual-model-value">
                              {activeProvider?.label ?? "Provider"} · {modelQuery.trim()}
                            </span>
                          </button>
                        ) : null}
                        <div className="model-group-list">
                          {groupedModelOptions.length === 0 ? (
                            <p className="model-empty-state">
                              No models match that search.
                            </p>
                          ) : (
                            groupedModelOptions.map(({ provider, models }) => (
                              <section className="model-group" key={provider.id}>
                                <div className="model-group-label">
                                  <span className="model-group-title">{provider.label}</span>
                                  <div className="model-group-badges">
                                    {provider.id === activeModelSelection.providerId ? (
                                      <span className="model-group-badge is-current">Current</span>
                                    ) : null}
                                    {!provider.configured ? (
                                      <span className="model-group-badge">
                                        Set {provider.apiKeyEnv}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="model-option-list">
                                  {models.map((modelId) => (
                                    <button
                                      className={
                                        modelId === activeModelSelection.modelId &&
                                        provider.id === activeModelSelection.providerId
                                          ? "model-option is-active"
                                          : "model-option"
                                      }
                                      key={`${provider.id}:${modelId}`}
                                      onClick={() => {
                                        updateActiveModelSelection({
                                          providerId: provider.id,
                                          modelId,
                                        });
                                        setModelQuery(modelId);
                                        setIsModelPickerOpen(false);
                                      }}
                                      type="button"
                                    >
                                      <span className="model-option-main">{modelId}</span>
                                      {modelId === activeModelSelection.modelId &&
                                      provider.id === activeModelSelection.providerId ? (
                                        <span className="model-option-check">
                                          <CheckIcon />
                                        </span>
                                      ) : null}
                                    </button>
                                  ))}
                                </div>
                              </section>
                            ))
                          )}
                        </div>
                        {activeProviderModels?.status === "error" ? (
                          <p className="selector-error">{activeProviderModels.errorMessage}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
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
