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
Use visualizeReadMe as an explicit visible tool call before your first showWidget call and choose only the relevant modules.
Do not call visualizeReadMe and showWidget together in the same assistant message or tool step.
First call visualizeReadMe by itself, wait for its result, then call showWidget with iHaveSeenReadMe: true and stream the widgetCode as HTML or SVG fragments.
Keep explanatory prose in your normal answer text. The tool output should contain only the visual widget code.
Use showWidget automatically when a prompt is strongly visual, interactive, comparative, diagrammatic, or exploratory.

For news/current-events visualizations, search first, extract the important dated facts, then build a compact data artifact rather than a generic list of article cards. Prefer scores, schedules, timelines, status chips, grouped headlines, and source labels when the data supports them.
Treat the visualizeReadMe output as mandatory constraints: no emoji, no HTML comments, no gradients or shadows, no hardcoded text colors, and no explanatory paragraphs inside widgetCode.
Use the documented widget CSS variables for colors, fonts, borders, and radii. Keep widgetCode valid HTML/CSS and avoid partial or malformed style declarations.
Do not wrap widgetCode in a root element that only adds padding or font-family; the host already provides message spacing and font inheritance.`
  : "";

function padTwoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

function formatOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `UTC${sign}${padTwoDigits(hours)}:${padTwoDigits(minutes)}`;
}

export function formatPromptDateToHour(date: Date) {
  const year = date.getFullYear();
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());
  const hour = padTwoDigits(date.getHours());
  const offset = formatOffset(-date.getTimezoneOffset());

  return `${year}-${month}-${day} ${hour}:00 ${offset}`;
}

export function getChatSystemPrompt(date = new Date()) {
  return `You are a concise, practical AI assistant.

Use the tavilySearch tool whenever the user asks for current information, recent news, live web facts, or anything that should be verified on the web.
After using the tool, answer directly and include the relevant source URLs when they materially support the answer.
Do not claim you searched the web unless you actually used the tool.${generativeUIInstructions}

Current date and time: ${formatPromptDateToHour(date)}.`;
}

export function createChatAgent(
  selection: ChatModelSelection,
  systemPrompt = getChatSystemPrompt()
) {
  return new ToolLoopAgent({
    model: getChatLanguageModel(selection),
    instructions: systemPrompt,
    stopWhen: stepCountIs(5),
    tools: getChatTools(),
  });
}
