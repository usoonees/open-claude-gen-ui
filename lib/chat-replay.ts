import { createUIMessageStream } from "ai";
import type { ChatUIMessage } from "@/lib/chat-message";

type MessagePart = ChatUIMessage["parts"][number];
const SYNTHETIC_DELTA_SIZE = 10;

function splitIntoDeltas(text: string, deltaSize = SYNTHETIC_DELTA_SIZE) {
  if (!text) {
    return [""];
  }

  const deltas: string[] = [];

  for (let index = 0; index < text.length; index += deltaSize) {
    deltas.push(text.slice(index, index + deltaSize));
  }

  return deltas;
}

function toolNameFromPart(part: MessagePart) {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
}

function isToolLikePart(
  part: MessagePart
): part is Extract<MessagePart, { toolCallId: string }> {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function writeSyntheticTextPart(
  writer: Parameters<typeof createUIMessageStream<ChatUIMessage>>[0]["execute"] extends (
    options: infer T
  ) => unknown
    ? T extends { writer: infer W }
      ? W
      : never
    : never,
  part: Extract<MessagePart, { type: "text" | "reasoning" }>,
  partIndex: number
) {
  const id = `${part.type}-${partIndex}`;

  writer.write({
    type: part.type === "text" ? "text-start" : "reasoning-start",
    id,
    providerMetadata: part.providerMetadata,
  });

  for (const delta of splitIntoDeltas(part.text)) {
    writer.write({
      type: part.type === "text" ? "text-delta" : "reasoning-delta",
      id,
      delta,
      providerMetadata: part.providerMetadata,
    });
  }

  writer.write({
    type: part.type === "text" ? "text-end" : "reasoning-end",
    id,
    providerMetadata: part.providerMetadata,
  });
}

function writeSyntheticToolPart(
  writer: Parameters<typeof createUIMessageStream<ChatUIMessage>>[0]["execute"] extends (
    options: infer T
  ) => unknown
    ? T extends { writer: infer W }
      ? W
      : never
    : never,
  part: Extract<MessagePart, { toolCallId: string }>
) {
  const toolName = toolNameFromPart(part);
  const inputProviderMetadata =
    "callProviderMetadata" in part ? part.callProviderMetadata : undefined;
  const outputProviderMetadata =
    "resultProviderMetadata" in part ? part.resultProviderMetadata : undefined;
  const baseToolChunk = {
    toolCallId: part.toolCallId,
    toolName,
    dynamic: part.type === "dynamic-tool" ? true : undefined,
    providerExecuted: part.providerExecuted,
    title: "title" in part ? part.title : undefined,
  };

  const writeInputAvailable = () => {
    writer.write({
      type: "tool-input-available",
      ...baseToolChunk,
      input: "input" in part ? part.input : undefined,
      providerMetadata: inputProviderMetadata,
    });
  };

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      writeInputAvailable();
      return;
    case "approval-requested":
      writeInputAvailable();
      writer.write({
        type: "tool-approval-request",
        approvalId: part.approval.id,
        toolCallId: part.toolCallId,
      });
      return;
    case "approval-responded":
      writeInputAvailable();
      if (!part.approval.approved) {
        writer.write({
          type: "tool-approval-request",
          approvalId: part.approval.id,
          toolCallId: part.toolCallId,
        });
        writer.write({
          type: "tool-output-denied",
          toolCallId: part.toolCallId,
        });
      }
      return;
    case "output-available":
      writeInputAvailable();
      writer.write({
        type: "tool-output-available",
        toolCallId: part.toolCallId,
        output: part.output,
        providerExecuted: part.providerExecuted,
        providerMetadata: outputProviderMetadata,
        dynamic: part.type === "dynamic-tool" ? true : undefined,
        preliminary: part.preliminary,
      });
      return;
    case "output-error":
      if (
        part.input === undefined &&
        "rawInput" in part &&
        part.rawInput !== undefined
      ) {
        writer.write({
          type: "tool-input-error",
          ...baseToolChunk,
          input: part.rawInput,
          errorText: part.errorText,
          providerMetadata: outputProviderMetadata ?? inputProviderMetadata,
        });
        return;
      }

      writeInputAvailable();
      writer.write({
        type: "tool-output-error",
        toolCallId: part.toolCallId,
        errorText: part.errorText,
        providerExecuted: part.providerExecuted,
        providerMetadata: outputProviderMetadata,
        dynamic: part.type === "dynamic-tool" ? true : undefined,
      });
      return;
    case "output-denied":
      writeInputAvailable();
      if (part.approval?.id) {
        writer.write({
          type: "tool-approval-request",
          approvalId: part.approval.id,
          toolCallId: part.toolCallId,
        });
      }
      writer.write({
        type: "tool-output-denied",
        toolCallId: part.toolCallId,
      });
      return;
    default:
      return;
  }
}

function writeSyntheticMessagePart(
  writer: Parameters<typeof createUIMessageStream<ChatUIMessage>>[0]["execute"] extends (
    options: infer T
  ) => unknown
    ? T extends { writer: infer W }
      ? W
      : never
    : never,
  part: MessagePart,
  partIndex: number
) {
  if (part.type === "text" || part.type === "reasoning") {
    writeSyntheticTextPart(writer, part, partIndex);
    return;
  }

  if (isToolLikePart(part)) {
    writeSyntheticToolPart(writer, part);
    return;
  }

  if (part.type === "source-url") {
    writer.write({
      type: "source-url",
      sourceId: part.sourceId,
      url: part.url,
      title: part.title,
      providerMetadata: part.providerMetadata,
    });
    return;
  }

  if (part.type === "source-document") {
    writer.write({
      type: "source-document",
      sourceId: part.sourceId,
      mediaType: part.mediaType,
      title: part.title,
      filename: part.filename,
      providerMetadata: part.providerMetadata,
    });
    return;
  }

  if (part.type === "file") {
    writer.write({
      type: "file",
      url: part.url,
      mediaType: part.mediaType,
      providerMetadata: part.providerMetadata,
    });
    return;
  }

  if (part.type !== "step-start" && part.type.startsWith("data-")) {
    writer.write({
      type: part.type,
      id: "id" in part ? part.id : undefined,
      data: part.data,
    });
  }
}

export function createSyntheticReplayStream(message: ChatUIMessage) {
  return createUIMessageStream<ChatUIMessage>({
    execute: ({ writer }) => {
      writer.write({
        type: "start",
        messageId: message.id,
        messageMetadata: message.metadata,
      });

      let hasOpenStep = false;

      message.parts.forEach((part, partIndex) => {
        if (part.type === "step-start") {
          if (hasOpenStep) {
            writer.write({ type: "finish-step" });
          }

          writer.write({ type: "start-step" });
          hasOpenStep = true;
          return;
        }

        writeSyntheticMessagePart(writer, part, partIndex);
      });

      if (hasOpenStep) {
        writer.write({ type: "finish-step" });
      }

      writer.write({
        type: "finish",
        finishReason: "stop",
        messageMetadata: message.metadata,
      });
    },
  });
}
