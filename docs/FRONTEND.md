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
- Confirm the empty state renders, prompt suggestions populate the composer, and the new-chat icon clears local messages.
- With no API key configured, sending a message should surface the explicit `VOLCENGINE_ACK_API_KEY is empty` error from `/api/chat`.
- With a real key configured, verify streaming assistant text appears without a full page reload.

## Component Boundaries

- `components/chat-shell.tsx` owns local chat UI state and the AI SDK client transport.
- `app/api/chat/route.ts` owns request validation and streaming.
- `lib/volcengine.ts` owns provider configuration and environment variable aliases.

## Styling

- Global CSS tokens live in `app/globals.css`.
- Components use stable dimensions for icon buttons, composer controls, and message containers to avoid layout shifts.
- Cards are limited to repeated prompt and message items; page-level layout remains a full-screen app surface.

## Testing Strategy

Current verification is type-check, build, and manual browser smoke testing. Add browser automation once the first persisted workflow or production deployment target is introduced.
