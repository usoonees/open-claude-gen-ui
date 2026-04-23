# Feature Release Notes

## 2026-04

| Date | Area | User Impact | Change Summary |
| --- | --- | --- | --- |
| 2026-04-23 | Chatbot | The provider picker now supports MiniMax text models with built-in manual model suggestions. | Added a MiniMax OpenAI-compatible provider, wired credential resolution into the shared chat model registry, and documented the new environment variables and supported model defaults. |
| 2026-04-23 | Chatbot | The provider picker now supports DeepSeek models, including both chat and reasoning defaults. | Added a DeepSeek OpenAI-compatible provider, wired server-side model discovery through `/models`, and documented the new environment variables and defaults. |
| 2026-04-21 | Chatbot | New conversations now appear immediately with the raw first prompt, then upgrade to a short AI-generated sidebar title once generation finishes. | Added deferred server-side chat title generation, preserved manual renames, and animated the sidebar title replacement while keeping the first-prompt truncation as the no-inference fallback. |
| 2026-04-21 | Chatbot | Generated widgets can now be downloaded as ZIP archives from the chat. | Added a hover-revealed widget download action beside the assistant message copy action that writes both the raw widget fragment and a standalone wrapped HTML file into a `.zip` archive. |
| 2026-04-20 | Chatbot | Added trusted-mode Claude-style generative UI widgets inside assistant responses. | Added guideline-loading and widget-rendering tools, inline streamed widget rendering, and a widget-to-chat `sendPrompt` bridge behind `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED`. |
| 2026-04-20 | Chatbot | Added per-chat sidebar actions for rename and remove behind a hover menu. | Added a three-dot overflow trigger on saved chats, persisted custom titles, and delete support for stored chat history. |
| 2026-04-20 | Chatbot | Removed the unused `Private` button from the chat header. | Simplified the header by dropping a non-functional control and removing its dead styling. |
| 2026-04-20 | Chatbot | Added hover-to-copy actions on both user prompts and assistant replies. | Added per-message copy buttons with clipboard support, hover/focus visibility, and a transient copied confirmation state. |
| 2026-04-20 | Chatbot | Added a runnable AI chat surface that can be configured for Volcengine ACK/Ark inference. | Added a Next.js App Router chatbot, Vercel AI SDK streaming route, OpenAI-compatible Volcengine provider configuration, and setup docs. |
| 2026-04-08 | Template | Introduced the base harness repository template for future services and products. | Added agent entry docs, execution-plan scaffolding, change-history templates, and docs checks. |
