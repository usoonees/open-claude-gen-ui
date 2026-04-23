import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const exampleConfigs = [
  {
    slug: "rag",
    sourceChatId: "52c3a471-34ef-40f8-a2ff-e0268c651104",
    title: "RAG vs fine-tuning vs prompt engineering",
    description:
      "A visual tradeoff map comparing setup cost, latency, control, freshness, and maintenance burden.",
  },
  {
    slug: "ai-news",
    sourceChatId: "b18b0317-52cb-491c-9275-4feff9c14ae2",
    title: "AI news snapshot",
    description:
      "A dated AI news example that mixes web search trace cards with a compact generated widget.",
  },
  {
    slug: "chart",
    sourceChatId: "5e27954c-9ce9-4185-a939-d7f27876aa47",
    title: "Data-story chart",
    description:
      "A chart-forward generative UI example with explanatory follow-up text around the visual.",
  },
  {
    slug: "svg",
    sourceChatId: "f73be67f-6f84-4dc8-b69c-a6f5c7ef74c2",
    title: "SVG systems diagram",
    description:
      "An SVG architecture walkthrough showing how a database query moves through a backend pipeline.",
  },
  {
    slug: "nba",
    sourceChatId: "7d75f9e3-51bd-426a-8a39-d147d798d883",
    title: "NBA news board",
    description:
      "A current-events sports example that preserves sourced tool traces plus the final visual summary.",
  },
  {
    slug: "roadmap",
    sourceChatId: "25d4c6bf-f005-43ed-becf-2c82cb1ad6c1",
    title: "Full-stack TypeScript roadmap",
    description:
      "An interactive roadmap widget that stays locally interactive while the surrounding chat stays read-only.",
  },
];

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, ".data", "chats");
const outputDir = path.join(rootDir, "lib", "example-chats", "data");

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeToolResults(results) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.flatMap((result) => {
    if (!isRecord(result) || typeof result.url !== "string") {
      return [];
    }

    return [
      {
        title: typeof result.title === "string" ? result.title : result.url,
        url: result.url,
      },
    ];
  });
}

function sanitizeToolPart(part) {
  if (!isRecord(part) || typeof part.type !== "string") {
    return part;
  }

  if (part.type === "tool-showWidget") {
    return {
      type: part.type,
      toolCallId: typeof part.toolCallId === "string" ? part.toolCallId : "",
      state: part.state,
      input: isRecord(part.input)
        ? {
            iHaveSeenReadMe: Boolean(part.input.iHaveSeenReadMe),
            title:
              typeof part.input.title === "string" ? part.input.title : "widget",
            loadingMessages: Array.isArray(part.input.loadingMessages)
              ? part.input.loadingMessages.filter(
                  (value) => typeof value === "string"
                )
              : [],
            widgetCode:
              typeof part.input.widgetCode === "string"
                ? part.input.widgetCode
                : "",
          }
        : undefined,
      output: isRecord(part.output)
        ? {
            rendered: part.output.rendered === true,
            title:
              typeof part.output.title === "string" ? part.output.title : undefined,
          }
        : undefined,
      errorText: typeof part.errorText === "string" ? part.errorText : undefined,
    };
  }

  if (part.type === "tool-visualizeReadMe") {
    return {
      type: part.type,
      toolCallId: typeof part.toolCallId === "string" ? part.toolCallId : "",
      state: part.state,
      input: isRecord(part.input)
        ? {
            modules: Array.isArray(part.input.modules)
              ? part.input.modules.filter((value) => typeof value === "string")
              : [],
          }
        : undefined,
      output: isRecord(part.output)
        ? {
            modules: Array.isArray(part.output.modules)
              ? part.output.modules.filter((value) => typeof value === "string")
              : [],
          }
        : undefined,
      errorText: typeof part.errorText === "string" ? part.errorText : undefined,
    };
  }

  if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
    const output = isRecord(part.output) ? part.output : null;

    return {
      type: part.type,
      toolName: typeof part.toolName === "string" ? part.toolName : undefined,
      toolCallId: typeof part.toolCallId === "string" ? part.toolCallId : "",
      state: part.state,
      input: isRecord(part.input) ? part.input : undefined,
      output: output
        ? {
            query: typeof output.query === "string" ? output.query : undefined,
            results: sanitizeToolResults(output.results),
          }
        : undefined,
      errorText: typeof part.errorText === "string" ? part.errorText : undefined,
      approval: isRecord(part.approval)
        ? {
            approved: part.approval.approved === true,
          }
        : undefined,
    };
  }

  return part;
}

function sanitizeMessage(message) {
  if (!isRecord(message)) {
    return message;
  }

  return {
    id: typeof message.id === "string" ? message.id : "",
    role: message.role,
    metadata: isRecord(message.metadata)
      ? {
          modelId:
            typeof message.metadata.modelId === "string"
              ? message.metadata.modelId
              : undefined,
        }
      : undefined,
    parts: Array.isArray(message.parts)
      ? message.parts.map((part) => sanitizeToolPart(part))
      : [],
  };
}

function sanitizeModelSelection(selection) {
  if (!isRecord(selection)) {
    return null;
  }

  return {
    providerId:
      typeof selection.providerId === "string" ? selection.providerId : "",
    modelId: typeof selection.modelId === "string" ? selection.modelId : "",
  };
}

async function exportExamples() {
  await mkdir(outputDir, { recursive: true });

  for (const config of exampleConfigs) {
    const sourcePath = path.join(
      sourceDir,
      `${encodeURIComponent(config.sourceChatId)}.json`
    );
    const raw = await readFile(sourcePath, "utf8");
    const storedChat = JSON.parse(raw);
    const snapshot = {
      slug: config.slug,
      sourceChatId: config.sourceChatId,
      title: config.title,
      description: config.description,
      updatedAt:
        typeof storedChat.updatedAt === "string"
          ? storedChat.updatedAt
          : new Date(0).toISOString(),
      modelSelection: sanitizeModelSelection(storedChat.modelSelection),
      modelId:
        isRecord(storedChat.modelSelection) &&
        typeof storedChat.modelSelection.modelId === "string"
          ? storedChat.modelSelection.modelId
          : null,
      messages: Array.isArray(storedChat.messages)
        ? storedChat.messages.map((message) => sanitizeMessage(message))
        : [],
    };

    const outputPath = path.join(outputDir, `${config.slug}.json`);
    await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  }
}

await exportExamples();
