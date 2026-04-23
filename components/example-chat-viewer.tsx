"use client";

import { GenerativeWidget } from "@/components/generative-widget";
import { normalizeShowWidgetToolInput } from "@/lib/generative-ui/show-widget-input";
import { openTrustedWidgetLink } from "@/lib/generative-ui/browser-links";
import { getAssistantMessageModelId, type ChatUIMessage } from "@/lib/chat-message";
import Link from "next/link";
import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      status: "ready" | "error";
      errorText?: string;
    };

declare global {
  interface Window {
    sendPrompt?: (text: string) => void;
    openLink?: (url: string) => boolean;
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function widgetInputFromUnknown(input: unknown): WidgetToolInput {
  return normalizeShowWidgetToolInput(input);
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

function isToolLikePart(part: MessagePart): part is MessagePart & ToolLikePart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function isWidgetToolPart(part: MessagePart): part is Extract<MessagePart, { type: "tool-showWidget" }> {
  return part.type === "tool-showWidget";
}

function isVisualizeReadMeToolPart(
  part: MessagePart
): part is Extract<MessagePart, { type: "tool-visualizeReadMe" }> {
  return part.type === "tool-visualizeReadMe";
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
        inputPreview: createToolInputPreview(part.input) ?? undefined,
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

      const query = input && typeof input.query === "string" ? input.query : null;

      return {
        label,
        tone: "running",
        detail: query ? `Working on "${query}"` : "Running tool...",
        inputPreview: createToolInputPreview(part.input) ?? undefined,
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

      const results = output && Array.isArray(output.results) ? output.results : null;
      const query = output && typeof output.query === "string" ? output.query : null;

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
          kind: "reasoning",
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
        kind: "tool",
        key:
          isToolLikePart(part)
            ? `${part.toolCallId}-${part.state}`
            : `tool-${index}`,
        event: toolEvent,
      },
    ];
  });
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
      <div aria-hidden={!isOpen} className="thinking-panel" id={contentId}>
        <div className="thinking-panel-inner">
          <div className="thinking-stack">
            {items.map((item) =>
              item.kind === "reasoning" ? (
                <PlainTextBlock className="reasoning-plain-text" key={item.key}>
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
        status: part.state === "output-error" ? "error" : "ready",
        errorText: part.state === "output-error" ? part.errorText : undefined,
      },
    ];
  });
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

function MessageContent({ message }: { message: ChatUIMessage }) {
  const thinkingItems = thinkingItemsFromMessage(message);
  const renderableItems = renderableItemsFromMessage(message);
  const hasVisibleOutput = renderableItems.length > 0;
  const hasWidgetOutput = renderableItems.some((item) => item.kind === "widget");
  const hasTextOutput = renderableItems.some((item) => item.kind === "text");
  const postWidgetReasoning = postWidgetReasoningFromMessage(message).trim();
  const shouldOpenThinking = !hasVisibleOutput;
  const showCompletedWidgetFallbackText =
    hasWidgetOutput && !hasTextOutput && postWidgetReasoning.length > 0;

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
      {showCompletedWidgetFallbackText ? (
        <MarkdownBlock>{postWidgetReasoning}</MarkdownBlock>
      ) : null}
    </>
  );
}

function assistantRoleLabel(message: ChatUIMessage) {
  const modelId = getAssistantMessageModelId(message);
  return modelId ? `Assistant(${modelId})` : "Assistant";
}

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function ExampleChatViewer({
  title,
  description,
  messages,
  showOpenChatAppLink = true,
  updatedAt,
}: {
  title: string;
  description: string;
  messages: ChatUIMessage[];
  showOpenChatAppLink?: boolean;
  updatedAt: string;
}) {
  const updatedAtLabel = formatUpdatedAt(updatedAt);

  useEffect(() => {
    window.sendPrompt = () => {};
    window.openLink = (url: string) => {
      openTrustedWidgetLink(url);
      return true;
    };

    return () => {
      delete window.sendPrompt;
      delete window.openLink;
    };
  }, []);

  return (
    <main className="example-page">
      <div className="example-page-inner">
        <div className="example-page-header">
          <div className="example-page-header-row">
            <Link className="example-back-link" href="/examples">
              All examples
            </Link>
            {showOpenChatAppLink ? (
              <Link className="example-back-link" href="/">
                Open chat app
              </Link>
            ) : null}
          </div>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="example-page-meta">
            <span>Read-only example</span>
            <span>Widget follow-up prompts are disabled</span>
            {updatedAtLabel ? <span>Captured {updatedAtLabel}</span> : null}
          </div>
        </div>

        <section aria-label={title} className="example-transcript">
          <div className="message-list">
            {messages.map((message, index) => (
              <article
                className={`message message-${message.role}`}
                key={message.id || `example-message-${index}`}
              >
                <div className="message-body">
                  {message.role === "assistant" ? (
                    <span className="message-role">{assistantRoleLabel(message)}</span>
                  ) : null}
                  <MessageContent message={message} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
