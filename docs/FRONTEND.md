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
- Confirm the empty state renders, prompt suggestions populate the composer, and `New Chat` returns the UI to `/` without creating a saved sidebar entry.
- Confirm clicking `New Chat` or pressing `Cmd+K` starts a fresh chat and places keyboard focus in the composer input.
- Confirm clicking either sidebar toggle button or pressing `Cmd+B` collapses and reopens the sidebar without resetting the active chat.
- Confirm the sidebar show/hide transition animates smoothly instead of popping in or out.
- Confirm a conversation URL under `/chat/:id` is only created when the first message or starter prompt is sent.
- Confirm sending the first message or a starter prompt adds that chat to the sidebar immediately, without waiting for a page reload, and that the sidebar first shows the raw first prompt.
- With inference available, confirm that same sidebar row later swaps to a short AI-generated title with a visible transition instead of changing abruptly.
- Hover a saved sidebar chat and confirm the three-dot trigger appears, opening a menu with `Rename` and `Remove` actions.
- Confirm choosing `Rename` turns the title into an inline editor, then saves on `Enter` or blur, cancels on `Escape`, and persists after a reload even after sending more messages in that chat.
- Confirm choosing `Remove` opens a compact in-app confirmation dialog, then deleting removes the chat from the list and returns the UI to `/` if that chat was currently open.
- With `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=false`, confirm the chat still behaves as a text/tool-only assistant with no widget output.
- With `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true`, ask for a strongly visual explanation and confirm the assistant streams an inline widget card while the `showWidget` tool input is still arriving.
- Confirm trusted-mode widgets resolve the documented `--color-*`, `--font-*`, and `--border-radius-*` design tokens in the live chat view, not only in downloaded HTML.
- Confirm the final widget becomes interactive only after the tool input completes, rather than during partial HTML streaming.
- Confirm a generated widget can call `sendPrompt(...)` and create a new user turn in the same chat.
- When an assistant response contains a completed gen-ui widget, confirm the widget fills the assistant message content width instead of applying a model-supplied width cap or root wrapper padding; hover or focus the message and confirm the download action appears beside `Copy`; download a widget ZIP and confirm `final-widget.html` preserves the same minimum height as the inline chat widget.
- Inspect a saved `.data/chats/*.json` file after chatting and confirm it contains both `messages` and a `trace` object with `systemPrompt`, `tools`, and `capturedAt`.
- With no API key configured, sending a message should surface the explicit `VOLCENGINE_ACK_API_KEY is empty` error from `/api/chat`.
- With a real key configured, verify streaming assistant text appears without a full page reload and any `Thinking` block stays open while reasoning and tool activity are the only visible assistant feedback, stays open after completed tool results if no assistant output is visible yet, then smoothly auto-collapses once visible assistant output exists while remaining manually expandable.
- While a real response is streaming, verify the message pane follows the newest assistant output until the user scrolls away, then resumes only after the user scrolls back near the bottom or sends another message.
- When the assistant uses tools, verify both the in-flight tool call and the completed tool result render inside the `Thinking` block in message-part order instead of as a separate section above it.
- When trusted-mode generation calls `visualizeReadMe`, verify the `Thinking` block renders the tool name and input JSON only, with the large guideline output hidden from the chat UI.
- Hover or focus a user or assistant message and verify the inline `Copy` action appears and copies that message's rendered text.

## Component Boundaries

- `components/chat-shell.tsx` owns local chat UI state, draft-chat URL behavior, and the AI SDK client transport.
- `components/generative-widget.tsx` owns inline generative widget rendering, streamed DOM patching, and final script execution.
- `app/api/chat/route.ts` owns request validation and streaming.
- `lib/chat-title.ts` owns server-side placeholder-title detection and background AI title resolution.
- `lib/volcengine.ts` owns provider configuration and environment variable aliases.

## Styling

- Global CSS tokens live in `app/globals.css`.
- Components use stable dimensions for icon buttons, composer controls, and message containers to avoid layout shifts.
- Cards are limited to repeated prompt and message items; page-level layout remains a full-screen app surface.
- Trusted-mode widget HTML renders in the same document. The host exposes the documented widget design tokens and resets global SVG defaults inside `.widget-host`, while generated widget styling should stay scoped and visually polite.

## Testing Strategy

Current verification is type-check, build, and manual browser smoke testing. Add browser automation once the first persisted workflow or production deployment target is introduced.
