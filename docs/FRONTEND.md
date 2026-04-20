# Frontend Guide

The repository now includes a single Next.js chat surface.

## Local Commands

- Install dependencies: `pnpm install`
- Run local dev server: `pnpm dev`
- Type-check: `pnpm check`
- Production build: `pnpm build`

Use `corepack prepare pnpm@10.32.1 --activate` if the local `pnpm` version does not match `packageManager`.

## Browser Verification

- Open <http://localhost:3000> after `pnpm dev`.
- Confirm the empty state renders, prompt suggestions populate the composer, and `New Chat` returns the UI to `/` without creating a saved sidebar entry.
- Confirm clicking `New Chat` or pressing `Cmd+K` starts a fresh chat and places keyboard focus in the composer input.
- Confirm a conversation URL under `/chat/:id` is only created when the first message or starter prompt is sent.
- With no API key configured, sending a message should surface the explicit `VOLCENGINE_ACK_API_KEY is empty` error from `/api/chat`.
- With a real key configured, verify streaming assistant text appears without a full page reload and any `Thinking` block stays open while reasoning or tool activity is still running, then auto-collapses when that activity finishes while remaining manually expandable.
- When the assistant uses tools, verify both the in-flight tool call and the completed tool result render inside the `Thinking` block in message-part order instead of as a separate section above it.
- Hover or focus a user or assistant message and verify the inline `Copy` action appears and copies that message's rendered text.

## Component Boundaries

- `components/chat-shell.tsx` owns local chat UI state, draft-chat URL behavior, and the AI SDK client transport.
- `app/api/chat/route.ts` owns request validation and streaming.
- `lib/volcengine.ts` owns provider configuration and environment variable aliases.

## Styling

- Global CSS tokens live in `app/globals.css`.
- Components use stable dimensions for icon buttons, composer controls, and message containers to avoid layout shifts.
- Cards are limited to repeated prompt and message items; page-level layout remains a full-screen app surface.

## Testing Strategy

Current verification is type-check, build, and manual browser smoke testing. Add browser automation once the first persisted workflow or production deployment target is introduced.
