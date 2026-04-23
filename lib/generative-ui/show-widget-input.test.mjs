import test from "node:test";
import assert from "node:assert/strict";
import { normalizeShowWidgetToolInput } from "./show-widget-input.ts";
import { hasCompletedVisualizeReadMeInModelMessages } from "./show-widget-validation.ts";

test("normalizeShowWidgetToolInput recovers embedded title parameters", () => {
  const normalized = normalizeShowWidgetToolInput({
    "iHaveSeenReadMe</parameter": "\n<parameter=title>nba_news_dashboard",
    loadingMessages: ["Loading NBA headlines..."],
    widgetCode: "<div>widget</div>",
  });

  assert.equal(normalized.title, "nba_news_dashboard");
  assert.deepEqual(normalized.loadingMessages, ["Loading NBA headlines..."]);
  assert.equal(normalized.widgetCode, "<div>widget</div>");
});

test("hasCompletedVisualizeReadMeInModelMessages detects prior tool results", () => {
  const hasCompletedReadMe = hasCompletedVisualizeReadMeInModelMessages([
    {
      role: "user",
      content: [{ type: "text", text: "visualize nba news today" }],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call_readme",
          toolName: "visualizeReadMe",
          output: {
            type: "json",
            value: {
              modules: ["mockup", "interactive"],
            },
          },
        },
      ],
    },
  ]);

  assert.equal(hasCompletedReadMe, true);
});
