import type { ChatUIMessage } from "@/lib/chat-message";
import type { UIMessageChunk } from "ai";

function firstShowWidgetPartIndex(message: ChatUIMessage) {
  return message.role === "assistant"
    ? message.parts.findIndex((part) => part.type === "tool-showWidget")
    : -1;
}

export function normalizePreShowWidgetTextMessages(messages: ChatUIMessage[]) {
  return messages.map((message) => {
    const firstShowWidgetIndex = firstShowWidgetPartIndex(message);

    if (firstShowWidgetIndex < 0) {
      return message;
    }

    let changed = false;
    const parts = message.parts.map((part, index) => {
      if (!(index < firstShowWidgetIndex && part.type === "text")) {
        return part;
      }

      changed = true;

      return {
        type: "reasoning" as const,
        text: part.text,
        state: part.state,
        ...(part.providerMetadata
          ? { providerMetadata: part.providerMetadata }
          : {}),
      };
    });

    return changed ? { ...message, parts } : message;
  });
}

function isTextChunk(
  chunk: UIMessageChunk
): chunk is Extract<
  UIMessageChunk,
  { type: "text-start" | "text-delta" | "text-end" }
> {
  return (
    chunk.type === "text-start" ||
    chunk.type === "text-delta" ||
    chunk.type === "text-end"
  );
}

function toReasoningChunk(
  chunk: Extract<
    UIMessageChunk,
    { type: "text-start" | "text-delta" | "text-end" }
  >
): UIMessageChunk {
  switch (chunk.type) {
    case "text-start":
      return {
        type: "reasoning-start",
        id: chunk.id,
        providerMetadata: chunk.providerMetadata,
      };
    case "text-delta":
      return {
        type: "reasoning-delta",
        id: chunk.id,
        delta: chunk.delta,
        providerMetadata: chunk.providerMetadata,
      };
    case "text-end":
      return {
        type: "reasoning-end",
        id: chunk.id,
        providerMetadata: chunk.providerMetadata,
      };
  }
}

function toolNameFromChunk(chunk: UIMessageChunk) {
  switch (chunk.type) {
    case "tool-input-start":
    case "tool-input-available":
    case "tool-input-error":
      return chunk.toolName;
    default:
      return null;
  }
}

type StreamPhase = "pre-widget-unknown" | "pre-widget-confirmed" | "post-widget";

export function normalizePreShowWidgetTextStream(
  stream: ReadableStream<UIMessageChunk>
) {
  let phase: StreamPhase = "pre-widget-unknown";
  let bufferedChunks: UIMessageChunk[] = [];
  let openConvertedTextPartIds = new Set<string>();

  function convertTextChunkToReasoning(
    chunk: Extract<
      UIMessageChunk,
      { type: "text-start" | "text-delta" | "text-end" }
    >
  ) {
    if (chunk.type === "text-start") {
      openConvertedTextPartIds.add(chunk.id);
    }

    if (chunk.type === "text-end") {
      openConvertedTextPartIds.delete(chunk.id);
    }

    return toReasoningChunk(chunk);
  }

  function enqueueChunk(
    controller: TransformStreamDefaultController<UIMessageChunk>,
    chunk: UIMessageChunk
  ) {
    if (
      isTextChunk(chunk) &&
      (phase === "pre-widget-confirmed" ||
        openConvertedTextPartIds.has(chunk.id))
    ) {
      controller.enqueue(convertTextChunkToReasoning(chunk));
      return;
    }

    controller.enqueue(chunk);
  }

  function flushBufferedChunks(
    controller: TransformStreamDefaultController<UIMessageChunk>,
    mode: "original" | "reasoning"
  ) {
    for (const bufferedChunk of bufferedChunks) {
      controller.enqueue(
        mode === "reasoning" && isTextChunk(bufferedChunk)
          ? convertTextChunkToReasoning(bufferedChunk)
          : bufferedChunk
      );
    }

    bufferedChunks = [];
  }

  function resetState() {
    phase = "pre-widget-unknown";
    bufferedChunks = [];
    openConvertedTextPartIds = new Set<string>();
  }

  return stream.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        if (chunk.type === "start") {
          resetState();
          controller.enqueue(chunk);
          return;
        }

        if (chunk.type === "finish" || chunk.type === "abort") {
          if (bufferedChunks.length > 0) {
            flushBufferedChunks(controller, "original");
          }

          controller.enqueue(chunk);
          resetState();
          return;
        }

        const toolName = toolNameFromChunk(chunk);
        const nextPhase =
          toolName === "showWidget"
            ? "post-widget"
            : toolName === "visualizeReadMe"
              ? "pre-widget-confirmed"
              : null;

        if (phase === "pre-widget-unknown") {
          if (nextPhase) {
            if (bufferedChunks.length > 0) {
              flushBufferedChunks(controller, "reasoning");
            }

            controller.enqueue(chunk);
            phase = nextPhase;
            return;
          }

          if (bufferedChunks.length > 0 || isTextChunk(chunk)) {
            bufferedChunks.push(chunk);
            return;
          }

          controller.enqueue(chunk);
          return;
        }

        if (phase === "pre-widget-confirmed") {
          if (nextPhase === "post-widget") {
            controller.enqueue(chunk);
            phase = "post-widget";
            return;
          }

          enqueueChunk(controller, chunk);
          return;
        }

        enqueueChunk(controller, chunk);
      },
      flush(controller) {
        if (bufferedChunks.length > 0) {
          flushBufferedChunks(controller, "original");
        }
      },
    })
  );
}
