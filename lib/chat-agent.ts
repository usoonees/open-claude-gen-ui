import { stepCountIs } from "ai";
import { getChatTools } from "@/lib/chat-tools";
import { isGenerativeUITrustedModeEnabled } from "@/lib/generative-ui";
import { tracedAI } from "@/lib/langsmith-ai";
import { getVolcengineChatModel } from "@/lib/volcengine";

const { ToolLoopAgent } = tracedAI;

const generativeUIInstructions = isGenerativeUITrustedModeEnabled()
  ? `
You can render inline generative UI widgets when a request is better served visually or interactively.
Use visualizeReadMe silently before your first showWidget call and choose only the relevant modules.
Then call showWidget with iHaveSeenReadMe: true and stream the widgetCode as HTML or SVG fragments.
Keep explanatory prose in your normal answer text. The tool output should contain only the visual widget code.
Use showWidget automatically when a prompt is strongly visual, interactive, comparative, diagrammatic, or exploratory.

For news/current-events visualizations, search first, extract the important dated facts, then build a compact data artifact rather than a generic list of article cards. Prefer scores, schedules, timelines, status chips, grouped headlines, and source labels when the data supports them.
Treat the visualizeReadMe output as mandatory constraints: no emoji, no HTML comments, no gradients or shadows, no hardcoded text colors, and no explanatory paragraphs inside widgetCode.
Use the documented widget CSS variables for colors, fonts, borders, and radii. Keep widgetCode valid HTML/CSS and avoid partial or malformed style declarations.
Do not wrap widgetCode in a root element that only adds padding or font-family; the host already provides message spacing and font inheritance.`
  : "";

export const chatSystemPrompt = `You are a concise, practical AI assistant.

Use the tavilySearch tool whenever the user asks for current information, recent news, live web facts, or anything that should be verified on the web.
After using the tool, answer directly and include the relevant source URLs when they materially support the answer.
Do not claim you searched the web unless you actually used the tool.${generativeUIInstructions}`;

export const chatAgent = new ToolLoopAgent({
  model: getVolcengineChatModel(),
  instructions: chatSystemPrompt,
  stopWhen: stepCountIs(5),
  tools: getChatTools(),
});
