"use client";

import {
  GenerativeWidget,
  downloadGenerativeWidgetZip,
  type DownloadableGenerativeWidget,
} from "@/components/generative-widget";
import {
  CHAT_PROVIDER_IDS,
  ChatModelSelection,
  ChatProviderId,
  ChatProviderOption,
} from "@/lib/chat-model-config";
import { normalizeHiddenModelKeys } from "@/lib/chat-picker-preferences";
import type {
  AppSettingsPayload,
  GenerativeUISettingsSummary,
  TavilySettingsSummary,
} from "@/lib/chat-settings-config";
import { normalizeShowWidgetToolInput } from "@/lib/generative-ui/show-widget-input";
import { openTrustedWidgetLink } from "@/lib/generative-ui/browser-links";
import {
  getAssistantMessageModelId,
  type ChatUIMessage,
} from "@/lib/chat-message";
import { stripHiddenGenerativeUIReminderFromText } from "@/lib/chat-hidden-reminders";
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
  source: "suggested" | "provider-api" | "server-cache";
  errorMessage?: string;
};

type ProviderCredentialMutationState = {
  status: "idle" | "saving" | "error" | "success";
  message?: string;
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

const DEFAULT_TAVILY_SETTINGS: TavilySettingsSummary = {
  apiKeyEnv: "TAVILY_API_KEY",
  configured: false,
  credentialSource: null,
  baseURL: "https://api.tavily.com",
};

const DEFAULT_GENERATIVE_UI_SETTINGS: GenerativeUISettingsSummary = {
  enabled: true,
  envVar: "NEXT_PUBLIC_GENERATIVE_UI_TRUSTED",
  source: "default",
};

const LEGACY_MODEL_VISIBILITY_STORAGE_KEY =
  "open-visual-layout:model-visibility:v1";
const MODEL_VISIBILITY_STORAGE_KEY = "open-claude-gen-ui:model-visibility:v1";
const LEGACY_MODEL_SELECTION_STORAGE_KEY = "open-visual-layout:model-selection:v1";
const MODEL_SELECTION_STORAGE_KEY = "open-claude-gen-ui:model-selection:v1";

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function modelVisibilityKey(providerId: string, modelId: string) {
  return `${providerId}:${modelId}`;
}

function getLocalStorageValueWithLegacyFallback(
  primaryKey: string,
  legacyKey: string
) {
  const primaryValue = window.localStorage.getItem(primaryKey);

  if (primaryValue !== null) {
    return primaryValue;
  }

  const legacyValue = window.localStorage.getItem(legacyKey);

  if (legacyValue !== null) {
    window.localStorage.setItem(primaryKey, legacyValue);
  }

  return legacyValue;
}

function modelSelectionFromUnknown(value: unknown) {
  const record = asRecord(value);
  const providerId =
    typeof record?.providerId === "string" &&
    CHAT_PROVIDER_IDS.includes(record.providerId as ChatProviderId)
      ? (record.providerId as ChatProviderId)
      : null;
  const modelId = typeof record?.modelId === "string" ? record.modelId : "";

  if (!providerId || !modelId.trim()) {
    return null;
  }

  return {
    providerId,
    modelId,
  };
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

function buildLoadedProviderModels(
  provider: ChatProviderOption | undefined,
  loadedModels: string[]
) {
  return uniqueStrings([...(provider?.suggestedModels ?? []), ...loadedModels]);
}

function providerCredentialSummary(provider: ChatProviderOption | undefined) {
  if (!provider?.configured) {
    return "No API key saved yet.";
  }

  if (provider.credentialSource === "frontend") {
    return provider.keyPreview
      ? `Saved locally as ${provider.keyPreview}.`
      : "Saved locally.";
  }

  return `Using ${provider.apiKeyEnv} from the environment.`;
}

function tavilyCredentialSummary(settings: TavilySettingsSummary | null | undefined) {
  if (!settings?.configured) {
    return "No Tavily API key saved yet.";
  }

  if (settings.credentialSource === "frontend") {
    return settings.keyPreview
      ? `Saved locally as ${settings.keyPreview}.`
      : "Saved locally.";
  }

  return `Using ${settings.apiKeyEnv} from the environment.`;
}

function generativeUISettingsSummary(
  settings: GenerativeUISettingsSummary | null | undefined
) {
  if (!settings) {
    return "Generative UI widgets are on by default.";
  }

  if (settings.source === "frontend") {
    return settings.enabled
      ? "Saved locally. Generative UI widgets are enabled."
      : "Saved locally. Generative UI widgets are disabled.";
  }

  if (settings.source === "env") {
    return `Using ${settings.envVar} from the environment.`;
  }

  return "Using the app default. Generative UI widgets are enabled.";
}

function getConfiguredProviderOptions(providers: ChatProviderOption[]) {
  return providers.filter((provider) => provider.configured);
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
    .map((part) => stripHiddenGenerativeUIReminderFromText(part.text))
    .join("");
}

function copyTextFromMessage(message: ChatUIMessage) {
  const text = textFromMessage(message).trim();

  if (text) {
    return text;
  }

  const postWidgetReasoning = postWidgetReasoningFromMessage(message).trim();

  if (postWidgetReasoning) {
    return postWidgetReasoning;
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

function PlainTextBlock({
  children,
  className = "plain-text-body",
}: {
  children: string;
  className?: string;
}) {
  if (!children.trim()) {
    return null;
  }

  return <pre className={className}>{children}</pre>;
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
                <PlainTextBlock
                  className="reasoning-plain-text"
                  key={item.key}
                >
                  {item.text}
                </PlainTextBlock>
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
      const text = stripHiddenGenerativeUIReminderFromText(part.text);

      if (!text.trim()) {
        return [];
      }

      return [
        {
          kind: "text",
          key: `${message.id}-text-${index}`,
          text,
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
  const showCompletedWidgetFallbackText =
    !isStreaming && hasWidgetOutput && !hasTextOutput && postWidgetReasoning.length > 0;

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
      {showCompletedWidgetFallbackText ? (
        <MarkdownBlock>{postWidgetReasoning}</MarkdownBlock>
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

function SettingsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19 12a7 7 0 0 0-.08-1l2.02-1.58-2-3.46-2.46.7a7.3 7.3 0 0 0-1.72-1l-.38-2.52h-4l-.38 2.52a7.3 7.3 0 0 0-1.72 1l-2.46-.7-2 3.46L5.08 11A7 7 0 0 0 5 12c0 .34.03.67.08 1l-2.02 1.58 2 3.46 2.46-.7c.53.41 1.11.74 1.72 1l.38 2.52h4l.38-2.52c.61-.26 1.19-.59 1.72-1l2.46.7 2-3.46L18.92 13c.05-.33.08-.66.08-1Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
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

function assistantRoleLabel(
  messageOrModelId: ChatUIMessage | string | null | undefined
) {
  const modelId =
    typeof messageOrModelId === "string"
      ? messageOrModelId
      : messageOrModelId
        ? getAssistantMessageModelId(messageOrModelId)
        : null;

  return modelId ? `Assistant(${modelId})` : "Assistant";
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
  const [manualDefaultModelSelection, setManualDefaultModelSelection] =
    useState<ChatModelSelection | null>(null);
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
  const [collapsedModelProviderIds, setCollapsedModelProviderIds] = useState<string[]>([]);
  const [collapsedManageProviderIds, setCollapsedManageProviderIds] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProviderPickerOpen, setIsProviderPickerOpen] = useState(false);
  const [returnToManageModelsAfterProviderPicker, setReturnToManageModelsAfterProviderPicker] =
    useState(false);
  const [providerPickerSelectionId, setProviderPickerSelectionId] =
    useState<ChatProviderId | null>(null);
  const [tavilySettings, setTavilySettings] =
    useState<TavilySettingsSummary>(DEFAULT_TAVILY_SETTINGS);
  const [generativeUISettings, setGenerativeUISettings] =
    useState<GenerativeUISettingsSummary>(DEFAULT_GENERATIVE_UI_SETTINGS);
  const [tavilyApiKeyInput, setTavilyApiKeyInput] = useState("");
  const [tavilyCredentialMutation, setTavilyCredentialMutation] =
    useState<ProviderCredentialMutationState>({ status: "idle" });
  const [generativeUIMutation, setGenerativeUIMutation] =
    useState<ProviderCredentialMutationState>({ status: "idle" });
  const [providerApiKeyInput, setProviderApiKeyInput] = useState("");
  const [providerCredentialMutation, setProviderCredentialMutation] =
    useState<ProviderCredentialMutationState>({ status: "idle" });
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false);
  const chatIdRef = useRef(chatId);
  const defaultModelSelectionRef = useRef(defaultModelSelection);
  const manualDefaultModelSelectionRef = useRef<ChatModelSelection | null>(
    manualDefaultModelSelection
  );
  const draftModelSelectionRef = useRef(draftModelSelection);
  const lastLoadedChatIdRef = useRef<string | null>(null);
  const chatControllersRef = useRef<Map<string, ChatController>>(new Map());
  const chatModelSelectionsRef = useRef<Map<string, ChatModelSelection>>(new Map());
  const draftChatRef = useRef<ChatController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldFollowStreamRef = useRef(true);
  const copyResetTimerRef = useRef<number | null>(null);
  const titleAnimationTimersRef = useRef<Map<string, number>>(new Map());
  const knownChatTitlesRef = useRef<Map<string, string>>(new Map());
  const starterPromptRequestIdRef = useRef(0);
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const tavilyApiKeyInputRef = useRef<HTMLInputElement>(null);
  const providerSearchInputRef = useRef<HTMLInputElement>(null);
  const providerApiKeyInputRef = useRef<HTMLInputElement>(null);
  const manageModelSearchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const hasHydratedModelVisibilityRef = useRef(false);
  const [animatedTitleChatIds, setAnimatedTitleChatIds] = useState<string[]>([]);

  function getProviderOption(providerId: ChatProviderId | string) {
    return providerOptions.find((provider) => provider.id === providerId);
  }

  function normalizeLocalModelSelection(
    value: Partial<ChatModelSelection> | null | undefined
  ) {
    const fallback = defaultModelSelectionRef.current;
    const configuredProviders = getConfiguredProviderOptions(providerOptions);
    const requestedProviderId = value?.providerId;
    const provider = requestedProviderId
      ? configuredProviders.find((entry) => entry.id === requestedProviderId)
      : configuredProviders.find((entry) => entry.id === fallback.providerId);
    const fallbackProvider =
      configuredProviders.find((entry) => entry.id === fallback.providerId) ??
      configuredProviders[0] ??
      getProviderOption(fallback.providerId);

    return {
      providerId: (provider?.id ?? fallbackProvider?.id ?? fallback.providerId) as ChatProviderId,
      modelId:
        value?.modelId?.trim() ||
        provider?.defaultModelId ||
        fallbackProvider?.defaultModelId ||
        fallback.modelId,
    } satisfies ChatModelSelection;
  }

  function writeDraftModelSelection(nextSelection: ChatModelSelection) {
    draftModelSelectionRef.current = nextSelection;
    setDraftModelSelection(nextSelection);
  }

  function writeManualDefaultModelSelection(
    nextSelection: ChatModelSelection | null
  ) {
    manualDefaultModelSelectionRef.current = nextSelection;
    setManualDefaultModelSelection(nextSelection);
  }

  function getPreferredNewChatModelSelection() {
    return manualDefaultModelSelectionRef.current ?? defaultModelSelectionRef.current;
  }

  async function loadAppSettings() {
    const response = await fetch("/api/chat/settings");

    if (!response.ok) {
      debugChat("settings:error", { status: response.status });
      return;
    }

    const data = (await response.json()) as AppSettingsPayload;
    applySettingsPayload(data);
  }

  function applySettingsPayload(data: AppSettingsPayload) {
    setTavilySettings(
      data.tavily
        ? {
            ...DEFAULT_TAVILY_SETTINGS,
            ...data.tavily,
          }
        : DEFAULT_TAVILY_SETTINGS
    );
    setGenerativeUISettings(
      data.generativeUI
        ? {
            ...DEFAULT_GENERATIVE_UI_SETTINGS,
            ...data.generativeUI,
          }
        : DEFAULT_GENERATIVE_UI_SETTINGS
    );
  }

  async function loadModelVisibilityPreferences() {
    let localHiddenModelKeys: string[] = [];

    try {
      localHiddenModelKeys = normalizeHiddenModelKeys(
        JSON.parse(
          getLocalStorageValueWithLegacyFallback(
            MODEL_VISIBILITY_STORAGE_KEY,
            LEGACY_MODEL_VISIBILITY_STORAGE_KEY
          ) ?? "[]"
        )
      );
    } catch {
      localHiddenModelKeys = [];
    }

    try {
      const response = await fetch("/api/chat/preferences");

      if (!response.ok) {
        throw new Error(`Unable to load preferences: ${response.status}`);
      }

      const data = (await response.json()) as ModelVisibilityPreferencesPayload;
      const serverHiddenModelKeys = normalizeHiddenModelKeys(data.hiddenModelKeys);

      return serverHiddenModelKeys.length > 0
        ? serverHiddenModelKeys
        : localHiddenModelKeys;
    } catch (error) {
      debugChat("model-visibility:load:error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return localHiddenModelKeys;
    }
  }

  async function saveModelVisibilityPreferences(nextHiddenModelKeys: string[]) {
    const response = await fetch("/api/chat/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hiddenModelKeys: nextHiddenModelKeys,
      }),
    });

    if (!response.ok) {
      throw new Error(`Unable to save preferences: ${response.status}`);
    }
  }

  function persistManualDefaultModelSelection(nextSelection: ChatModelSelection) {
    const normalizedSelection = normalizeLocalModelSelection(nextSelection);
    writeManualDefaultModelSelection(normalizedSelection);
    writeDraftModelSelection(normalizedSelection);
    window.localStorage.setItem(
      MODEL_SELECTION_STORAGE_KEY,
      JSON.stringify(normalizedSelection)
    );
    window.localStorage.removeItem(LEGACY_MODEL_SELECTION_STORAGE_KEY);
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
  const tavilyCredentialStatusMessage = tavilyCredentialMutation.message;
  const providerCredentialStatusMessage = providerCredentialMutation.message;

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
      .filter((provider) => provider.configured)
      .map((provider) => {
        const models = getProviderKnownModels(
          provider,
          provider.id === activeModelSelection.providerId
            ? activeModelSelection.modelId
            : ""
        ).filter((modelId) => {
          if (!isModelVisible(provider.id, modelId)) {
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
      .filter((provider) => provider.configured)
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
    if (!isBusy || !shouldFollowStreamRef.current) {
      return;
    }

    const listElement = messageListRef.current;

    if (!listElement || typeof ResizeObserver === "undefined") {
      return;
    }

    let frameId = 0;

    const syncScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (shouldFollowStreamRef.current) {
          scrollMessagesToBottom();
        }
      });
    };

    const observer = new ResizeObserver(() => {
      syncScroll();
    });

    observer.observe(listElement);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [chatId, isBusy, messages.length]);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    defaultModelSelectionRef.current = defaultModelSelection;
  }, [defaultModelSelection]);

  useEffect(() => {
    manualDefaultModelSelectionRef.current = manualDefaultModelSelection;
  }, [manualDefaultModelSelection]);

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
    window.localStorage.removeItem(LEGACY_MODEL_VISIBILITY_STORAGE_KEY);

    void saveModelVisibilityPreferences(hiddenModelKeys).catch((error) => {
      debugChat("model-visibility:save:error", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
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
    if (!isManageModelsOpen) {
      return;
    }

    requestAnimationFrame(() => {
      manageModelSearchInputRef.current?.focus();
      manageModelSearchInputRef.current?.select();
    });

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsManageModelsOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isManageModelsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    requestAnimationFrame(() => {
      tavilyApiKeyInputRef.current?.focus();
      tavilyApiKeyInputRef.current?.select();
    });

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSettings();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isProviderPickerOpen) {
      return;
    }

    requestAnimationFrame(() => {
      providerSearchInputRef.current?.focus();
      providerSearchInputRef.current?.select();
    });

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProviderPickerOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isProviderPickerOpen]);

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
    let storedManualSelection: Partial<ChatModelSelection> | null = null;

    try {
      storedManualSelection = modelSelectionFromUnknown(
        JSON.parse(
          getLocalStorageValueWithLegacyFallback(
            MODEL_SELECTION_STORAGE_KEY,
            LEGACY_MODEL_SELECTION_STORAGE_KEY
          ) ?? "null"
        )
      );
    } catch {
      storedManualSelection = null;
    }

    const normalizeWithProviders = (
      value: Partial<ChatModelSelection> | null | undefined
    ) => {
      const fallback = nextDefaultSelection;
      const configuredProviders = getConfiguredProviderOptions(nextProviders);
      const provider =
        configuredProviders.find((entry) => entry.id === value?.providerId) ??
        configuredProviders.find((entry) => entry.id === fallback.providerId) ??
        configuredProviders[0] ??
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
    const nextManualDefaultSelection = storedManualSelection
      ? normalizeWithProviders(storedManualSelection)
      : null;
    writeManualDefaultModelSelection(nextManualDefaultSelection);
    if (
      storedManualSelection &&
      (!nextManualDefaultSelection ||
        storedManualSelection.providerId !== nextManualDefaultSelection.providerId ||
        storedManualSelection.modelId !== nextManualDefaultSelection.modelId)
    ) {
      if (nextManualDefaultSelection) {
        window.localStorage.setItem(
          MODEL_SELECTION_STORAGE_KEY,
          JSON.stringify(nextManualDefaultSelection)
        );
        window.localStorage.removeItem(LEGACY_MODEL_SELECTION_STORAGE_KEY);
      } else {
        window.localStorage.removeItem(MODEL_SELECTION_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_MODEL_SELECTION_STORAGE_KEY);
      }
    }
    writeDraftModelSelection(
      nextManualDefaultSelection ?? normalizeWithProviders(null)
    );
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

    if (
      !force &&
      currentState &&
      currentState.source !== "suggested" &&
      currentState.models.length > 0
    ) {
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
      const url = new URL("/api/chat/models", window.location.origin);
      url.searchParams.set("providerId", providerId);

      if (force) {
        url.searchParams.set("force", "1");
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as {
        models?: string[];
        source?: ProviderModelsState["source"];
      };
      const loadedModels = Array.isArray(data.models)
        ? data.models.filter((model): model is string => typeof model === "string")
        : [];

      setProviderModels((current) => ({
        ...current,
        [providerId]: {
          status: "ready",
          models: buildLoadedProviderModels(provider, loadedModels),
          source:
            data.source === "server-cache" || data.source === "provider-api"
              ? data.source
              : "suggested",
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
    void loadAppSettings();
  }, []);

  useEffect(() => {
    if (chatId !== null) {
      return;
    }

    let ignore = false;
    const requestId = starterPromptRequestIdRef.current + 1;
    starterPromptRequestIdRef.current = requestId;
    setStarterPrompts([]);

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

        if (!ignore && starterPromptRequestIdRef.current === requestId) {
          setStarterPrompts(prompts);
        }
      } catch (error) {
        if (!ignore && starterPromptRequestIdRef.current === requestId) {
          setStarterPrompts([]);
        }

        debugChat("starter-prompts:error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void loadStarterPrompts();

    return () => {
      ignore = true;
    };
  }, [chatId]);

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
    writeDraftModelSelection(getPreferredNewChatModelSelection());
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

  function updateActiveModelSelection(
    nextSelection: Partial<ChatModelSelection>,
    options?: { persistAsManualDefault?: boolean }
  ) {
    const normalizedSelection = normalizeLocalModelSelection({
      ...activeModelSelection,
      ...nextSelection,
    });

    if (chatIdRef.current) {
      cacheChatModelSelection(chatIdRef.current, normalizedSelection);
    } else if (!options?.persistAsManualDefault) {
      writeDraftModelSelection(normalizedSelection);
    }

    if (options?.persistAsManualDefault) {
      persistManualDefaultModelSelection(normalizedSelection);
    }
  }

  function selectProvider(providerId: ChatProviderId) {
    const provider = getProviderOption(providerId);

    updateActiveModelSelection(
      {
        providerId,
        modelId: provider?.defaultModelId || activeModelSelection.modelId,
      },
      { persistAsManualDefault: true }
    );
    setCollapsedModelProviderIds((current) =>
      current.filter((entry) => entry !== providerId)
    );

    void loadProviderModels(providerId);
  }

  function resetProviderCredentialForm() {
    setProviderApiKeyInput("");
    setProviderCredentialMutation({ status: "idle" });
  }

  function resetTavilyCredentialForm() {
    setTavilyApiKeyInput("");
    setTavilyCredentialMutation({ status: "idle" });
  }

  function resetGenerativeUIForm() {
    setGenerativeUIMutation({ status: "idle" });
  }

  async function saveTavilyCredential() {
    const apiKey = tavilyApiKeyInput.trim();

    if (!apiKey) {
      setTavilyCredentialMutation({
        status: "error",
        message: "Enter a Tavily API key before saving.",
      });
      return;
    }

    setTavilyCredentialMutation({ status: "saving" });

    try {
      const response = await fetch("/api/chat/settings", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tavilyApiKey: apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as AppSettingsPayload;
      applySettingsPayload(data);
      setTavilyApiKeyInput("");
      setTavilyCredentialMutation({
        status: "success",
        message: "Tavily API key saved.",
      });
    } catch (error) {
      setTavilyCredentialMutation({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save the Tavily API key.",
      });
    }
  }

  async function removeStoredTavilyCredential() {
    setTavilyCredentialMutation({ status: "saving" });

    try {
      const response = await fetch("/api/chat/settings", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as AppSettingsPayload;
      applySettingsPayload(data);
      setTavilyApiKeyInput("");
      setTavilyCredentialMutation({
        status: "success",
        message: "Saved Tavily API key removed.",
      });
    } catch (error) {
      setTavilyCredentialMutation({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to remove the saved Tavily API key.",
      });
    }
  }

  async function updateGenerativeUITrustedMode(enabled: boolean) {
    if (generativeUISettings.enabled === enabled) {
      resetGenerativeUIForm();
      return;
    }

    setGenerativeUIMutation({ status: "saving" });

    try {
      const response = await fetch("/api/chat/settings", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          generativeUITrusted: enabled,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as AppSettingsPayload;
      applySettingsPayload(data);
      setGenerativeUIMutation({
        status: "success",
        message: enabled
          ? "Generative UI widgets enabled."
          : "Generative UI widgets disabled.",
      });
    } catch (error) {
      setGenerativeUIMutation({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update generative UI settings.",
      });
    }
  }

  async function saveProviderCredential(providerId: ChatProviderId) {
    const apiKey = providerApiKeyInput.trim();

    if (!apiKey) {
      setProviderCredentialMutation({
        status: "error",
        message: "Enter an API key before saving.",
      });
      return;
    }

    setProviderCredentialMutation({ status: "saving" });

    try {
      const response = await fetch("/api/chat/providers", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          providerId,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadProviderCatalog();
      setProviderPickerSelectionId(providerId);
      selectProvider(providerId);
      await loadProviderModels(providerId, true);
      setProviderApiKeyInput("");
      setProviderCredentialMutation({
        status: "success",
        message: "API key saved.",
      });
    } catch (error) {
      setProviderCredentialMutation({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to save API key.",
      });
    }
  }

  async function removeStoredProviderCredential(providerId: ChatProviderId) {
    setProviderCredentialMutation({ status: "saving" });

    try {
      const response = await fetch("/api/chat/providers", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ providerId }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadProviderCatalog();
      setProviderPickerSelectionId(defaultModelSelectionRef.current.providerId);
      setProviderApiKeyInput("");
      setProviderCredentialMutation({
        status: "success",
        message: "Saved API key removed.",
      });
    } catch (error) {
      setProviderCredentialMutation({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to remove the saved API key.",
      });
    }
  }

  function handleProviderOptionClick(provider: ChatProviderOption) {
    setProviderPickerSelectionId(provider.id);
    setProviderApiKeyInput("");
    setProviderCredentialMutation({ status: "idle" });

    if (provider.configured) {
      selectProvider(provider.id);
      setModelQuery("");
    }

    requestAnimationFrame(() => {
      if (!provider.configured) {
        providerApiKeyInputRef.current?.focus();
        providerApiKeyInputRef.current?.select();
      }
    });
  }

  function updateModelId(modelId: string) {
    updateActiveModelSelection({ modelId }, { persistAsManualDefault: true });
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

  function toggleModelPicker() {
    setIsSettingsOpen(false);
    setIsProviderPickerOpen(false);
    setIsManageModelsOpen(false);
    setModelPickerView("models");
    setModelQuery("");
    setProviderQuery("");
    setManageModelQuery("");
    setCollapsedModelProviderIds((current) =>
      current.filter((entry) => entry !== activeModelSelection.providerId)
    );
    setIsModelPickerOpen((current) => !current);
  }

  function toggleModelProviderCollapse(providerId: ChatProviderId) {
    setCollapsedModelProviderIds((current) =>
      current.includes(providerId)
        ? current.filter((entry) => entry !== providerId)
        : [...current, providerId]
    );
  }

  function toggleManageProviderCollapse(providerId: ChatProviderId) {
    setCollapsedManageProviderIds((current) =>
      current.includes(providerId)
        ? current.filter((entry) => entry !== providerId)
        : [...current, providerId]
    );
  }

  function openProviderPicker() {
    setProviderQuery("");
    resetProviderCredentialForm();
    setReturnToManageModelsAfterProviderPicker(isManageModelsOpen);
    setProviderPickerSelectionId(activeModelSelection.providerId);
    setIsModelPickerOpen(false);
    setIsSettingsOpen(false);
    setIsManageModelsOpen(false);
    setIsProviderPickerOpen(true);
  }

  function openManageModels() {
    setManageModelQuery("");
    setCollapsedManageProviderIds((current) =>
      current.filter((entry) => entry !== activeModelSelection.providerId)
    );
    setModelPickerView("models");
    setIsModelPickerOpen(false);
    setIsSettingsOpen(false);
    setIsManageModelsOpen(true);
  }

  function openSettings() {
    setOpenMenuChatId(null);
    resetTavilyCredentialForm();
    resetGenerativeUIForm();
    setIsModelPickerOpen(false);
    setIsProviderPickerOpen(false);
    setIsManageModelsOpen(false);
    setIsSettingsOpen(true);
  }

  function closeSettings() {
    resetTavilyCredentialForm();
    resetGenerativeUIForm();
    setIsSettingsOpen(false);
  }

  function closeProviderPicker() {
    resetProviderCredentialForm();
    setProviderPickerSelectionId(null);
    setIsProviderPickerOpen(false);
    if (returnToManageModelsAfterProviderPicker) {
      setIsManageModelsOpen(true);
    }
    setReturnToManageModelsAfterProviderPicker(false);
  }

  function closeManageModels() {
    setIsManageModelsOpen(false);
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

          <div className="sidebar-footer">
            <button
              className="sidebar-settings-button"
              onClick={openSettings}
              title="Open settings"
              type="button"
            >
              <span className="sidebar-settings-icon">
                <SettingsIcon />
              </span>
              <span className="sidebar-settings-title">Settings</span>
            </button>
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

      {isSettingsOpen ? (
        <div
          aria-label="Settings dialog"
          className="dialog-backdrop"
          onClick={closeSettings}
          role="presentation"
        >
          <section
            aria-describedby="settings-description"
            aria-labelledby="settings-title"
            className="dialog-card settings-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="settings-header">
              <div className="settings-copy">
                <p className="settings-eyebrow">Settings</p>
                <h2 id="settings-title">Search, widgets, and models</h2>
                <p className="settings-description" id="settings-description">
                  Manage live web search, trusted generative UI widgets, and model
                  visibility from the sidebar footer.
                </p>
              </div>
              <button
                aria-label="Close settings"
                className="picker-icon-button settings-close"
                onClick={closeSettings}
                title="Close"
                type="button"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="settings-stack">
              <section className="settings-section-card">
                <div className="settings-section-copy">
                  <p className="settings-section-eyebrow">Web search</p>
                  <h3>Tavily API key</h3>
                  <p className="settings-section-description">
                    The assistant uses Tavily for current web results. Saved keys stay
                    local to this app and work without restarting.
                  </p>
                  <p className="settings-section-meta">
                    {tavilyCredentialSummary(tavilySettings)}
                  </p>
                </div>
                <form
                  autoComplete="off"
                  className="provider-option-editor settings-secret-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveTavilyCredential();
                  }}
                >
                  <input
                    aria-label="Tavily API key"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    className="provider-credential-input is-masked"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    inputMode="text"
                    onChange={(event) => {
                      setTavilyApiKeyInput(event.target.value);
                      if (tavilyCredentialMutation.status !== "idle") {
                        setTavilyCredentialMutation({ status: "idle" });
                      }
                    }}
                    placeholder={
                      tavilySettings.configured ? "****************" : "Paste Tavily API key"
                    }
                    ref={tavilyApiKeyInputRef}
                    spellCheck={false}
                    type="text"
                    value={tavilyApiKeyInput}
                  />
                  {tavilyCredentialStatusMessage ? (
                    <p
                      className={
                        tavilyCredentialMutation.status === "error"
                          ? "selector-error"
                          : "selector-success"
                      }
                    >
                      {tavilyCredentialStatusMessage}
                    </p>
                  ) : null}
                  <div className="provider-option-actions">
                    <button
                      className="dialog-button"
                      disabled={tavilyCredentialMutation.status === "saving"}
                      type="submit"
                    >
                      {tavilyCredentialMutation.status === "saving"
                        ? "Saving..."
                        : "Save key"}
                    </button>
                    {tavilySettings.credentialSource === "frontend" ? (
                      <button
                        className="dialog-button"
                        disabled={tavilyCredentialMutation.status === "saving"}
                        onClick={() => {
                          void removeStoredTavilyCredential();
                        }}
                        type="button"
                      >
                        Remove saved key
                      </button>
                    ) : null}
                  </div>
                </form>
              </section>

              <section className="settings-section-card">
                <div className="settings-section-copy">
                  <p className="settings-section-eyebrow">Generative UI</p>
                  <h3>Trusted widget mode</h3>
                  <p className="settings-section-description">
                    Inline widgets are enabled by default. Turn them off here if you
                    want the assistant to stay in text-and-tool mode.
                  </p>
                  <p className="settings-section-meta">
                    {generativeUISettingsSummary(generativeUISettings)}
                  </p>
                </div>
                <div className="settings-toggle-row">
                  <button
                    aria-checked={generativeUISettings.enabled}
                    className={`settings-switch${
                      generativeUISettings.enabled ? " is-active" : ""
                    }`}
                    disabled={generativeUIMutation.status === "saving"}
                    onClick={() => {
                      void updateGenerativeUITrustedMode(
                        !generativeUISettings.enabled
                      );
                    }}
                    role="switch"
                    title={
                      generativeUISettings.enabled
                        ? "Turn trusted widget mode off"
                        : "Turn trusted widget mode on"
                    }
                    type="button"
                  >
                    <span className="settings-switch-track">
                      <span className="settings-switch-thumb" />
                    </span>
                    <span className="settings-switch-copy">
                      <span className="settings-switch-label">
                        {generativeUISettings.enabled ? "On" : "Off"}
                      </span>
                      <span className="settings-switch-caption">
                        {generativeUISettings.enabled
                          ? "Prefer widgets"
                          : "Text-first replies"}
                      </span>
                    </span>
                  </button>
                </div>
                {generativeUIMutation.message ? (
                  <p
                    className={
                      generativeUIMutation.status === "error"
                        ? "selector-error"
                        : "selector-success"
                    }
                  >
                    {generativeUIMutation.message}
                  </p>
                ) : null}
              </section>

              <section className="settings-section-card">
                <div className="settings-section-copy">
                  <p className="settings-section-eyebrow">Models</p>
                  <h3>Visibility and providers</h3>
                  <p className="settings-section-description">
                    Open the existing model management window to show or hide models
                    and connect providers.
                  </p>
                </div>
                <div className="settings-shortcuts">
                  <button
                    className="dialog-button danger"
                    onClick={openManageModels}
                    type="button"
                  >
                    Manage models
                  </button>
                </div>
              </section>
            </div>
            <div className="dialog-actions settings-actions">
              <button
                className="dialog-button"
                onClick={closeSettings}
                type="button"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isManageModelsOpen ? (
        <div
          aria-label="Manage models dialog"
          className="dialog-backdrop"
          onClick={closeManageModels}
          role="presentation"
        >
          <section
            aria-describedby="manage-models-description"
            aria-labelledby="manage-models-title"
            className="dialog-card manage-models-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="manage-models-header">
              <div className="manage-models-copy">
                <p className="manage-models-eyebrow">Model management</p>
                <h2 id="manage-models-title">Manage visible models</h2>
                <p
                  className="manage-models-description"
                  id="manage-models-description"
                >
                  Show or hide provider models here, or add another provider.
                  Choosing the active model still happens in the smaller picker above
                  the composer.
                </p>
              </div>
              <button
                aria-label="Close manage models"
                className="picker-icon-button manage-models-close"
                onClick={closeManageModels}
                title="Close"
                type="button"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="manage-models-toolbar">
              <div className="model-search manage-model-search">
                <SearchIcon />
                <input
                  aria-label="Search models to manage"
                  className="model-search-input"
                  onChange={(event) => {
                    setManageModelQuery(event.target.value);
                  }}
                  placeholder="Search models to manage"
                  ref={manageModelSearchInputRef}
                  value={manageModelQuery}
                />
              </div>
              <button
                className="picker-text-button manage-models-provider-button"
                onClick={openProviderPicker}
                type="button"
              >
                Add provider
              </button>
            </div>
            <div className="manage-models-list">
              {manageableProviderGroups.length === 0 ? (
                <p className="model-empty-state">No models match that search.</p>
              ) : (
                manageableProviderGroups.map(({ provider, models }) => {
                  const allVisible = models.every((modelId) =>
                    isModelVisible(provider.id, modelId)
                  );
                  const providerState = providerModels[provider.id];
                  const isCollapsed = collapsedManageProviderIds.includes(provider.id);

                  return (
                    <section className="model-group" key={provider.id}>
                      <div className="model-group-label manage-group-label">
                        <button
                          aria-expanded={!isCollapsed}
                          className="model-group-toggle manage-group-toggle-manage"
                          onClick={() => {
                            toggleManageProviderCollapse(provider.id);
                          }}
                          type="button"
                        >
                          <span className="model-group-title">{provider.label}</span>
                          <span
                            className={
                              isCollapsed
                                ? "model-group-toggle-icon is-collapsed"
                                : "model-group-toggle-icon"
                            }
                          >
                            <ChevronDownIcon />
                          </span>
                        </button>
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
                      <div
                        className={
                          isCollapsed
                            ? "model-group-collapsible is-collapsed"
                            : "model-group-collapsible"
                        }
                      >
                        <div className="model-group-collapsible-inner">
                          <div className="model-option-list">
                            {models.map((modelId) => {
                              const isVisible = isModelVisible(provider.id, modelId);

                              return (
                                <button
                                  className={
                                    isVisible
                                      ? "manage-model-option is-visible"
                                      : "manage-model-option is-hidden"
                                  }
                                  key={`${provider.id}:${modelId}`}
                                  onClick={() => {
                                    setModelVisibility(
                                      provider.id,
                                      modelId,
                                      !isVisible
                                    );
                                  }}
                                  aria-pressed={isVisible}
                                  type="button"
                                >
                                  <span className="model-option-main manage-model-name">
                                    {modelId}
                                  </span>
                                  <span
                                    className={
                                      isVisible
                                        ? "manage-model-state is-visible"
                                        : "manage-model-state is-hidden"
                                    }
                                  >
                                    {isVisible ? "Shown" : "Hidden"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {providerState?.status === "error" ? (
                            <p className="selector-error">{providerState.errorMessage}</p>
                          ) : null}
                        </div>
                      </div>
                    </section>
                  );
                })
              )}
            </div>
            <div className="dialog-actions manage-models-actions">
              <button
                className="dialog-button danger"
                onClick={closeManageModels}
                type="button"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isProviderPickerOpen ? (
        <div
          aria-label="Connect provider dialog"
          className="dialog-backdrop"
          onClick={closeProviderPicker}
          role="presentation"
        >
          <section
            aria-describedby="provider-picker-description"
            aria-labelledby="provider-picker-title"
            className="dialog-card provider-picker-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="provider-picker-header">
              <div className="provider-picker-copy">
                <p className="provider-picker-eyebrow">Provider setup</p>
                <h2 id="provider-picker-title">Connect provider</h2>
                <p
                  className="provider-picker-description"
                  id="provider-picker-description"
                >
                  Switch providers here, save API keys without restarting the app,
                  and keep the actual secrets on the server.
                </p>
              </div>
              <button
                aria-label="Close provider dialog"
                className="picker-icon-button provider-picker-close"
                onClick={closeProviderPicker}
                title="Close"
                type="button"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="provider-picker-toolbar">
              <div className="model-search provider-picker-search">
                <SearchIcon />
                <input
                  autoComplete="off"
                  aria-label="Search providers"
                  className="model-search-input"
                  onChange={(event) => {
                    setProviderQuery(event.target.value);
                  }}
                  placeholder="Search providers"
                  ref={providerSearchInputRef}
                  spellCheck={false}
                  value={providerQuery}
                />
              </div>
            </div>
            <div className="provider-picker-list">
              {providerSearchGroups.connected.length === 0 &&
              providerSearchGroups.available.length === 0 ? (
                <p className="model-empty-state">No providers match that search.</p>
              ) : (
                <>
                  {providerSearchGroups.connected.length > 0 ? (
                    <section className="provider-dialog-group">
                      <div className="provider-dialog-label">
                        <span>Connected</span>
                      </div>
                      <div className="provider-option-list">
                        {providerSearchGroups.connected.map((provider) => {
                          const isActive = provider.id === providerPickerSelectionId;

                          return (
                            <div
                              className={isActive ? "provider-option is-active" : "provider-option"}
                              key={provider.id}
                            >
                              <button
                                className="provider-option-summary"
                                onClick={() => {
                                  handleProviderOptionClick(provider);
                                }}
                                type="button"
                              >
                                <span className="provider-option-copy">
                                  <span className="provider-option-title-row">
                                    <span className="provider-option-title">
                                      {provider.label}
                                    </span>
                                    <span className="model-group-badges">
                                      {isActive ? (
                                        <span className="model-group-badge is-current">
                                          Current
                                        </span>
                                      ) : null}
                                      <span className="model-group-badge">
                                        {provider.credentialSource === "frontend"
                                          ? "Saved key"
                                          : "Env key"}
                                      </span>
                                    </span>
                                  </span>
                                  <span className="provider-option-description">
                                    {provider.description}
                                  </span>
                                  <span className="provider-option-meta">
                                    {providerCredentialSummary(provider)}
                                  </span>
                                </span>
                              </button>
                              {isActive ? (
                                <form
                                  autoComplete="off"
                                  className="provider-option-editor"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    void saveProviderCredential(provider.id);
                                  }}
                                >
                                  <input
                                    aria-label={`${provider.label} API key`}
                                    autoCapitalize="off"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    className="provider-credential-input is-masked"
                                    data-1p-ignore="true"
                                    data-lpignore="true"
                                    inputMode="text"
                                    onChange={(event) => {
                                      setProviderApiKeyInput(event.target.value);
                                      if (providerCredentialMutation.status !== "idle") {
                                        setProviderCredentialMutation({ status: "idle" });
                                      }
                                    }}
                                    placeholder={
                                      provider.configured
                                        ? "****************"
                                        : "Paste API key"
                                    }
                                    ref={providerApiKeyInputRef}
                                    spellCheck={false}
                                    type="text"
                                    value={providerApiKeyInput}
                                  />
                                  {providerCredentialStatusMessage ? (
                                    <p
                                      className={
                                        providerCredentialMutation.status === "error"
                                          ? "selector-error"
                                          : "selector-success"
                                      }
                                    >
                                      {providerCredentialStatusMessage}
                                    </p>
                                  ) : null}
                                  <div className="provider-option-actions">
                                    <button
                                      className="dialog-button"
                                      disabled={providerCredentialMutation.status === "saving"}
                                      type="submit"
                                    >
                                      {providerCredentialMutation.status === "saving"
                                        ? "Saving..."
                                        : "Save key"}
                                    </button>
                                    {provider.credentialSource === "frontend" ? (
                                      <button
                                        className="dialog-button"
                                        disabled={providerCredentialMutation.status === "saving"}
                                        onClick={() => {
                                          void removeStoredProviderCredential(provider.id);
                                        }}
                                        type="button"
                                      >
                                        Remove saved key
                                      </button>
                                    ) : null}
                                  </div>
                                </form>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                  {providerSearchGroups.available.length > 0 ? (
                    <section className="provider-dialog-group">
                      <div className="provider-dialog-label">
                        <span>Available</span>
                      </div>
                      <div className="provider-option-list">
                        {providerSearchGroups.available.map((provider) => {
                          const isActive = provider.id === providerPickerSelectionId;

                          return (
                            <div
                              className={isActive ? "provider-option is-active" : "provider-option"}
                              key={provider.id}
                            >
                              <button
                                className="provider-option-summary"
                                onClick={() => {
                                  handleProviderOptionClick(provider);
                                }}
                                type="button"
                              >
                                <span className="provider-option-copy">
                                  <span className="provider-option-title-row">
                                    <span className="provider-option-title">
                                      {provider.label}
                                    </span>
                                    <span className="model-group-badges">
                                      {isActive ? (
                                        <span className="model-group-badge is-current">
                                          Current
                                        </span>
                                      ) : null}
                                      <span className="model-group-badge">Add API key</span>
                                    </span>
                                  </span>
                                  <span className="provider-option-description">
                                    {provider.description}
                                  </span>
                                </span>
                              </button>
                              {isActive ? (
                                <form
                                  autoComplete="off"
                                  className="provider-option-editor"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    void saveProviderCredential(provider.id);
                                  }}
                                >
                                  <input
                                    aria-label={`${provider.label} API key`}
                                    autoCapitalize="off"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    className="provider-credential-input is-masked"
                                    data-1p-ignore="true"
                                    data-lpignore="true"
                                    inputMode="text"
                                    onChange={(event) => {
                                      setProviderApiKeyInput(event.target.value);
                                      if (providerCredentialMutation.status !== "idle") {
                                        setProviderCredentialMutation({ status: "idle" });
                                      }
                                    }}
                                    placeholder="Paste API key"
                                    ref={providerApiKeyInputRef}
                                    spellCheck={false}
                                    type="text"
                                    value={providerApiKeyInput}
                                  />
                                  {providerCredentialStatusMessage ? (
                                    <p
                                      className={
                                        providerCredentialMutation.status === "error"
                                          ? "selector-error"
                                          : "selector-success"
                                      }
                                    >
                                      {providerCredentialStatusMessage}
                                    </p>
                                  ) : null}
                                  <div className="provider-option-actions">
                                    <button
                                      className="dialog-button"
                                      disabled={providerCredentialMutation.status === "saving"}
                                      type="submit"
                                    >
                                      {providerCredentialMutation.status === "saving"
                                        ? "Saving..."
                                        : "Connect"}
                                    </button>
                                  </div>
                                </form>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
            </div>
            <div className="dialog-actions provider-picker-actions">
              <button
                className="dialog-button danger"
                onClick={closeProviderPicker}
                type="button"
              >
                Done
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
            <div className="message-list" ref={messageListRef}>
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
                          <span className="message-role">
                            {assistantRoleLabel(message)}
                          </span>
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
                  <span className="message-role">
                    {assistantRoleLabel(activeModelSelection.modelId)}
                  </span>
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
                    onClick={toggleModelPicker}
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
                    <div className="model-surface-header">
                      <p className="model-surface-eyebrow">Model selection</p>
                      <p className="model-surface-title">Choose model</p>
                    </div>
                    <div className="model-picker-topbar">
                      <div className="model-search">
                        <SearchIcon />
                        <input
                          aria-label="Search models"
                          className="model-search-input"
                          onChange={(event) => {
                            setModelQuery(event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              applyManualModelQuery();
                            }
                          }}
                          placeholder="Search models"
                          ref={modelSearchInputRef}
                          value={modelQuery}
                        />
                      </div>
                      <button
                        aria-label="Manage models"
                        className="picker-icon-button"
                        onClick={openManageModels}
                        title="Manage Models"
                        type="button"
                      >
                        <TuneIcon />
                      </button>
                    </div>
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
                            groupedModelOptions.map(({ provider, models }) => {
                              const isCollapsed =
                                !modelQuery.trim() &&
                                collapsedModelProviderIds.includes(provider.id);

                              return (
                                <section className="model-group" key={provider.id}>
                                  <button
                                    aria-expanded={!isCollapsed}
                                    className="model-group-label model-group-toggle"
                                    onClick={() => {
                                      toggleModelProviderCollapse(provider.id);
                                    }}
                                    type="button"
                                  >
                                    <span className="model-group-title">{provider.label}</span>
                                    <span className="model-group-toggle-meta">
                                      <span className="model-group-badges">
                                        {provider.id === activeModelSelection.providerId ? (
                                          <span className="model-group-badge is-current">
                                            Current
                                          </span>
                                        ) : null}
                                        {!provider.configured ? (
                                          <span className="model-group-badge">
                                            Add API key
                                          </span>
                                        ) : null}
                                      </span>
                                      <span
                                        className={
                                          isCollapsed
                                            ? "model-group-toggle-icon is-collapsed"
                                            : "model-group-toggle-icon"
                                        }
                                      >
                                        <ChevronDownIcon />
                                      </span>
                                    </span>
                                  </button>
                                  <div
                                    className={
                                      isCollapsed
                                        ? "model-group-collapsible is-collapsed"
                                        : "model-group-collapsible"
                                    }
                                  >
                                    <div className="model-group-collapsible-inner">
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
                                              updateActiveModelSelection(
                                                {
                                                  providerId: provider.id,
                                                  modelId,
                                                },
                                                { persistAsManualDefault: true }
                                              );
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
                                    </div>
                                  </div>
                                </section>
                              );
                            })
                          )}
                        </div>
                        {activeProviderModels?.status === "error" ? (
                          <p className="selector-error">{activeProviderModels.errorMessage}</p>
                        ) : null}
                    </>
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
