# Frontend Guide

The repository now includes a single Next.js chat surface.

## Local Commands

- Install dependencies: `pnpm install`
- Run local dev server: `pnpm dev`
- Type-check: `pnpm check`
- Production build: `pnpm build`
- Trusted-mode widgets are enabled by default. Set `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=false` in `.env.local` for an env default, or flip the local override in `Settings`.

Use `corepack prepare pnpm@10.32.1 --activate` if the local `pnpm` version does not match `packageManager`.

## Browser Verification

- Open <http://localhost:3000> after `pnpm dev`.
- `http://127.0.0.1:3000` should also work in dev; `next.config.ts` explicitly allows that origin for Next.js dev resources.
- Confirm the empty state fetches randomized gen-ui-oriented prompt suggestions from `/api/starter-prompts`, renders them smoothly above the composer, and every `New Chat` refreshes that batch while returning the UI to `/` without creating a saved sidebar entry.
- Confirm clicking `New Chat` or pressing `Cmd+K` starts a fresh chat and places keyboard focus in the composer input.
- Confirm clicking either sidebar toggle button or pressing `Cmd+B` collapses and reopens the sidebar without resetting the active chat.
- Confirm the sidebar show/hide transition animates smoothly instead of popping in or out.
- On desktop, confirm the header-level `New Chat` icon only appears after the sidebar is collapsed and sits next to the sidebar toggle instead of on the far right.
- Confirm a conversation URL under `/chat/:id` is only created when the first message or starter prompt is sent.
- Confirm sending the first message or a starter prompt adds that chat to the sidebar immediately, without waiting for a page reload, and that the sidebar first shows the raw first prompt.
- With inference available, confirm that same sidebar row later swaps to a short AI-generated title with a visible transition instead of changing abruptly.
- Confirm the composer shows a single compact model selector below the textarea, and that opening it reveals grouped provider/model choices without moving the send button.
- Confirm the inline picker clearly stays in `Choose model` mode and does not double as the provider-management surface.
- Confirm the model selector search filters the custom popup list only, without showing a separate browser autocomplete panel.
- Confirm the default `Choose model` view only lists visible models for connected providers, hides entries immediately after they are hidden in `Manage Models` even if one was previously selected, still allows a typed custom model id for the current provider, closes after selection, and lets each provider header collapse or expand its model list with a smooth animation.
- Confirm an explicit provider or model change in the picker becomes the browser-local default for future `New Chat` sessions, while simply opening a saved conversation with a different model does not rewrite that default.
- Confirm the inline picker only exposes model search and `Manage Models`; it should no longer show a separate add-provider button in that compact surface.
- Confirm the left-bottom sidebar footer now exposes a `Settings` entry that opens a separate dialog for Tavily web-search configuration, generative-UI widget mode, and model-management shortcuts.
- In `Settings`, confirm users can save a Tavily API key locally without restarting, remove a frontend-saved Tavily key when present, and still see env-backed Tavily configuration summarized without exposing the raw secret.
- In `Settings`, confirm trusted generative UI starts in the `On` state by default, users can toggle it on or off without restarting, and the status text reflects whether the current value came from a saved local override, the environment, or the default fallback.
- Confirm the `Add provider` action inside `Manage Models` opens a separate `Connect provider` dialog, lets users switch to another provider, save an API key from the frontend without restarting the app, and remove a previously saved local key when needed.
- From `Settings`, confirm the `Manage models` shortcut closes the settings dialog and opens the existing `Manage Models` dialog.
- Confirm the picker `Manage Models` action opens a separate dialog instead of reusing the inline picker, clearly explains that it controls visibility rather than active selection, includes the `Add provider` shortcut, lets provider headers collapse or expand smoothly, changes which entries appear back in `Choose model`, keeps shown rows warmer/brighter than the cooler hidden rows without using 3D effects, presents the list in a compact sidebar-like style without nested card wrappers, lets `Sync` refresh a provider's model list when supported, and reuses the last successful sync result after a full page reload until the next explicit refresh.
- Hover a saved sidebar chat and confirm the three-dot trigger appears, opening a menu with `Rename` and `Remove` actions.
- Confirm choosing `Rename` turns the title into an inline editor, then saves on `Enter` or blur, cancels on `Escape`, and persists after a reload even after sending more messages in that chat.
- Confirm choosing `Remove` opens a compact in-app confirmation dialog, then deleting removes the chat from the list and returns the UI to `/` if that chat was currently open.
- With trusted mode turned off in `Settings` or `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=false`, confirm the chat still behaves as a text/tool-only assistant with no widget output.
- With trusted mode enabled, ask for a strongly visual explanation and confirm the assistant first makes an explicit `visualizeReadMe` call in `Thinking`, then later streams an inline widget card while the `showWidget` tool input is still arriving.
- Confirm the trusted-mode reminder that nudges widget usage is server-only: it should influence tool choice, but it must not render in the chat UI or appear in saved user message text after reload.
- When an assistant turn eventually calls `showWidget`, confirm any earlier assistant prose in that same turn stays inside `Thinking` alongside reasoning and tool events instead of rendering in the main message body before the widget; only text that arrives after the first widget should render below it as normal assistant content.
- With trusted mode enabled, ask for several different visual tasks and confirm the assistant tends to prioritize richer gen-ui widgets over plain text when a widget would help, and that the resulting widgets are not all the same generic card pattern.
- While a trusted-mode widget is still streaming, confirm its required `loadingMessages` input renders as a compact in-flow status line directly below the widget content, does not overlap the widget itself, and rotates slowly enough to read with a subtle trailing ellipsis.
- Confirm trusted-mode widgets resolve the documented `--color-*`, `--font-*`, and `--border-radius-*` design tokens in the live chat view, not only in downloaded HTML.
- For trusted-mode widgets that load external CDN scripts, confirm named `onload` callbacks such as `initChart()` or `initCalculator()` still initialize inside the widget host without throwing global-scope errors.
- For trusted-mode widgets that combine a CDN script with a later inline classic script, confirm saved chart conversations still initialize after a hard reload in Next.js dev mode, without `initChart is not defined` or similar callback-race errors.
- For trusted-mode widgets that use inline DOM event attributes such as `onclick="switchTab('...')"`, confirm the saved conversation still switches tabs after reload without `... is not defined` errors and that handler queries stay scoped to that widget host.
- If a trusted-mode widget ships malformed inline JavaScript, confirm the widget shows a local inline runtime error message and the rest of the chat UI stays usable instead of crashing the page.
- For trusted-mode widgets that summarize complex prompts, confirm they include enough concrete information to be useful on their own, such as labels, grouped facts, comparisons, statuses, or multiple meaningful sections instead of a sparse shell.
- Confirm the final widget becomes interactive only after the tool input completes, rather than during partial HTML streaming.
- Confirm a generated widget can call `sendPrompt(...)` and create a new user turn in the same chat.
- Confirm a generated widget can call `openLink(...)`, and that widget `<a href>` links also open in a new browser tab without navigating the chat surface away.
- When an assistant response contains a completed gen-ui widget, confirm the widget fills the assistant message content width instead of applying a model-supplied width cap or root wrapper padding; while that assistant turn is still streaming, confirm no copy or download actions are shown; after the turn finishes, hover or focus the message and confirm the action hints read `Copy widget HTML` and `Download widget HTML`; download a widget ZIP and confirm `final-widget.html` does not depend on any model-supplied height hint.
- If a `showWidget` render finishes before final assistant text starts, confirm the `Thinking` block stays collapsed while the live post-widget reasoning markdown also streams below the widget in a muted italic style, a dot-only loading indicator stays visible below that in-flight content until the assistant turn finishes, and the reasoning preview disappears as soon as final assistant text begins rendering.
- If a completed widget turn never emits any final assistant `text` parts, confirm the saved and reloaded chat still renders the finished post-widget reasoning as normal markdown content below the widget instead of leaving the assistant response visually empty after the widget.
- Inspect a saved `.data/chats/*.json` file after chatting and confirm it contains both `messages` and a `modelSelection` object, that assistant messages include per-message `metadata.modelId`, and that the file also contains a `trace` object with `systemPrompt`, `tools`, `capturedAt`, and `modelSelection`.
- Inspect `.data/preferences/chat-model-picker.json` after hiding or showing models and confirm it contains the latest `hiddenModelKeys` list.
- With no key configured for the currently selected provider, sending a message should surface the explicit provider-specific missing-key error from `/api/chat`.
- With a real key configured, verify streaming assistant text appears without a full page reload and any `Thinking` block stays open while reasoning and tool activity are the only visible assistant feedback, stays open after completed tool results if no assistant output is visible yet, then smoothly auto-collapses once visible assistant output exists while remaining manually expandable.
- Change models between assistant turns and verify each assistant message label reads `Assistant(model_name)` for the model that generated that specific turn, instead of reflecting only the current picker selection.
- While a real response is still generating and no `showWidget` loading message is active, verify a dot-only loading indicator remains visible for the full in-flight assistant turn: directly under `Thinking` before any visible output exists, then at the bottom of the visible assistant content until the stream ends.
- While a real response is streaming, verify the message pane follows the newest assistant output even when the transcript first grows taller than the viewport, then stops only after the user scrolls away and resumes only after the user scrolls back near the bottom or sends another message.
- When the assistant uses tools, verify both the in-flight tool call and the completed tool result render inside the `Thinking` block in message-part order instead of as a separate section above it.
- Confirm plain reasoning content inside `Thinking` renders as raw text with preserved line breaks instead of Markdown formatting, while tool calls in that same block keep their structured card UI.
- When a tool call fails, verify the `Thinking` block shows the detailed server-side failure reason, such as the Tavily request status or network cause, instead of a generic `fetch failed` placeholder.
- Tool badges in the `Thinking` block should render canonical camelCase names, including `tavilySearch`, `visualizeReadMe`, and `showWidget`, without uppercase text transform or inserted spaces.
- When trusted-mode generation calls `visualizeReadMe`, verify the `Thinking` block renders an explicit visible one-line tool call that shows just the module names, such as `Diagram, Interactive`, before any `showWidget` call, and keeps the large guideline output hidden from the chat UI.
- Hover or focus a user or assistant message and verify the inline `Copy` action appears and copies that message's rendered text.

## Component Boundaries

- `components/chat-shell.tsx` owns local chat UI state, draft-chat URL behavior, and the AI SDK client transport.
- `components/generative-widget.tsx` owns inline generative widget rendering, streamed DOM patching, and final script execution.
- `app/api/chat/route.ts` owns request validation and streaming.
- `app/api/chat/providers/route.ts` owns provider metadata plus frontend API-key save/remove flows, and `app/api/chat/models/route.ts` owns server-side model-list discovery plus persisted sync caching.
- `app/api/chat/settings/route.ts` owns Tavily web-search key save/remove flows and settings metadata used by the sidebar footer dialog.
- `app/api/chat/preferences/route.ts` owns persisted model-picker visibility preferences.
- `app/api/starter-prompts/route.ts` owns empty-state starter prompt recommendations, backed by `lib/starter-prompts.ts`.
- `lib/chat-title.ts` owns server-side placeholder-title detection and background AI title resolution.
- `lib/chat-models.ts` owns multi-provider registration, default selections, and provider-specific model-list fetchers.
- `lib/deepseek.ts` owns DeepSeek-specific provider configuration.
- `lib/minimax.ts` owns MiniMax-specific provider configuration.
- `lib/openrouter.ts` owns OpenRouter-specific provider configuration.
- `lib/volcengine.ts` owns Volcengine-specific provider configuration and environment variable aliases.
- `lib/volcengine-coding.ts` owns Volcengine coding-specific provider configuration and environment variable aliases.

## Styling

- Global CSS tokens live in `app/globals.css`.
- Components use stable dimensions for icon buttons, composer controls, and message containers to avoid layout shifts.
- Cards are limited to repeated prompt and message items; page-level layout remains a full-screen app surface.
- Model, provider, and management surfaces should use solid fills and avoid gradients.
- These controls should stay visually flat. Do not introduce bevels, stacked shadows, inset highlights, or other fake-3D styling.
- Provider/setup and management dialogs should stay in the same white surface family rather than using different tinted modal backgrounds.
- The sidebar footer settings launcher should feel like a native part of the navigation rail, not a detached utility badge.
- In-app confirmation dialogs such as `Remove` for a chat should also stay on that same plain white dialog surface family.
- The inline model picker should feel lighter and attached to the composer, while provider/setup dialogs and management dialogs should feel distinct through layout and hierarchy rather than elevation tricks.
- The `Manage Models` dialog should stay compact and list-driven: provider sections read like grouped sidebar rows, not like a stack of nested cards.
- Shown model rows should read as warmer and brighter; hidden rows should read as cooler and quieter.
- Trusted-mode widget HTML renders inside an isolated shadow-root host. The host still exposes the documented widget design tokens, SVG helper classes (`t`, `ts`, `th`, `box`, `arr`, `leader`, `node`, and `c-*` ramps), but generated widget CSS and DOM queries must remain confined to that widget host and must not affect the surrounding chat UI.
- Before trusted-mode widget scripts are mounted into the live DOM, external `src`, inline classic-script execution, and non-script inline event attributes are made inert. The widget runtime then replays allowed external scripts, executes inline classic scripts in widget scope, and rebinds inline event handlers against that same per-widget scope, including handlers inserted later by widget-side `innerHTML` rerenders, so React dev-mode effect replays and CDN callback ordering do not reintroduce global-scope or race-condition failures.

## Testing Strategy

Current verification is type-check, build, and manual browser smoke testing. Add browser automation once the first persisted workflow or production deployment target is introduced.
