import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createUIMessageStream, type UIMessageChunk } from "ai";
import type { ChatModelSelection } from "@/lib/chat-model-config";
import type { ChatUIMessage } from "@/lib/chat-message";
import {
  getGenerativeUIGuidelines,
  type GenerativeUIModule,
} from "@/lib/generative-ui";
import { normalizeShowWidgetToolInput } from "@/lib/generative-ui/show-widget-input";
import { SHOW_WIDGET_REQUIRES_README_ERROR } from "@/lib/generative-ui/show-widget-validation";

type JsonRpcMessage = {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type ThreadItem = {
  id?: string;
  type?: string;
  text?: string;
  server?: string;
  tool?: string;
  name?: string;
  arguments?: unknown;
  result?: unknown;
  error?: unknown;
  aggregatedOutput?: string | null;
};

type AppServerNotification = {
  method?: string;
  params?: {
    thread?: { id?: string };
    threadId?: string;
    turn?: { id?: string; status?: string; error?: unknown };
    turnId?: string;
    item?: ThreadItem;
    itemId?: string;
    delta?: string;
  };
};

type ActiveToolCall = {
  toolCallId: string;
  toolName: "visualizeReadMe" | "showWidget";
  input: unknown;
  inputAvailable: boolean;
};

type AgentDeltaState = {
  buffer: string;
  emittedLength: number;
  bridgeBuffered: boolean;
  bridgeScanOffset: number;
  activeBridgeCall?: {
    toolCallId: string;
    toolName: ActiveToolCall["toolName"];
    contentEmittedUntil: number;
    rawContent: string;
  };
};

const codexGenUiMcpName = "open_claude_gen_ui";
const codexSessionDir = path.join(process.cwd(), ".data", "codex-sessions");
const bridgeToolCallOpenTag = "<CodexToolCall";
const bridgeToolCallCloseTag = "</CodexToolCall>";
const bridgeToolCallOpenTagPattern =
  /^<CodexToolCall\s+name="([^"]+)"\s*>/;
const bridgeToolCallPattern =
  /<CodexToolCall\s+name="([^"]+)"\s*>([\s\S]*?)<\/CodexToolCall>/g;
const toolInputDeltaSize = 24;
const toolInputDeltaDelayMs = 45;

export function isCodexChatRuntimeEnabled() {
  return process.env.CHAT_AGENT_RUNTIME?.trim().toLowerCase() === "codex";
}

function textFromMessage(message: ChatUIMessage) {
  return message.parts
    .filter(
      (part): part is Extract<(typeof message.parts)[number], { type: "text" }> =>
        part.type === "text"
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function ensureCodexSessionDir() {
  await mkdir(codexSessionDir, { recursive: true, mode: 0o700 });
}

function codexSessionPath(chatId: string) {
  return path.join(codexSessionDir, `${encodeURIComponent(chatId)}.json`);
}

async function readCodexThreadId(chatId: string) {
  try {
    const file = await readFile(codexSessionPath(chatId), "utf8");
    const record = JSON.parse(file) as { threadId?: unknown };

    return typeof record.threadId === "string" && record.threadId.trim()
      ? record.threadId
      : null;
  } catch {
    return null;
  }
}

async function writeCodexThreadId(chatId: string, threadId: string) {
  await ensureCodexSessionDir();
  await writeFile(
    codexSessionPath(chatId),
    `${JSON.stringify({ threadId, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    { mode: 0o600 }
  );
}

function latestUserText(messages: ChatUIMessage[]) {
  const message =
    [...messages].reverse().find((candidate) => candidate.role === "user") ??
    messages[messages.length - 1];

  return message ? textFromMessage(message) : "";
}

function buildCodexPrompt(
  messages: ChatUIMessage[],
  systemPrompt: string,
  mode: "new-thread" | "resume-thread"
) {
  if (mode === "resume-thread") {
    return `${systemPrompt}

Continue this existing Codex thread for the chat application.
Use the MCP tools from the ${codexGenUiMcpName} server for generative UI:
- Call visualizeReadMe before the first showWidget call when a widget would help.
- Call showWidget with the complete HTML or SVG fragment in widgetCode.
- Keep normal explanation outside widgetCode.
If those MCP tools are not exposed by Codex app-server, do not apologize. Instead, emit bridge tool calls exactly like:
<CodexToolCall name="visualizeReadMe">{"modules":["diagram"]}</CodexToolCall>
<CodexToolCall name="showWidget">{"iHaveSeenReadMe":true,"title":"flow_widget","loadingMessages":["Drawing flow"],"widgetCode":"<svg>...</svg>"}</CodexToolCall>
Do not wrap bridge tool calls in markdown fences.

Latest USER message:

${latestUserText(messages)}

Respond to the latest USER message.`;
  }

  const transcript = messages
    .map((message) => {
      const text = textFromMessage(message);

      if (!text) {
        return null;
      }

      return `${message.role.toUpperCase()}:\n${text}`;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join("\n\n");

  return `${systemPrompt}

You are running through Codex app-server inside this chat application.
Use the MCP tools from the ${codexGenUiMcpName} server for generative UI:
- Call visualizeReadMe before the first showWidget call when a widget would help.
- Call showWidget with the complete HTML or SVG fragment in widgetCode.
- Keep normal explanation outside widgetCode.
If those MCP tools are not exposed by Codex app-server, do not apologize. Instead, emit bridge tool calls exactly like:
<CodexToolCall name="visualizeReadMe">{"modules":["diagram"]}</CodexToolCall>
<CodexToolCall name="showWidget">{"iHaveSeenReadMe":true,"title":"flow_widget","loadingMessages":["Drawing flow"],"widgetCode":"<svg>...</svg>"}</CodexToolCall>
Do not wrap bridge tool calls in markdown fences.

Conversation so far:

${transcript}

Respond to the latest USER message.`;
}

function normalizeToolName(name: unknown): ActiveToolCall["toolName"] | null {
  if (typeof name !== "string") {
    return null;
  }

  const normalized = name.toLowerCase();

  if (normalized.endsWith("showwidget")) {
    return "showWidget";
  }

  if (normalized.endsWith("visualizereadme")) {
    return "visualizeReadMe";
  }

  return null;
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkText(text: string, chunkSize = toolInputDeltaSize) {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks.length > 0 ? chunks : [""];
}

function modulesFromInput(input: unknown): GenerativeUIModule[] {
  const record =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const modules = Array.isArray(record.modules) ? record.modules : [];
  const validModules = new Set(["art", "mockup", "interactive", "chart", "diagram"]);
  const filtered = modules.filter(
    (module): module is GenerativeUIModule =>
      typeof module === "string" && validModules.has(module)
  );

  return filtered.length > 0 ? filtered : ["diagram"];
}

function codexModel() {
  return (
    process.env.CODEX_APP_SERVER_MODEL?.trim() ||
    process.env.CODEX_EXEC_MODEL?.trim() ||
    ""
  );
}

function codexSandbox() {
  return (
    process.env.CODEX_APP_SERVER_SANDBOX?.trim() ||
    process.env.CODEX_EXEC_SANDBOX?.trim() ||
    "danger-full-access"
  );
}

function codexAppServerArgs() {
  const mcpScriptPath = path.join(process.cwd(), "scripts", "codex-gen-ui-mcp.mjs");

  return [
    "app-server",
    "--listen",
    "stdio://",
    "-c",
    `mcp_servers.${codexGenUiMcpName}.command="node"`,
    "-c",
    `mcp_servers.${codexGenUiMcpName}.args=["${mcpScriptPath
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')}"]`,
  ];
}

function rpcErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return JSON.stringify(error);
}

function textFromMcpContent(content: unknown) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      if (entry && typeof entry === "object") {
        const text = (entry as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function outputFromMcpResult(toolName: ActiveToolCall["toolName"], item: ThreadItem) {
  const result =
    item.result && typeof item.result === "object"
      ? (item.result as { structuredContent?: unknown; content?: unknown })
      : null;

  if (result?.structuredContent) {
    return result.structuredContent;
  }

  const contentText = textFromMcpContent(result?.content);
  const parsedContent = parseMaybeJson(contentText);

  if (toolName === "showWidget") {
    const record =
      parsedContent && typeof parsedContent === "object"
        ? (parsedContent as Record<string, unknown>)
        : {};

    return {
      rendered: record.rendered === true,
      title: typeof record.title === "string" ? record.title : undefined,
    };
  }

  const modules = modulesFromInput(item.arguments);

  return {
    modules,
    guidance: typeof parsedContent === "string"
      ? parsedContent
      : getGenerativeUIGuidelines(modules),
  };
}

class CodexAppServerClient {
  private nextId = 1;
  private stdoutBuffer = "";
  private readonly pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
    }
  >();

  constructor(
    private readonly child: ChildProcessWithoutNullStreams,
    private readonly onNotification: (notification: AppServerNotification) => void,
    private readonly onStderr: (chunk: string) => void
  ) {
    child.stdout.on("data", (chunk: Buffer) => {
      this.stdoutBuffer += chunk.toString("utf8");
      this.consumeStdout();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      this.onStderr(chunk.toString("utf8"));
    });
    child.on("error", (error) => this.rejectAll(error));
    child.on("close", (code) => {
      this.consumeStdout();
      this.rejectAll(new Error(`codex app-server exited with code ${code ?? "unknown"}`));
    });
  }

  request(method: string, params?: unknown) {
    const id = this.nextId++;
    const message: JsonRpcMessage = { id, method, params };

    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.write(message);
    });
  }

  notify(method: string, params?: unknown) {
    this.write(params === undefined ? { method } : { method, params });
  }

  close() {
    if (!this.child.killed) {
      this.child.kill();
    }
  }

  private write(message: JsonRpcMessage) {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private consumeStdout() {
    let newlineIndex = this.stdoutBuffer.indexOf("\n");

    while (newlineIndex >= 0) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

      if (line.startsWith("{")) {
        this.handleLine(line);
      }

      newlineIndex = this.stdoutBuffer.indexOf("\n");
    }
  }

  private handleLine(line: string) {
    let message: JsonRpcMessage;

    try {
      message = JSON.parse(line) as JsonRpcMessage;
    } catch {
      return;
    }

    if (message.id !== undefined && !message.method) {
      const id = Number(message.id);
      const pending = this.pending.get(id);

      if (!pending) {
        return;
      }

      this.pending.delete(id);

      if (message.error) {
        pending.reject(new Error(rpcErrorMessage(message.error)));
        return;
      }

      pending.resolve(message.result);
      return;
    }

    if (message.id !== undefined && message.method) {
      this.write({
        id: message.id,
        error: {
          code: -32601,
          message: `Unsupported app-server request: ${message.method}`,
        },
      });
      return;
    }

    if (message.method) {
      this.onNotification(message as AppServerNotification);
    }
  }

  private rejectAll(error: Error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }

    this.pending.clear();
  }
}

function responseThreadId(response: unknown) {
  const record = response && typeof response === "object"
    ? response as { thread?: { id?: unknown } }
    : {};
  return typeof record.thread?.id === "string" ? record.thread.id : null;
}

function responseTurnId(response: unknown) {
  const record = response && typeof response === "object"
    ? response as { turn?: { id?: unknown } }
    : {};
  return typeof record.turn?.id === "string" ? record.turn.id : null;
}

async function initializeCodexAppServer(client: CodexAppServerClient) {
  await client.request("initialize", {
    clientInfo: {
      name: "open-claude-gen-ui",
      title: "Open Claude Gen UI",
      version: "0.1.0",
    },
    capabilities: {
      experimentalApi: true,
      optOutNotificationMethods: [],
    },
  });
  client.notify("initialized");
}

async function startOrResumeThread(
  client: CodexAppServerClient,
  chatId: string,
  existingThreadId: string | null
) {
  const model = codexModel() || null;
  const baseParams = {
    cwd: process.cwd(),
    approvalPolicy: "never",
    approvalsReviewer: "user",
    sandbox: codexSandbox(),
    config: null,
    baseInstructions: null,
    developerInstructions: null,
    personality: null,
    persistExtendedHistory: true,
  };

  if (existingThreadId) {
    try {
      const resumeResponse = await client.request("thread/resume", {
        ...baseParams,
        threadId: existingThreadId,
        model,
      });
      const resumedThreadId = responseThreadId(resumeResponse);

      if (resumedThreadId) {
        return resumedThreadId;
      }
    } catch {
      // The app can outlive Codex's local thread cache; start fresh if resume fails.
    }
  }

  const startResponse = await client.request("thread/start", {
    ...baseParams,
    model,
    modelProvider: null,
    serviceName: "open-claude-gen-ui",
    ephemeral: false,
    sessionStartSource: null,
    experimentalRawEvents: false,
  });
  const threadId = responseThreadId(startResponse);

  if (!threadId) {
    throw new Error("Codex app-server did not return a thread id.");
  }

  await writeCodexThreadId(chatId, threadId);

  return threadId;
}

export function createCodexCLIUIStream({
  messages,
  chatId,
  modelSelection: _modelSelection,
  systemPrompt,
  onFinish,
}: {
  messages: ChatUIMessage[];
  chatId: string;
  modelSelection: ChatModelSelection;
  systemPrompt: string;
  onFinish?: (messages: ChatUIMessage[]) => Promise<void>;
}) {
  return createUIMessageStream<ChatUIMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const existingThreadId = await readCodexThreadId(chatId);
      const prompt = buildCodexPrompt(
        messages,
        systemPrompt,
        existingThreadId ? "resume-thread" : "new-thread"
      );
      const messageMetadata = {
        modelId: codexModel() || "codex-app-server",
      };
      writer.write({ type: "start", messageMetadata });

      const codex = spawn("codex", codexAppServerArgs(), {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stderrBuffer = "";
      let textPartId: string | null = null;
      let activeThreadId: string | null = null;
      let activeTurnId: string | null = null;
      let turnCompleted = false;
      let didFinish = false;
      let sawCompletedReadMe = false;
      let pendingEventProcessing = Promise.resolve();
      const activeToolCalls = new Map<string, ActiveToolCall>();
      const agentDeltaStates = new Map<string, AgentDeltaState>();

      function ensureTextPart() {
        if (textPartId) {
          return textPartId;
        }

        textPartId = `codex-text-${crypto.randomUUID()}`;
        writer.write({ type: "text-start", id: textPartId });
        return textPartId;
      }

      function writeText(text: string) {
        if (!text) {
          return;
        }

        writer.write({ type: "text-delta", id: ensureTextPart(), delta: text });
      }

      function finishTextPart() {
        if (!textPartId) {
          return;
        }

        writer.write({ type: "text-end", id: textPartId });
        textPartId = null;
      }

      function finishMessage() {
        if (didFinish) {
          return;
        }

        finishTextPart();
        writer.write({
          type: "finish",
          finishReason: "stop",
          messageMetadata,
        });
        didFinish = true;
      }

      function writeToolInputAvailable(
        toolCallId: string,
        toolName: ActiveToolCall["toolName"],
        input: unknown
      ) {
        finishTextPart();
        writer.write({
          type: "tool-input-available",
          toolCallId,
          toolName,
          input,
        });
      }

      function writeToolOutputAvailable(toolCallId: string, output: unknown) {
        writer.write({
          type: "tool-output-available",
          toolCallId,
          output,
        });
      }

      function executeCompletedBridgeToolCall(
        toolCallId: string,
        toolName: ActiveToolCall["toolName"],
        rawInput: unknown
      ) {
        if (toolName === "visualizeReadMe") {
          const modules = modulesFromInput(rawInput);
          const input = { modules };

          writeToolInputAvailable(toolCallId, toolName, input);
          sawCompletedReadMe = true;
          writeToolOutputAvailable(toolCallId, {
            modules,
            guidance: getGenerativeUIGuidelines(modules),
          });
          return;
        }

        const input = normalizeShowWidgetToolInput(rawInput);

        writeToolInputAvailable(toolCallId, toolName, input);

        if (!input.iHaveSeenReadMe && !sawCompletedReadMe) {
          writer.write({
            type: "tool-output-error",
            toolCallId,
            errorText: SHOW_WIDGET_REQUIRES_README_ERROR,
          });
          return;
        }

        if (!input.title || !input.widgetCode?.trim() || !input.loadingMessages?.length) {
          writer.write({
            type: "tool-output-error",
            toolCallId,
            errorText: "showWidget requires title, loadingMessages, and widgetCode.",
          });
          return;
        }

        writeToolOutputAvailable(toolCallId, {
          rendered: true,
          title: input.title,
        });
      }

      async function writeStreamingToolInput(
        toolCallId: string,
        toolName: ActiveToolCall["toolName"],
        input: unknown
      ) {
        finishTextPart();
        writer.write({
          type: "tool-input-start",
          toolCallId,
          toolName,
        });

        const serializedInput =
          typeof input === "string" ? input : JSON.stringify(input);

        for (const delta of chunkText(serializedInput)) {
          writer.write({
            type: "tool-input-delta",
            toolCallId,
            inputTextDelta: delta,
          });
          await delay(toolInputDeltaDelayMs);
        }

        writer.write({
          type: "tool-input-available",
          toolCallId,
          toolName,
          input,
        });
      }

      async function executeBridgeToolCall(
        toolName: ActiveToolCall["toolName"],
        rawInput: unknown
      ) {
        const toolCallId = `codex-bridge-${toolName}-${crypto.randomUUID()}`;

        if (toolName === "visualizeReadMe") {
          const modules = modulesFromInput(rawInput);
          const input = { modules };

          await writeStreamingToolInput(toolCallId, toolName, input);
          sawCompletedReadMe = true;
          writeToolOutputAvailable(toolCallId, {
            modules,
            guidance: getGenerativeUIGuidelines(modules),
          });
          return;
        }

        const input = normalizeShowWidgetToolInput(rawInput);

        await writeStreamingToolInput(toolCallId, toolName, input);

        if (!input.iHaveSeenReadMe && !sawCompletedReadMe) {
          writer.write({
            type: "tool-output-error",
            toolCallId,
            errorText: SHOW_WIDGET_REQUIRES_README_ERROR,
          });
          return;
        }

        if (!input.title || !input.widgetCode?.trim() || !input.loadingMessages?.length) {
          writer.write({
            type: "tool-output-error",
            toolCallId,
            errorText: "showWidget requires title, loadingMessages, and widgetCode.",
          });
          return;
        }

        writeToolOutputAvailable(toolCallId, {
          rendered: true,
          title: input.title,
        });
      }

      function processStreamingBridgeToolCalls(state: AgentDeltaState) {
        while (true) {
          if (!state.activeBridgeCall) {
            const openIndex = state.buffer.indexOf(
              bridgeToolCallOpenTag,
              state.bridgeScanOffset
            );

            if (openIndex < 0) {
              return;
            }

            const openMatch = state.buffer
              .slice(openIndex)
              .match(bridgeToolCallOpenTagPattern);

            if (!openMatch) {
              return;
            }

            const toolName = normalizeToolName(openMatch[1]);
            const openEnd = openIndex + openMatch[0].length;

            if (!toolName) {
              state.bridgeScanOffset = openEnd;
              continue;
            }

            const toolCallId = `codex-bridge-${toolName}-${crypto.randomUUID()}`;

            finishTextPart();
            writer.write({
              type: "tool-input-start",
              toolCallId,
              toolName,
            });
            state.activeBridgeCall = {
              toolCallId,
              toolName,
              contentEmittedUntil: openEnd,
              rawContent: "",
            };
          }

          const activeBridgeCall = state.activeBridgeCall;
          const closeIndex = state.buffer.indexOf(
            bridgeToolCallCloseTag,
            activeBridgeCall.contentEmittedUntil
          );
          const emitUntil =
            closeIndex >= 0
              ? closeIndex
              : Math.max(
                  activeBridgeCall.contentEmittedUntil,
                  state.buffer.length - (bridgeToolCallCloseTag.length - 1)
                );
          const inputTextDelta = state.buffer.slice(
            activeBridgeCall.contentEmittedUntil,
            emitUntil
          );

          if (inputTextDelta) {
            activeBridgeCall.rawContent += inputTextDelta;
            activeBridgeCall.contentEmittedUntil = emitUntil;
            writer.write({
              type: "tool-input-delta",
              toolCallId: activeBridgeCall.toolCallId,
              inputTextDelta,
            });
          }

          if (closeIndex < 0) {
            return;
          }

          executeCompletedBridgeToolCall(
            activeBridgeCall.toolCallId,
            activeBridgeCall.toolName,
            parseMaybeJson(activeBridgeCall.rawContent.trim())
          );
          state.bridgeScanOffset = closeIndex + bridgeToolCallCloseTag.length;
          state.activeBridgeCall = undefined;
        }
      }

      async function writeTextWithBridgeToolCalls(text: string) {
        let lastIndex = 0;
        let matchedBridgeCall = false;

        for (const match of text.matchAll(bridgeToolCallPattern)) {
          matchedBridgeCall = true;
          writeText(text.slice(lastIndex, match.index));

          const toolName = normalizeToolName(match[1]);

          if (toolName) {
            await executeBridgeToolCall(toolName, parseMaybeJson(match[2].trim()));
          }

          lastIndex = (match.index ?? 0) + match[0].length;
        }

        if (!matchedBridgeCall) {
          writeText(text);
          return;
        }

        writeText(text.slice(lastIndex));
      }

      function enqueueEventProcessing(task: () => Promise<void> | void) {
        pendingEventProcessing = pendingEventProcessing.then(task, task);
      }

      async function handleMcpToolStarted(item: ThreadItem) {
        const toolName = normalizeToolName(item.tool ?? item.name);

        if (!item.id || !toolName) {
          return;
        }

        const input =
          toolName === "showWidget"
            ? normalizeShowWidgetToolInput(item.arguments)
            : item.arguments ?? {};

        activeToolCalls.set(item.id, {
          toolCallId: item.id,
          toolName,
          input,
          inputAvailable: true,
        });
        await writeStreamingToolInput(item.id, toolName, input);
      }

      async function handleMcpToolCompleted(item: ThreadItem) {
        const toolName = normalizeToolName(item.tool ?? item.name);

        if (!item.id || !toolName) {
          return;
        }

        const input =
          toolName === "showWidget"
            ? normalizeShowWidgetToolInput(item.arguments)
            : item.arguments ?? {};
        const activeToolCall = activeToolCalls.get(item.id);

        if (!activeToolCall?.inputAvailable) {
          await writeStreamingToolInput(item.id, toolName, input);
        }

        activeToolCalls.delete(item.id);

        if (item.error) {
          const error =
            item.error && typeof item.error === "object" && "message" in item.error
              ? (item.error as { message?: unknown }).message
              : item.error;
          writer.write({
            type: "tool-output-error",
            toolCallId: item.id,
            errorText: typeof error === "string" ? error : JSON.stringify(error),
          });
          return;
        }

        if (toolName === "visualizeReadMe") {
          sawCompletedReadMe = true;
        }

        writeToolOutputAvailable(item.id, outputFromMcpResult(toolName, item));
      }

      async function handleCompletedItem(item: ThreadItem) {
        if (item.type === "agentMessage") {
          const itemId = item.id ?? crypto.randomUUID();
          const text = item.text ?? "";
          const deltaState = agentDeltaStates.get(itemId);

          if (deltaState?.bridgeBuffered) {
            if (deltaState.activeBridgeCall) {
              await writeTextWithBridgeToolCalls(text.slice(deltaState.emittedLength));
            } else {
              writeText(text.slice(deltaState.bridgeScanOffset));
            }

            agentDeltaStates.delete(itemId);
            return;
          }

          if (deltaState) {
            writeText(deltaState.buffer);
            agentDeltaStates.delete(itemId);
            return;
          }

          await writeTextWithBridgeToolCalls(text);
          return;
        }

        if (item.type === "mcpToolCall") {
          await handleMcpToolCompleted(item);
        }
      }

      function handleAgentMessageDelta(params: NonNullable<AppServerNotification["params"]>) {
        const itemId = params.itemId;
        const delta = params.delta ?? "";

        if (!itemId || !delta) {
          return;
        }

        const state = agentDeltaStates.get(itemId) ?? {
          buffer: "",
          emittedLength: 0,
          bridgeBuffered: false,
          bridgeScanOffset: 0,
        };

        state.buffer += delta;

        if (state.bridgeBuffered || state.buffer.includes(bridgeToolCallOpenTag)) {
          state.bridgeBuffered = true;
          processStreamingBridgeToolCalls(state);
          agentDeltaStates.set(itemId, state);
          return;
        }

        const holdLength = bridgeToolCallOpenTag.length - 1;
        const safeLength = state.buffer.length - holdLength;

        if (safeLength > 0) {
          const safeText = state.buffer.slice(0, safeLength);
          writeText(safeText);
          state.emittedLength += safeText.length;
          state.buffer = state.buffer.slice(safeLength);
        }

        agentDeltaStates.set(itemId, state);
      }

      function handleNotification(notification: AppServerNotification) {
        const params = notification.params;

        if (!params) {
          return;
        }

        if (notification.method === "thread/started" && params.thread?.id) {
          activeThreadId = params.thread.id;
          void writeCodexThreadId(chatId, params.thread.id);
          return;
        }

        if (
          notification.method === "turn/completed" &&
          (!activeThreadId || params.threadId === activeThreadId) &&
          (!activeTurnId || params.turn?.id === activeTurnId)
        ) {
          turnCompleted = true;
          return;
        }

        if (
          activeThreadId &&
          params.threadId &&
          params.threadId !== activeThreadId
        ) {
          return;
        }

        if (activeTurnId && params.turnId && params.turnId !== activeTurnId) {
          return;
        }

        if (notification.method === "item/agentMessage/delta") {
          handleAgentMessageDelta(params);
          return;
        }

        if (notification.method === "item/started" && params.item?.type === "mcpToolCall") {
          const item = params.item;
          enqueueEventProcessing(() => handleMcpToolStarted(item));
          return;
        }

        if (notification.method === "item/completed" && params.item) {
          const item = params.item;
          enqueueEventProcessing(() => handleCompletedItem(item));
        }
      }

      const client = new CodexAppServerClient(
        codex,
        handleNotification,
        (chunk) => {
          stderrBuffer += chunk;
        }
      );

      try {
        await initializeCodexAppServer(client);
        activeThreadId = await startOrResumeThread(client, chatId, existingThreadId);
        const turnResponse = await client.request("turn/start", {
          threadId: activeThreadId,
          input: [{ type: "text", text: prompt, text_elements: [] }],
          cwd: process.cwd(),
          approvalPolicy: "never",
          approvalsReviewer: "user",
          model: codexModel() || null,
        });
        activeTurnId = responseTurnId(turnResponse);

        await new Promise<void>((resolve, reject) => {
          const poll = setInterval(() => {
            if (turnCompleted) {
              clearInterval(poll);
              resolve();
            }

            if (codex.exitCode !== null) {
              clearInterval(poll);
              reject(
                new Error(
                  stderrBuffer.trim() ||
                    `codex app-server exited with code ${codex.exitCode}`
                )
              );
            }
          }, 50);
        });
        await pendingEventProcessing;
        finishMessage();
      } finally {
        client.close();
      }
    },
    onError: (error) =>
      error instanceof Error ? error.message : "Codex app-server chat failed.",
    onFinish: async ({ messages: finishedMessages }) => {
      await onFinish?.(finishedMessages);
    },
  }) as ReadableStream<UIMessageChunk>;
}
