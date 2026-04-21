# Frontend Guide

The repository now includes a single Next.js chat surface.

## Local Commands

- Install dependencies: `pnpm install`
- Run local dev server: `pnpm dev`
- Type-check: `pnpm check`
- Production build: `pnpm build`
- Trusted-mode widgets: set `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true` in `.env.local`

Use `corepack prepare pnpm@10.32.1 --activate` if the local `pnpm` version does not match `packageManager`.

## Browser Verification

- Open <http://localhost:3000> after `pnpm dev`.
- Confirm the empty state fetches randomized gen-ui-oriented prompt suggestions from `/api/starter-prompts`, renders them smoothly above the composer, and `New Chat` returns the UI to `/` without creating a saved sidebar entry.
- Confirm clicking `New Chat` or pressing `Cmd+K` starts a fresh chat and places keyboard focus in the composer input.
- Confirm clicking either sidebar toggle button or pressing `Cmd+B` collapses and reopens the sidebar without resetting the active chat.
- Confirm the sidebar show/hide transition animates smoothly instead of popping in or out.
- On desktop, confirm the header-level `New Chat` icon only appears after the sidebar is collapsed and sits next to the sidebar toggle instead of on the far right.
- Confirm a conversation URL under `/chat/:id` is only created when the first message or starter prompt is sent.
- Confirm sending the first message or a starter prompt adds that chat to the sidebar immediately, without waiting for a page reload, and that the sidebar first shows the raw first prompt.
- With inference available, confirm that same sidebar row later swaps to a short AI-generated title with a visible transition instead of changing abruptly.
- Confirm the composer shows a single compact model selector below the textarea, and that opening it reveals grouped provider/model choices without moving the send button.
- Confirm the model selector search filters the custom popup list only, without showing a separate browser autocomplete panel.
- Confirm the picker lets users switch provider/model combinations, type a freeform model id from the inline add panel, and sync the active provider's model list when supported.
- Hover a saved sidebar chat and confirm the three-dot trigger appears, opening a menu with `Rename` and `Remove` actions.
- Confirm choosing `Rename` turns the title into an inline editor, then saves on `Enter` or blur, cancels on `Escape`, and persists after a reload even after sending more messages in that chat.
- Confirm choosing `Remove` opens a compact in-app confirmation dialog, then deleting removes the chat from the list and returns the UI to `/` if that chat was currently open.
- With `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=false`, confirm the chat still behaves as a text/tool-only assistant with no widget output.
- With `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true`, ask for a strongly visual explanation and confirm the assistant first makes an explicit `visualizeReadMe` call in `Thinking`, then later streams an inline widget card while the `showWidget` tool input is still arriving.
- With `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true`, ask for several different visual tasks and confirm the assistant tends to prioritize richer gen-ui widgets over plain text when a widget would help, and that the resulting widgets are not all the same generic card pattern.
- While a trusted-mode widget is still streaming, confirm its required `loadingMessages` input renders as a compact in-flow status line directly below the widget content, does not overlap the widget itself, and rotates slowly enough to read with a subtle trailing ellipsis.
- Confirm trusted-mode widgets resolve the documented `--color-*`, `--font-*`, and `--border-radius-*` design tokens in the live chat view, not only in downloaded HTML.
- For trusted-mode widgets that load external CDN scripts, confirm named `onload` callbacks such as `initChart()` or `initCalculator()` still initialize inside the widget host without throwing global-scope errors.
- For trusted-mode widgets that combine a CDN script with a later inline classic script, confirm saved chart conversations still initialize after a hard reload in Next.js dev mode, without `initChart is not defined` or similar callback-race errors.
- For trusted-mode widgets that use inline DOM event attributes such as `onclick="switchTab('...')"`, confirm the saved conversation still switches tabs after reload without `... is not defined` errors and that handler queries stay scoped to that widget host.
- For trusted-mode widgets that summarize complex prompts, confirm they include enough concrete information to be useful on their own, such as labels, grouped facts, comparisons, statuses, or multiple meaningful sections instead of a sparse shell.
- Confirm the final widget becomes interactive only after the tool input completes, rather than during partial HTML streaming.
- Confirm a generated widget can call `sendPrompt(...)` and create a new user turn in the same chat.
- Confirm a generated widget can call `openLink(...)`, and that widget `<a href>` links also open in a new browser tab without navigating the chat surface away.
- When an assistant response contains a completed gen-ui widget, confirm the widget fills the assistant message content width instead of applying a model-supplied width cap or root wrapper padding; while that assistant turn is still streaming, confirm no copy or download actions are shown; after the turn finishes, hover or focus the message and confirm the action hints read `Copy widget HTML` and `Download widget HTML`; download a widget ZIP and confirm `final-widget.html` does not depend on any model-supplied height hint.
- If a `showWidget` render finishes before final assistant text starts, confirm the `Thinking` block stays collapsed while the live post-widget reasoning markdown also streams below the widget in a muted italic style, a dot-only loading indicator stays visible below that in-flight content until the assistant turn finishes, and the reasoning preview disappears as soon as final assistant text begins rendering.
- Inspect a saved `.data/chats/*.json` file after chatting and confirm it contains both `messages` and a `modelSelection` object, plus a `trace` object with `systemPrompt`, `tools`, `capturedAt`, and `modelSelection`.
- With no key configured for the currently selected provider, sending a message should surface the explicit provider-specific missing-key error from `/api/chat`.
- With a real key configured, verify streaming assistant text appears without a full page reload and any `Thinking` block stays open while reasoning and tool activity are the only visible assistant feedback, stays open after completed tool results if no assistant output is visible yet, then smoothly auto-collapses once visible assistant output exists while remaining manually expandable.
- While a real response is still generating and no `showWidget` loading message is active, verify a dot-only loading indicator remains visible for the full in-flight assistant turn: directly under `Thinking` before any visible output exists, then at the bottom of the visible assistant content until the stream ends.
- While a real response is streaming, verify the message pane follows the newest assistant output until the user scrolls away, then resumes only after the user scrolls back near the bottom or sends another message.
- When the assistant uses tools, verify both the in-flight tool call and the completed tool result render inside the `Thinking` block in message-part order instead of as a separate section above it.
- Tool badges in the `Thinking` block should render canonical camelCase names, including `tavilySearch`, `visualizeReadMe`, and `showWidget`, without uppercase text transform or inserted spaces.
- When trusted-mode generation calls `visualizeReadMe`, verify the `Thinking` block renders an explicit visible one-line tool call that shows just the module names, such as `Diagram, Interactive`, before any `showWidget` call, and keeps the large guideline output hidden from the chat UI.
- Hover or focus a user or assistant message and verify the inline `Copy` action appears and copies that message's rendered text.

## Component Boundaries

- `components/chat-shell.tsx` owns local chat UI state, draft-chat URL behavior, and the AI SDK client transport.
- `components/generative-widget.tsx` owns inline generative widget rendering, streamed DOM patching, and final script execution.
- `app/api/chat/route.ts` owns request validation and streaming.
- `app/api/chat/providers/route.ts` and `app/api/chat/models/route.ts` own provider metadata and server-side model-list discovery.
- `app/api/starter-prompts/route.ts` owns empty-state starter prompt recommendations, backed by `lib/starter-prompts.ts`.
- `lib/chat-title.ts` owns server-side placeholder-title detection and background AI title resolution.
- `lib/chat-models.ts` owns multi-provider registration, default selections, and provider-specific model-list fetchers.
- `lib/volcengine.ts` owns Volcengine-specific provider configuration and environment variable aliases.

## Styling

- Global CSS tokens live in `app/globals.css`.
- Components use stable dimensions for icon buttons, composer controls, and message containers to avoid layout shifts.
- Cards are limited to repeated prompt and message items; page-level layout remains a full-screen app surface.
- Trusted-mode widget HTML renders inside an isolated shadow-root host. The host still exposes the documented widget design tokens, SVG helper classes (`t`, `ts`, `th`, `box`, `arr`, `leader`, `node`, and `c-*` ramps), but generated widget CSS and DOM queries must remain confined to that widget host and must not affect the surrounding chat UI.
- Before trusted-mode widget scripts are mounted into the live DOM, external `src`, inline classic-script execution, and non-script inline event attributes are made inert. The widget runtime then replays allowed external scripts, executes inline classic scripts in widget scope, and rebinds inline event handlers against that same per-widget scope so React dev-mode effect replays and CDN callback ordering do not reintroduce global-scope or race-condition failures.

## Testing Strategy

Current verification is type-check, build, and manual browser smoke testing. Add browser automation once the first persisted workflow or production deployment target is introduced.
