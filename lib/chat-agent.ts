import { stepCountIs } from "ai";
import type { ChatModelSelection } from "@/lib/chat-model-config";
import { getChatLanguageModel } from "@/lib/chat-models";
import { getChatTools } from "@/lib/chat-tools";
import { isGenerativeUITrustedModeEnabled } from "@/lib/generative-ui";
import { tracedAI } from "@/lib/langsmith-ai";

const { ToolLoopAgent } = tracedAI;

const generativeUIInstructions = isGenerativeUITrustedModeEnabled()
  ? `
You can render inline generative UI widgets when a request is better served visually or interactively.
Generative UI widget generation is a primary strength of this assistant and should be treated as especially important work.
Use visualizeReadMe as an explicit visible tool call before your first showWidget call and choose only the relevant modules.
Do not call visualizeReadMe and showWidget together in the same assistant message or tool step.
First call visualizeReadMe by itself, wait for its result, then call showWidget with iHaveSeenReadMe: true and stream the widgetCode as HTML or SVG fragments.
Keep explanatory prose out of widgetCode; keep it in your normal answer text. The tool output should contain only the visual widget code.
After any showWidget call, finish the same assistant turn with normal visible answer text for the user. Do not end the turn with reasoning only, and do not leave the final summary solely inside the reasoning channel.
Use showWidget automatically when a prompt is strongly visual, interactive, comparative, diagrammatic, or exploratory.
When a widget is warranted, prefer ambitious, information-rich results over safe minimal shells. Pack in enough structure, labels, states, comparisons, data points, and interaction hooks that the widget feels genuinely useful.
Aim for diversity in layout and presentation. Avoid repeating the same generic card/list treatment when a timeline, score grid, mini-dashboard, diagram, map-like structure, ranked board, or other more distinctive format would fit better.
Try to surprise the user with an unusually strong widget experience while still staying accurate, legible, and within the documented constraints.

For news/current-events visualizations, search first, extract the important dated facts, then build a compact data artifact rather than a generic list of article cards. Prefer scores, schedules, timelines, status chips, grouped headlines, and source labels when the data supports them.
Treat the visualizeReadMe output as mandatory constraints: no emoji, no HTML comments, no gradients or shadows, no hardcoded text colors, and no explanatory paragraphs inside widgetCode.
Use the documented widget CSS variables for colors, fonts, borders, and radii. Keep widgetCode valid HTML/CSS and avoid partial or malformed style declarations.
Do not wrap widgetCode in a root element that only adds padding or font-family; the host already provides message spacing and font inheritance.`
  : "";

type PromptTimeZoneReference = {
  label: string;
  timeZone: string;
};

const promptTimeZoneReferences: PromptTimeZoneReference[] = [
  { label: "China", timeZone: "Asia/Shanghai" },
  { label: "United States Pacific", timeZone: "America/Los_Angeles" },
  { label: "United States Eastern", timeZone: "America/New_York" },
];

function getPromptDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  return {
    year: parts.find(({ type }) => type === "year")?.value ?? "0000",
    month: parts.find(({ type }) => type === "month")?.value ?? "00",
    day: parts.find(({ type }) => type === "day")?.value ?? "00",
    hour: parts.find(({ type }) => type === "hour")?.value ?? "00",
    minute: parts.find(({ type }) => type === "minute")?.value ?? "00",
  };
}

function formatTimeZoneOffset(date: Date, timeZone: string) {
  const timeZoneName =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find(({ type }) => type === "timeZoneName")?.value ?? "GMT";

  return timeZoneName === "GMT"
    ? "UTC+00:00"
    : timeZoneName.replace("GMT", "UTC");
}

export function formatPromptDateTimeForZone(date: Date, timeZone: string) {
  const parts = getPromptDateParts(date, timeZone);
  const offset = formatTimeZoneOffset(date, timeZone);

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${offset}`;
}

function getPromptDateLine(date: Date) {
  const references = promptTimeZoneReferences
    .map(
      ({ label, timeZone }) =>
        `${label} (${timeZone}) ${formatPromptDateTimeForZone(date, timeZone)}`
    )
    .join("; ");

  return `Current time references: ${references}.`;
}

export function getChatSystemPrompt(date = new Date()) {
  return `You are a concise, practical AI assistant.

Respond in the same language as the user's latest message unless they explicitly ask you to use a different language.
Use the tavilySearch tool whenever the user asks for current information, recent news, live web facts, or anything that should be verified on the web.
Do not claim you searched the web unless you actually used the tool.
When calling tavilySearch, set country based on the user's language: use "china" for Chinese user messages and "united states" for English user messages unless the user clearly wants a different regional bias. For topic "news", do not rely on country because Tavily only applies it to general search.
Default toward building a generative UI widget when that would make the result clearer, richer, or more memorable for the user.${generativeUIInstructions}
When the user asks for relative-time current-events queries like "today", "latest", "this morning", or "yesterday", resolve them against the relevant region. For China and United States topics, watch for cross-day differences between China time and U.S. time, and name the timezone explicitly when it matters.

${getPromptDateLine(date)}`;
}

export function createChatAgent(
  selection: ChatModelSelection,
  systemPrompt = getChatSystemPrompt()
) {
  return new ToolLoopAgent({
    model: getChatLanguageModel(selection),
    instructions: systemPrompt,
    stopWhen: stepCountIs(6),
    tools: getChatTools(),
  });
}
