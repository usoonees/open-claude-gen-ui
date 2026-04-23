# Agent-Facing Generative UI And Portability Memo

Date: 2026-04-21

## Scope

This memo summarizes external patterns relevant to:

1. `op7418` style generative UI over MCP
2. `open-codex-computer-use` / `open-computer-use` portability patterns
3. The best split for cross-agent adoption: `MCP` only, `MCP + streaming HTML engine SDK`, or another architecture

## External Signals

### 1. MCP Apps has become the interoperable UI baseline

- MCP Apps standardizes the pattern where a tool declares `_meta.ui.resourceUri`, the host fetches a `ui://` HTML resource, renders it in a sandboxed iframe, and the app talks back over a `ui/` JSON-RPC channel.
- The client advertises support through capabilities that include `text/html;profile=mcp-app`.
- The spec already covers security-critical fields such as `_meta.ui.csp`, `_meta.ui.domain`, `permissions`, and host-side sandboxing expectations.

Implication: if the goal is "works across multiple agents and hosts," MCP Apps is the closest thing to a portable contract today.

### 2. The strongest portability examples keep MCP as the stable contract and add thin host adapters

- `mcp-ui` explicitly positions itself as an SDK implementing the MCP Apps standard, while also supporting legacy hosts and an Apps SDK adapter for ChatGPT-style environments.
- Its pattern is notable because it does not replace the protocol; it translates host-specific APIs into the same widget contract.

Implication: portability comes from a stable wire contract plus adapters, not from picking a single host runtime and expecting everyone else to conform.

### 3. FastMCP's Generative UI shows why MCP alone is not enough for the best live UX

- FastMCP's generative UI provider registers a generative tool, a component-search tool, and a renderer `ui://` resource.
- Its key UX trick is progressive rendering from partial tool input: the host preloads the iframe, streams partial tool arguments through `ontoolinputpartial`, and the browser executes code incrementally before server-side validation replaces the preview.
- This is materially better than waiting for a full tool result, but it depends on a renderer/runtime contract beyond plain "tool returns HTML."

Implication: MCP is sufficient for interoperability, but premium generative UI often needs a rendering engine contract layered on top.

### 4. `open-codex-computer-use` shows a good pattern for agent portability in computer use

- The project exposes computer use over MCP so "any AI agent or MCP client can call it directly."
- It ships multiple host-specific install paths on top of the same server: raw MCP config, Claude installer, Codex installer, and a Codex plugin.
- The Codex plugin metadata says it exposes the same nine desktop-control MCP tools through a locally built app bundle, and explicitly calls out an "AX-first and keyboard-first" strategy that avoids stealing focus until pointer input is required.
- The repo also treats the app bundle identity as a stable OS permission target, and separates dev app identity from release identity.

Implication: the portable layer is the tool surface, while packaging, onboarding, and permission acquisition are host- and OS-specific wrappers.

### 5. `op7418` / CodePilot generative UI is effective but host-bound

- CodePilot's docs describe direct generation of HTML, SVG, and JavaScript widgets rendered inline in-app.
- The security model is a sandboxed iframe, no same-origin access, no network by default, and a small CDN allowlist.
- This is a strong product pattern for a controlled host, but by itself it is not an inter-agent portability layer because the renderer contract is embedded in the app rather than standardized as a cross-host protocol.

Implication: this is a good engine pattern, not by itself a portability standard.

## Architecture Options

### Option A: MCP-only

Shape:

- All visual tools return MCP App resources and standard tool results only.
- No separate renderer SDK.

Pros:

- Highest cross-host reach
- Leverages the emerging standard directly
- Lowest conceptual surface area

Cons:

- Weakest support for progressive, partially rendered generative UI
- Harder to deliver advanced host affordances consistently
- Host quality varies materially today

Best when:

- You optimize first for widest ecosystem compatibility
- Your UI can tolerate full-result rendering instead of progressive rendering

### Option B: MCP + proprietary streaming HTML engine SDK

Shape:

- MCP remains the tool/control protocol.
- A dedicated renderer SDK handles streaming HTML or code, partial-argument execution, sandbox policy, downloads, and link bridges.

Pros:

- Best UX for open-ended generative UI
- Clear place to encode sandboxing, script policy, and progressive rendering
- Easier to deliver a polished first-party host

Cons:

- Adds a second contract to maintain
- Third-party hosts will usually fall back to basic MCP behavior unless they adopt the SDK
- Risk of de facto lock-in if the SDK becomes the only path to a good experience

Best when:

- You control at least one host and care about first-party UX quality
- You want open-ended HTML/SVG/JS widgets, not just declarative components

### Option C: Split model with MCP Apps baseline + optional renderer profile

Shape:

- MCP Apps is the required compatibility layer.
- A second, optional "renderer profile" adds progressive rendering and richer host bridges where supported.
- Unsupported hosts still render final MCP App HTML safely.

Pros:

- Best balance of adoption and UX
- Keeps the portable contract open
- Lets first-party hosts differentiate without forking the ecosystem

Cons:

- More design work up front
- Requires capability negotiation and graceful degradation

Best when:

- You want both cross-agent adoption and a premium first-party experience

## Recommendation

Use **Option C**.

The external pattern is consistent:

- Use **MCP Apps as the baseline contract** for discovery, transport, sandboxed rendering, and tool/UI linkage.
- Add a **small optional renderer profile** for first-party or advanced hosts that support streaming partial inputs, stricter HTML policy enforcement, download/link bridges, and richer widget lifecycle events.
- Do **not** make raw host-specific HTML rendering your primary external interface. That is a product implementation detail, not a portability contract.

## Concrete Interface Recommendations

### 1. Standardize three layers explicitly

1. **Agent tool layer**
   - Stable MCP tool schemas
   - Structured inputs/outputs
   - No host assumptions
2. **Portable UI layer**
   - MCP Apps resources using `text/html;profile=mcp-app`
   - `_meta.ui.resourceUri`, `_meta.ui.csp`, `_meta.ui.domain`, `permissions`, `prefersBorder`
3. **Optional advanced renderer layer**
   - Capability-gated streaming and richer events
   - Separate package/SDK, not a protocol fork

### 2. Define capability negotiation up front

At minimum, detect:

- MCP Apps support via advertised MIME types
- Partial tool-input streaming support
- File download bridge support
- Open-link bridge support
- Stable-origin support for CORS-sensitive apps

Recommendation:

- If advanced capabilities are absent, fall back to final-result HTML only.
- If MCP Apps support is absent, fall back again to text plus artifact download links or a legacy renderer adapter.

### 3. Keep generative UI tools narrow and composable

Recommended tool split:

- `render_widget`
  - accepts structured intent, optional data payload, and optional code/html body
- `search_widget_components`
  - exposes the current component/runtime affordances
- `export_widget`
  - optional host/app-private tool for download packaging or persistence

Recommendation:

- Separate "discover what can be rendered" from "render this now."
- Keep persistence and UI-only mutations hidden from the model when possible, following the MCP Apps private-to-app tool pattern.

### 4. Treat raw HTML as an engine payload, not the only public abstraction

Recommendation:

- Support open-ended HTML/SVG/JS for first-party hosts.
- Also define a structured envelope around it, e.g. `title`, `summary`, `data`, `html`, `assets`, `recommendedSize`, `securityProfile`.

Why:

- That makes inspection, logging, replay, and fallback rendering easier.
- It also creates a migration path toward declarative or mixed rendering later.

### 5. For computer use, standardize around observation/action primitives, not host plugins

Recommended portable categories:

- Observation: `get_app_state`, screenshots, accessibility tree, focused element, window metadata
- Pointer: `click`, `drag`, `scroll`
- Keyboard/text: `press_key`, `type_text`, `set_value`
- Session/bootstrap: target app selection, permission checks, health diagnostics

Recommendation:

- Keep the MCP server as the source of truth.
- Ship host-specific installers/plugins only as convenience layers.
- Preserve a focus-safe policy similar to `open-codex-computer-use`: accessibility-first, keyboard-first, pointer-last.

### 6. Design for OS permission reality

Recommendation:

- Separate protocol portability from OS onboarding.
- Make app identity stable for OS permissions.
- Keep dev and release identities distinct so debugging does not corrupt user-granted permissions.

This is a strong pattern from `open-codex-computer-use` and is necessary for any credible desktop computer-use distribution.

## Practical Decision

If this repository wants broad external adoption, the external contract should be:

- **Primary external interface:** MCP Apps + standard MCP tools
- **First-party enhancement:** a lightweight streaming renderer SDK/profile
- **Distribution strategy:** host-specific installers/adapters that all wrap the same MCP server and tool contracts

That gives:

- cross-agent portability by default
- better first-party generative UI UX where supported
- no hard dependency on a single host's widget runtime

## Sources

- Model Context Protocol, MCP Apps overview: <https://modelcontextprotocol.io/extensions/apps/overview>
- MCP Apps SDK docs: <https://apps.extensions.modelcontextprotocol.io/api/>
- MCP Apps patterns: <https://apps.extensions.modelcontextprotocol.io/api/documents/patterns.html>
- MCP Apps UI resource metadata: <https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiResourceMeta.html>
- MCP Apps client capabilities: <https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiClientCapabilities.html>
- MCP Apps CSP and CORS guidance: <https://apps.extensions.modelcontextprotocol.io/api/documents/csp-and-cors.html>
- MCP-UI README: <https://github.com/MCP-UI-Org/mcp-ui>
- FastMCP Generative UI guide: <https://gofastmcp.com/apps/generative>
- FastMCP `fastmcp.apps.generative` reference: <https://gofastmcp.com/python-sdk/fastmcp-apps-generative>
- `open-codex-computer-use` repository: <https://github.com/iFurySt/open-codex-computer-use>
- `open-codex-computer-use` Codex plugin metadata: <https://raw.githubusercontent.com/iFurySt/open-codex-computer-use/main/plugins/open-computer-use/.codex-plugin/plugin.json>
- CodePilot repository: <https://github.com/op7418/CodePilot>
- CodePilot generative UI doc: <https://raw.githubusercontent.com/op7418/CodePilot/main/apps/site/content/docs/en/generative-ui.mdx>
