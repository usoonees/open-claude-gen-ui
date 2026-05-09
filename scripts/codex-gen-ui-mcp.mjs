#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const protocolVersion = "2025-06-18";
const moduleNames = ["art", "mockup", "interactive", "chart", "diagram"];

const visualizeReadMeDescription =
  "Load the generative UI design guidelines before the first visual widget. Call this before showWidget.";
const showWidgetDescription =
  "Render compact, valid HTML or SVG as an inline generative UI widget inside the chat.";

const visualizeReadMeInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    modules: {
      type: "array",
      items: { type: "string", enum: moduleNames },
      minItems: 1,
      description: "Choose the guideline module(s) that match the intended widget.",
    },
  },
  required: ["modules"],
};

const showWidgetInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    iHaveSeenReadMe: {
      type: "boolean",
      description:
        "Set to true only after visualizeReadMe has already completed earlier in this conversation.",
    },
    title: {
      type: "string",
      description: "Short snake_case identifier for the widget.",
    },
    loadingMessages: {
      type: "array",
      items: { type: "string" },
      description: "Short progress labels to show while the widget is still streaming.",
    },
    widgetCode: {
      type: "string",
      description:
        "HTML or SVG fragment to render inline. No doctype, html, head, or body tags.",
    },
  },
  required: ["iHaveSeenReadMe", "title", "loadingMessages", "widgetCode"],
};

let inputBuffer = Buffer.alloc(0);

function send(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(body);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function textContent(text) {
  return [{ type: "text", text }];
}

async function readGuidelines(modules) {
  const sourcePath = path.join(repoRoot, "lib", "generative-ui", "reference-guidelines.ts");
  const source = await readFile(sourcePath, "utf8");
  const requested = Array.isArray(modules) && modules.length ? modules : ["diagram"];

  return [
    `Requested modules: ${requested.join(", ")}`,
    "",
    "Use the repository generative UI guidelines below. Follow the selected modules when possible.",
    "",
    source,
  ].join("\n");
}

function normalizeShowWidgetArgs(args) {
  const record = args && typeof args === "object" ? args : {};

  return {
    iHaveSeenReadMe: record.iHaveSeenReadMe === true,
    title: typeof record.title === "string" ? record.title : "widget",
    loadingMessages: Array.isArray(record.loadingMessages)
      ? record.loadingMessages.filter((value) => typeof value === "string")
      : ["Rendering widget"],
    widgetCode: typeof record.widgetCode === "string" ? record.widgetCode : "",
  };
}

async function callTool(name, args) {
  if (name === "visualizeReadMe") {
    return {
      content: textContent(await readGuidelines(args?.modules)),
    };
  }

  if (name === "showWidget") {
    const input = normalizeShowWidgetArgs(args);

    if (!input.iHaveSeenReadMe) {
      return {
        isError: true,
        content: textContent(
          "showWidget requires visualizeReadMe first. Call visualizeReadMe, then retry showWidget with iHaveSeenReadMe: true."
        ),
      };
    }

    if (!input.title || !input.widgetCode.trim() || !input.loadingMessages.length) {
      return {
        isError: true,
        content: textContent("showWidget requires title, loadingMessages, and widgetCode."),
      };
    }

    return {
      content: textContent(JSON.stringify({ rendered: true, title: input.title })),
    };
  }

  return {
    isError: true,
    content: textContent(`Unknown tool: ${name}`),
  };
}

async function handleMessage(message) {
  if (!message || typeof message !== "object") {
    return;
  }

  const { id, method, params } = message;

  if (method === "initialize") {
    sendResult(id, {
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo: {
        name: "open-claude-gen-ui",
        version: "0.1.0",
      },
    });
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    sendResult(id, {
      tools: [
        {
          name: "visualizeReadMe",
          description: visualizeReadMeDescription,
          inputSchema: visualizeReadMeInputSchema,
        },
        {
          name: "showWidget",
          description: showWidgetDescription,
          inputSchema: showWidgetInputSchema,
        },
      ],
    });
    return;
  }

  if (method === "tools/call") {
    sendResult(id, await callTool(params?.name, params?.arguments ?? {}));
    return;
  }

  if (id !== undefined) {
    sendError(id, -32601, `Method not found: ${method}`);
  }
}

function tryReadMessage() {
  const headerEnd = inputBuffer.indexOf("\r\n\r\n");

  if (headerEnd < 0) {
    return false;
  }

  const header = inputBuffer.slice(0, headerEnd).toString("utf8");
  const lengthMatch = /^Content-Length:\s*(\d+)$/im.exec(header);

  if (!lengthMatch) {
    inputBuffer = Buffer.alloc(0);
    return false;
  }

  const contentLength = Number(lengthMatch[1]);
  const bodyStart = headerEnd + 4;
  const bodyEnd = bodyStart + contentLength;

  if (inputBuffer.length < bodyEnd) {
    return false;
  }

  const body = inputBuffer.slice(bodyStart, bodyEnd).toString("utf8");
  inputBuffer = inputBuffer.slice(bodyEnd);

  try {
    void handleMessage(JSON.parse(body));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  }

  return true;
}

process.stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);

  while (tryReadMessage()) {
    // Drain all complete frames.
  }
});
