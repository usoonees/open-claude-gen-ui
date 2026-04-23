import type { ModelMessage } from "ai";

export const SHOW_WIDGET_REQUIRES_README_ERROR =
  "showWidget requires visualizeReadMe first. Call visualizeReadMe, then retry showWidget with iHaveSeenReadMe: true.";

function hasVisualizeReadMeToolResult(message: ModelMessage) {
  return (
    message.role === "tool" &&
    message.content.some(
      (part) =>
        part.type === "tool-result" && part.toolName === "visualizeReadMe"
    )
  );
}

export function hasCompletedVisualizeReadMeInModelMessages(
  messages: ModelMessage[]
) {
  return messages.some(hasVisualizeReadMeToolResult);
}
