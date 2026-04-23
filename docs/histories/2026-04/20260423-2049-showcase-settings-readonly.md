## [2026-04-23 20:49] | Task: make showcase settings viewable and compact

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js app router workspace`

### User Query

> when SHOWCASE_ONLY=true, disable the chat inputbox, when mouse hover, there is a forbidden mouse icon.
>
> for settings, user can click it in SHOWCASE_ONLY mode, but after clicking settings, there is also a github link.
>
> now, the settings view is exceeding the height of my small mac 14in, you can make a screenshot to check it, and make the settings more compacted
>
> rm descriptions in settings like:
>
> Turn widgets off here to keep replies in text-and-tool mode.
>
> Saved locally. Generative UI widgets are enabled.
>
> Tavily powers live web search. Saved keys stay local and work without restart.
>
> Open model management to show or hide models and connect providers.
>
> just compacted title, no such descriptions

### Changes Overview

- Area: showcase-mode chat shell and settings dialog UX
- Key actions:
  - Disabled the showcase composer textarea itself and styled it with a `not-allowed` cursor so the read-only state is visible before users try to send.
  - Allowed the sidebar `Settings` entry to open in showcase mode while keeping write actions disabled.
  - Added a read-only showcase note plus a GitHub source link inside the settings dialog.
  - Reduced settings dialog spacing, bounded it to viewport height, and enabled internal scrolling so it fits shorter laptop screens more reliably.
  - Removed the static settings helper paragraphs, status-summary copy, and widget switch caption so each settings card reads as a compact title-plus-control block.
  - Updated the frontend verification guide to document the new showcase expectations.

### Design Intent

Showcase mode should still let visitors inspect configuration and discover the source repository, but it should not invite edits that the deployment cannot persist. The dialog now behaves like a readable project-info surface in showcase mode, while the tighter spacing, viewport-bounded scrolling, and title-only settings cards keep it usable on smaller displays without changing the rest of the chat shell.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260423-2049-showcase-settings-readonly.md`
