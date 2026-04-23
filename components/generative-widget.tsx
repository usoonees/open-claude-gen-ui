"use client";

import morphdom from "morphdom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  openTrustedWidgetLink,
  resolveTrustedWidgetLink,
} from "@/lib/generative-ui/browser-links";
import { isAllowedWidgetScriptUrl } from "@/lib/generative-ui";

type WidgetStatus = "streaming" | "ready" | "error";

type GenerativeWidgetProps = {
  title: string;
  widgetCode: string;
  loadingMessages: string[];
  status: WidgetStatus;
  errorText?: string;
};

export type DownloadableGenerativeWidget = {
  title: string;
  widgetCode: string;
};

type ZipTextFile = {
  name: string;
  content: string;
};

type WidgetExecutionResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      message: string;
    };

const WIDGET_DOWNLOAD_HOST_STYLES = `:root {
  color-scheme: light dark;
  --color-background-primary: #ffffff;
  --color-background-secondary: #f5f5f5;
  --color-background-tertiary: #fafafa;
  --color-background-info: #d7ebff;
  --color-background-danger: #fde1e1;
  --color-background-success: #e0f4dd;
  --color-background-warning: #fff0cf;
  --color-text-primary: #171717;
  --color-text-secondary: #525252;
  --color-text-tertiary: #737373;
  --color-text-info: #004b91;
  --color-text-danger: #9a1f1f;
  --color-text-success: #1f6a12;
  --color-text-warning: #7a4b00;
  --color-border-primary: rgba(15, 23, 42, 0.4);
  --color-border-secondary: rgba(15, 23, 42, 0.3);
  --color-border-tertiary: rgba(15, 23, 42, 0.15);
  --color-border-info: #0062c4;
  --color-border-danger: #c63a3a;
  --color-border-success: #2f8a1d;
  --color-border-warning: #b36b00;
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;
}

body {
  background: var(--color-background-tertiary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  margin: 0;
  padding: 16px;
}

* {
  box-sizing: border-box;
}

.widget-export-frame {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  padding: 12px;
  width: 100%;
}
`;

const WIDGET_SHADOW_STYLES = `
:host {
  color: var(--color-text-primary);
  display: block;
  font-family: var(--font-sans);
  min-height: 0;
  position: relative;
  white-space: normal;
}

* {
  box-sizing: border-box;
}

[data-widget-mount] {
  color: inherit;
  font-family: inherit;
  min-height: 0;
  position: relative;
  white-space: normal;
}

[data-widget-mount] > * {
  max-width: 100%;
}

[data-widget-mount] svg {
  --p: var(--color-text-primary);
  --s: var(--color-text-secondary);
  --t: var(--color-text-tertiary);
  --bg2: var(--color-background-secondary);
  --b: var(--color-border-tertiary);
  fill: initial;
  height: auto;
  max-width: 100%;
  stroke: initial;
  stroke-linecap: initial;
  stroke-linejoin: initial;
  stroke-width: initial;
  width: auto;
}

[data-widget-mount] svg .t,
[data-widget-mount] svg .th {
  fill: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
}

[data-widget-mount] svg .th {
  font-weight: 500;
}

[data-widget-mount] svg .ts {
  fill: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 400;
}

[data-widget-mount] svg .box {
  fill: var(--color-background-secondary);
  stroke: var(--color-border-tertiary);
}

[data-widget-mount] svg .arr {
  fill: none;
  stroke: var(--color-border-primary);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5px;
}

[data-widget-mount] svg .leader {
  fill: none;
  stroke: var(--color-border-tertiary);
  stroke-dasharray: 4 4;
  stroke-width: 0.5px;
}

[data-widget-mount] svg .node {
  cursor: pointer;
  transition: opacity 140ms ease;
}

[data-widget-mount] svg .node:hover {
  opacity: 0.82;
}

[data-widget-mount] svg .c-purple {
  --ramp-fill: #eeedfe;
  --ramp-stroke: #534ab7;
  --ramp-title: #3c3489;
  --ramp-subtitle: #534ab7;
}

[data-widget-mount] svg .c-teal {
  --ramp-fill: #e1f5ee;
  --ramp-stroke: #0f6e56;
  --ramp-title: #085041;
  --ramp-subtitle: #0f6e56;
}

[data-widget-mount] svg .c-coral {
  --ramp-fill: #faece7;
  --ramp-stroke: #993c1d;
  --ramp-title: #712b13;
  --ramp-subtitle: #993c1d;
}

[data-widget-mount] svg .c-pink {
  --ramp-fill: #fbeaf0;
  --ramp-stroke: #993556;
  --ramp-title: #72243e;
  --ramp-subtitle: #993556;
}

[data-widget-mount] svg .c-gray {
  --ramp-fill: #f1efe8;
  --ramp-stroke: #5f5e5a;
  --ramp-title: #444441;
  --ramp-subtitle: #5f5e5a;
}

[data-widget-mount] svg .c-blue {
  --ramp-fill: #e6f1fb;
  --ramp-stroke: #185fa5;
  --ramp-title: #0c447c;
  --ramp-subtitle: #185fa5;
}

[data-widget-mount] svg .c-green {
  --ramp-fill: #eaf3de;
  --ramp-stroke: #3b6d11;
  --ramp-title: #27500a;
  --ramp-subtitle: #3b6d11;
}

[data-widget-mount] svg .c-amber {
  --ramp-fill: #faeeda;
  --ramp-stroke: #854f0b;
  --ramp-title: #633806;
  --ramp-subtitle: #854f0b;
}

[data-widget-mount] svg .c-red {
  --ramp-fill: #fcebeb;
  --ramp-stroke: #a32d2d;
  --ramp-title: #791f1f;
  --ramp-subtitle: #a32d2d;
}

[data-widget-mount] svg rect.c-purple,
[data-widget-mount] svg circle.c-purple,
[data-widget-mount] svg ellipse.c-purple,
[data-widget-mount] svg rect.c-teal,
[data-widget-mount] svg circle.c-teal,
[data-widget-mount] svg ellipse.c-teal,
[data-widget-mount] svg rect.c-coral,
[data-widget-mount] svg circle.c-coral,
[data-widget-mount] svg ellipse.c-coral,
[data-widget-mount] svg rect.c-pink,
[data-widget-mount] svg circle.c-pink,
[data-widget-mount] svg ellipse.c-pink,
[data-widget-mount] svg rect.c-gray,
[data-widget-mount] svg circle.c-gray,
[data-widget-mount] svg ellipse.c-gray,
[data-widget-mount] svg rect.c-blue,
[data-widget-mount] svg circle.c-blue,
[data-widget-mount] svg ellipse.c-blue,
[data-widget-mount] svg rect.c-green,
[data-widget-mount] svg circle.c-green,
[data-widget-mount] svg ellipse.c-green,
[data-widget-mount] svg rect.c-amber,
[data-widget-mount] svg circle.c-amber,
[data-widget-mount] svg ellipse.c-amber,
[data-widget-mount] svg rect.c-red,
[data-widget-mount] svg circle.c-red,
[data-widget-mount] svg ellipse.c-red,
[data-widget-mount] svg .c-purple > rect,
[data-widget-mount] svg .c-purple > circle,
[data-widget-mount] svg .c-purple > ellipse,
[data-widget-mount] svg .c-teal > rect,
[data-widget-mount] svg .c-teal > circle,
[data-widget-mount] svg .c-teal > ellipse,
[data-widget-mount] svg .c-coral > rect,
[data-widget-mount] svg .c-coral > circle,
[data-widget-mount] svg .c-coral > ellipse,
[data-widget-mount] svg .c-pink > rect,
[data-widget-mount] svg .c-pink > circle,
[data-widget-mount] svg .c-pink > ellipse,
[data-widget-mount] svg .c-gray > rect,
[data-widget-mount] svg .c-gray > circle,
[data-widget-mount] svg .c-gray > ellipse,
[data-widget-mount] svg .c-blue > rect,
[data-widget-mount] svg .c-blue > circle,
[data-widget-mount] svg .c-blue > ellipse,
[data-widget-mount] svg .c-green > rect,
[data-widget-mount] svg .c-green > circle,
[data-widget-mount] svg .c-green > ellipse,
[data-widget-mount] svg .c-amber > rect,
[data-widget-mount] svg .c-amber > circle,
[data-widget-mount] svg .c-amber > ellipse,
[data-widget-mount] svg .c-red > rect,
[data-widget-mount] svg .c-red > circle,
[data-widget-mount] svg .c-red > ellipse {
  fill: var(--ramp-fill);
  stroke: var(--ramp-stroke);
}

[data-widget-mount] svg .c-purple > .t,
[data-widget-mount] svg .c-purple > .th,
[data-widget-mount] svg .c-teal > .t,
[data-widget-mount] svg .c-teal > .th,
[data-widget-mount] svg .c-coral > .t,
[data-widget-mount] svg .c-coral > .th,
[data-widget-mount] svg .c-pink > .t,
[data-widget-mount] svg .c-pink > .th,
[data-widget-mount] svg .c-gray > .t,
[data-widget-mount] svg .c-gray > .th,
[data-widget-mount] svg .c-blue > .t,
[data-widget-mount] svg .c-blue > .th,
[data-widget-mount] svg .c-green > .t,
[data-widget-mount] svg .c-green > .th,
[data-widget-mount] svg .c-amber > .t,
[data-widget-mount] svg .c-amber > .th,
[data-widget-mount] svg .c-red > .t,
[data-widget-mount] svg .c-red > .th {
  fill: var(--ramp-title);
}

[data-widget-mount] svg .c-purple > .ts,
[data-widget-mount] svg .c-teal > .ts,
[data-widget-mount] svg .c-coral > .ts,
[data-widget-mount] svg .c-pink > .ts,
[data-widget-mount] svg .c-gray > .ts,
[data-widget-mount] svg .c-blue > .ts,
[data-widget-mount] svg .c-green > .ts,
[data-widget-mount] svg .c-amber > .ts,
[data-widget-mount] svg .c-red > .ts {
  fill: var(--ramp-subtitle);
}
`;

const ZIP_CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

const CLASSIC_SCRIPT_TYPES = new Set([
  "",
  "application/ecmascript",
  "application/javascript",
  "text/ecmascript",
  "text/javascript",
]);

const WIDGET_FUNCTION_REGISTRY = new WeakMap<Node, Record<string, unknown>>();
const WIDGET_EVENT_HANDLER_REGISTRY = new WeakMap<
  Element,
  Map<string, { listener: EventListener; source: string }>
>();
const WIDGET_EVENT_ATTRIBUTE_PREFIX = "data-widget-event-";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function filenameBaseFromWidgetTitle(title: string) {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "widget";
}

function stripOuterWidgetChrome(container: HTMLElement) {
  const visualChildren = Array.from(container.children).filter(
    (child) => child.tagName !== "STYLE" && child.tagName !== "SCRIPT"
  );

  if (visualChildren.length !== 1) {
    return;
  }

  const root = visualChildren[0];

  if (!(root instanceof HTMLElement)) {
    return;
  }

  const fontFamily = root.style.getPropertyValue("font-family").trim();

  if (!fontFamily.includes("var(--font-sans)")) {
    return;
  }

  root.style.removeProperty("font-family");
  root.style.removeProperty("padding");
  root.style.removeProperty("padding-block");
  root.style.removeProperty("padding-block-start");
  root.style.removeProperty("padding-block-end");
  root.style.removeProperty("padding-inline");
  root.style.removeProperty("padding-inline-start");
  root.style.removeProperty("padding-inline-end");
  root.style.removeProperty("padding-top");
  root.style.removeProperty("padding-right");
  root.style.removeProperty("padding-bottom");
  root.style.removeProperty("padding-left");

  if (!root.getAttribute("style")?.trim()) {
    root.removeAttribute("style");
  }
}

function widgetCodeForHost(widgetCode: string) {
  const container = document.createElement("div");

  container.innerHTML = widgetCode;
  stripOuterWidgetChrome(container);

  return container.innerHTML;
}

function createWidgetDownloadHtml(
  title: string,
  widgetCode: string
) {
  if (/<html[\s>]/i.test(widgetCode)) {
    return widgetCode;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${WIDGET_DOWNLOAD_HOST_STYLES}</style>
  <title>${escapeHtml(title.replace(/_/g, " "))}</title>
</head>
<body>
<div class="widget-export-frame">
${widgetCodeForHost(widgetCode)}
</div>
</body>
</html>
`;
}

function createZipRecord(size: number) {
  const buffer = new ArrayBuffer(size);

  return {
    bytes: new Uint8Array(buffer),
    view: new DataView(buffer),
  };
}

function arrayBufferFromBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);

  copy.set(bytes);
  return copy.buffer;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = ZIP_CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function encodeZipDate(date: Date) {
  const year = Math.max(1980, date.getFullYear());

  return {
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
  };
}

function createWidgetZipBlob(files: ZipTextFile[]) {
  const encoder = new TextEncoder();
  const now = encodeZipDate(new Date());
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);
    const local = createZipRecord(30);

    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x0800, true);
    local.view.setUint16(8, 0, true);
    local.view.setUint16(10, now.time, true);
    local.view.setUint16(12, now.date, true);
    local.view.setUint32(14, checksum, true);
    local.view.setUint32(18, dataBytes.byteLength, true);
    local.view.setUint32(22, dataBytes.byteLength, true);
    local.view.setUint16(26, nameBytes.byteLength, true);
    local.view.setUint16(28, 0, true);

    localParts.push(local.bytes, nameBytes, dataBytes);

    const central = createZipRecord(46);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x0800, true);
    central.view.setUint16(10, 0, true);
    central.view.setUint16(12, now.time, true);
    central.view.setUint16(14, now.date, true);
    central.view.setUint32(16, checksum, true);
    central.view.setUint32(20, dataBytes.byteLength, true);
    central.view.setUint32(24, dataBytes.byteLength, true);
    central.view.setUint16(28, nameBytes.byteLength, true);
    central.view.setUint16(30, 0, true);
    central.view.setUint16(32, 0, true);
    central.view.setUint16(34, 0, true);
    central.view.setUint16(36, 0, true);
    central.view.setUint32(38, 0, true);
    central.view.setUint32(42, offset, true);
    centralParts.push(central.bytes, nameBytes);

    offset += local.bytes.byteLength + nameBytes.byteLength + dataBytes.byteLength;
  }

  const centralDirectorySize = centralParts.reduce(
    (total, part) => total + part.byteLength,
    0
  );
  const end = createZipRecord(22);

  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(4, 0, true);
  end.view.setUint16(6, 0, true);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, centralDirectorySize, true);
  end.view.setUint32(16, offset, true);
  end.view.setUint16(20, 0, true);

  return new Blob(
    [...localParts, ...centralParts, end.bytes].map(arrayBufferFromBytes),
    {
      type: "application/zip",
    }
  );
}

function isInlineClassicScript(script: HTMLScriptElement) {
  if (script.src) {
    return false;
  }

  return CLASSIC_SCRIPT_TYPES.has(
    (script.getAttribute("type") ?? "").trim().toLowerCase()
  );
}

function escapeWidgetIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9_$]/g, "\\$&");
}

function normalizeWidgetSelector(selector: string) {
  return selector.replace(
    /\[\s*on([a-z][a-z0-9_-]*)/gi,
    (_, eventName: string) =>
      `[${WIDGET_EVENT_ATTRIBUTE_PREFIX}${eventName.toLowerCase()}`
  );
}

function prepareWidgetScriptsForMount(container: HTMLElement) {
  for (const script of container.querySelectorAll("script")) {
    const src = script.getAttribute("src");

    if (src) {
      script.dataset.widgetSrc = src;
      script.removeAttribute("src");
    }

    const onload = script.getAttribute("onload");

    if (onload) {
      script.dataset.widgetOnload = onload;
      script.removeAttribute("onload");
    }

    if (!src && isInlineClassicScript(script)) {
      const type = script.getAttribute("type");

      script.dataset.widgetInlineClassic = "true";

      if (type !== null) {
        script.dataset.widgetOriginalType = type;
      }

      script.setAttribute("type", "text/plain");
    }
  }
}

function prepareWidgetInlineEventHandlersForMount(container: HTMLElement) {
  const elements = [container, ...Array.from(container.querySelectorAll("*"))];

  for (const element of elements) {
    if (element instanceof HTMLScriptElement) {
      continue;
    }

    for (const { name, value } of Array.from(element.attributes)) {
      if (!name.startsWith("on")) {
        continue;
      }

      const eventName = name.slice(2).toLowerCase();

      if (!eventName || !value.trim()) {
        element.removeAttribute(name);
        continue;
      }

      element.setAttribute(`${WIDGET_EVENT_ATTRIBUTE_PREFIX}${eventName}`, value);
      element.removeAttribute(name);
    }
  }
}

function widgetFunctionNamesFromScript(textContent: string | null) {
  if (!textContent) {
    return [];
  }

  const namedFunctionMatches = textContent.matchAll(
    /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g
  );
  const variableFunctionMatches = textContent.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][A-Za-z0-9_$]*\s*=>)/g
  );

  return [
    ...new Set([
      ...Array.from(namedFunctionMatches, (match) => match[1]),
      ...Array.from(variableFunctionMatches, (match) => match[1]),
    ]),
  ];
}

function getWidgetScriptScope(currentNode: Node | null) {
  const ownerDocument = currentNode?.ownerDocument ?? document;
  const widgetRoot = currentNode?.getRootNode?.() ?? ownerDocument;
  const parentNodeRoot =
    widgetRoot &&
    "querySelector" in widgetRoot &&
    "querySelectorAll" in widgetRoot &&
    typeof widgetRoot.querySelector === "function" &&
    typeof widgetRoot.querySelectorAll === "function"
      ? (widgetRoot as ParentNode)
      : null;
  const widgetFns =
    WIDGET_FUNCTION_REGISTRY.get(widgetRoot) ??
    (() => {
      const nextRegistry: Record<string, unknown> = {};
      WIDGET_FUNCTION_REGISTRY.set(widgetRoot, nextRegistry);
      return nextRegistry;
    })();
  const widgetDocument =
    parentNodeRoot
      ? {
          querySelector: (selector: string) =>
            parentNodeRoot.querySelector(normalizeWidgetSelector(selector)),
          querySelectorAll: (selector: string) =>
            parentNodeRoot.querySelectorAll(normalizeWidgetSelector(selector)),
          getElementById: (id: string) =>
            typeof (widgetRoot as ShadowRoot).getElementById === "function"
              ? (widgetRoot as ShadowRoot).getElementById(id)
              : parentNodeRoot.querySelector(`#${CSS.escape(id)}`),
          addEventListener: (...args: Parameters<Document["addEventListener"]>) =>
            ownerDocument.addEventListener(...args),
          removeEventListener: (
            ...args: Parameters<Document["removeEventListener"]>
          ) => ownerDocument.removeEventListener(...args),
          createElement: (...args: Parameters<Document["createElement"]>) =>
            ownerDocument.createElement(...args),
          createElementNS: (...args: Parameters<Document["createElementNS"]>) =>
            ownerDocument.createElementNS(...args),
          body: ownerDocument.body,
          documentElement: ownerDocument.documentElement,
          currentScript:
            currentNode instanceof HTMLScriptElement ? currentNode : null,
          defaultView: ownerDocument.defaultView,
        }
      : ownerDocument;

  return {
    ownerDocument,
    widgetDocument,
    widgetFns,
    widgetRoot,
    widgetWindow: ownerDocument.defaultView ?? window,
  };
}

function widgetFunctionRegistrationBlock(functionNames: string[]) {
  return functionNames.length > 0
    ? `
  for (const __widgetName of [${functionNames
    .map((name) => `"${escapeWidgetIdentifier(name)}"`)
    .join(", ")}]) {
    let __widgetValue;

    try {
      __widgetValue = eval(__widgetName);
    } catch {
      __widgetValue = undefined;
    }

    if (typeof __widgetValue === "function") {
      widgetFns[__widgetName] = __widgetValue;
    }
  }`
    : "";
}

function widgetExecutionErrorMessage(stage: string, error: unknown) {
  const detail =
    error instanceof Error ? error.message : "Unknown widget runtime error.";

  return `${stage}: ${detail}`;
}

function runWidgetExecutor(
  stage: string,
  args: string[],
  body: string,
  values: unknown[]
): WidgetExecutionResult {
  try {
    const executor = new Function(...args, body);

    return {
      ok: true,
      value: executor(...values),
    };
  } catch (error) {
    const message = widgetExecutionErrorMessage(stage, error);

    console.error("[open-claude-gen-ui] widget execution failed", {
      stage,
      error,
      bodyPreview: body.slice(0, 600),
    });

    return {
      ok: false,
      message,
    };
  }
}

function runScopedInlineClassicScript(
  currentScript: HTMLScriptElement,
  textContent: string | null,
  functionNames: string[]
) {
  const { widgetDocument, widgetFns, widgetRoot, widgetWindow } =
    getWidgetScriptScope(currentScript);

  return runWidgetExecutor(
    "Inline widget script failed",
    ["document", "window", "widgetFns", "widgetRoot"],
    `${textContent ?? ""}
${widgetFunctionRegistrationBlock(functionNames)}`,
    [widgetDocument, widgetWindow, widgetFns, widgetRoot]
  );
}

function runScopedWidgetCallback(
  currentNode: Node | null,
  callbackSource: string
) {
  const { widgetDocument, widgetFns, widgetRoot, widgetWindow } =
    getWidgetScriptScope(currentNode);

  return runWidgetExecutor(
    "Widget callback failed",
    ["document", "window", "widgetFns", "widgetRoot"],
    `with (widgetFns) { ${callbackSource} }`,
    [widgetDocument, widgetWindow, widgetFns, widgetRoot]
  );
}

function runScopedWidgetInlineEventHandler(
  currentNode: Element,
  handlerSource: string,
  event: Event
) {
  const { widgetDocument, widgetFns, widgetRoot, widgetWindow } =
    getWidgetScriptScope(currentNode);
  const eventWindow = widgetWindow as typeof window & { event?: Event };
  const hadEvent = "event" in eventWindow;
  const previousEvent = eventWindow.event;

  eventWindow.event = event;

  try {
    const result = runWidgetExecutor(
      "Widget event handler failed",
      ["document", "window", "widgetFns", "widgetRoot", "event", "element"],
      `with (widgetFns) { return (function(event) { ${handlerSource} }).call(element, event); }`,
      [widgetDocument, widgetWindow, widgetFns, widgetRoot, event, currentNode]
    );

    return result.ok ? result.value : undefined;
  } finally {
    if (hadEvent) {
      eventWindow.event = previousEvent;
    } else {
      Reflect.deleteProperty(eventWindow as { event?: Event }, "event");
    }
  }
}

function bindScopedInlineEventHandlers(container: HTMLElement) {
  const elements = [container, ...Array.from(container.querySelectorAll("*"))];

  for (const element of elements) {
    if (element instanceof HTMLScriptElement) {
      continue;
    }

    const existingHandlers =
      WIDGET_EVENT_HANDLER_REGISTRY.get(element) ??
      (() => {
        const nextHandlers = new Map<
          string,
          { listener: EventListener; source: string }
        >();
        WIDGET_EVENT_HANDLER_REGISTRY.set(element, nextHandlers);
        return nextHandlers;
      })();
    const nextEventNames = new Set<string>();

    for (const { name, value } of Array.from(element.attributes)) {
      if (!name.startsWith(WIDGET_EVENT_ATTRIBUTE_PREFIX)) {
        continue;
      }

      const eventName = name.slice(WIDGET_EVENT_ATTRIBUTE_PREFIX.length);

      if (!eventName || !value.trim()) {
        continue;
      }

      nextEventNames.add(eventName);

      const existingHandler = existingHandlers.get(eventName);

      if (existingHandler?.source === value) {
        continue;
      }

      if (existingHandler) {
        element.removeEventListener(eventName, existingHandler.listener);
      }

      const listener: EventListener = (event) => {
        const result = runScopedWidgetInlineEventHandler(element, value, event);

        if (result === false) {
          event.preventDefault();
        }
      };

      element.addEventListener(eventName, listener);
      existingHandlers.set(eventName, { listener, source: value });
    }

    for (const [eventName, handler] of existingHandlers) {
      if (nextEventNames.has(eventName)) {
        continue;
      }

      element.removeEventListener(eventName, handler.listener);
      existingHandlers.delete(eventName);
    }
  }
}

function syncScopedInlineEventHandlers(container: HTMLElement) {
  prepareWidgetInlineEventHandlersForMount(container);
  bindScopedInlineEventHandlers(container);
}

function getOrCreateShadowMount(host: HTMLDivElement) {
  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });

  let baseStyle = shadowRoot.querySelector<HTMLStyleElement>(
    "style[data-widget-shadow-base]"
  );

  if (!baseStyle) {
    baseStyle = document.createElement("style");
    baseStyle.dataset.widgetShadowBase = "true";
    baseStyle.textContent = WIDGET_SHADOW_STYLES;
    shadowRoot.append(baseStyle);
  }

  let mount = shadowRoot.querySelector<HTMLDivElement>("[data-widget-mount]");

  if (!mount) {
    mount = document.createElement("div");
    mount.setAttribute("data-widget-mount", "");
    shadowRoot.append(mount);
  }

  return mount;
}

function executeScripts(container: HTMLElement) {
  const widgetRoot = container.getRootNode();
  const externalCallbacks: Array<{
    callbackSource: string;
    script: HTMLScriptElement;
  }> = [];
  let externalCallbacksReady = false;
  const errors: string[] = [];

  WIDGET_FUNCTION_REGISTRY.set(widgetRoot, {});
  (
    globalThis as typeof globalThis & {
      __openVisualLayoutWidgetFns?: WeakMap<Node, Record<string, unknown>>;
    }
  ).__openVisualLayoutWidgetFns = WIDGET_FUNCTION_REGISTRY;

  for (const script of container.querySelectorAll("script")) {
    const externalSrc = script.dataset.widgetSrc ?? script.getAttribute("src");
    const isPreparedInlineClassic = script.dataset.widgetInlineClassic === "true";

    if (externalSrc && !isAllowedWidgetScriptUrl(externalSrc)) {
      script.remove();
      continue;
    }

    const nextScript = document.createElement("script");
    const externalLoadHandler =
      script.dataset.widgetOnload ?? script.getAttribute("onload");

    for (const { name, value } of Array.from(script.attributes)) {
      if (
        name === "src" ||
        name === "onload" ||
        name === "data-widget-src" ||
        name === "data-widget-onload" ||
        name === "data-widget-inline-classic" ||
        name === "data-widget-original-type"
      ) {
        continue;
      }

      nextScript.setAttribute(name, value);
    }

    if (!externalSrc) {
      nextScript.textContent = script.textContent;

      if (isPreparedInlineClassic) {
        nextScript.type = "text/plain";
      }
    } else {
      nextScript.src = externalSrc;
      nextScript.async = false;
    }

    if (externalSrc && externalLoadHandler?.trim()) {
      const callbackSource = externalLoadHandler;

      nextScript.addEventListener("load", () => {
        nextScript.dataset.widgetLoaded = "true";

        if (externalCallbacksReady && nextScript.dataset.widgetCallbackRan !== "true") {
          nextScript.dataset.widgetCallbackRan = "true";
          const result = runScopedWidgetCallback(nextScript, callbackSource);

          if (!result.ok) {
            errors.push(result.message);
          }
        }
      });

      externalCallbacks.push({ callbackSource, script: nextScript });
    }

    script.replaceWith(nextScript);

    if (!externalSrc && isPreparedInlineClassic) {
      const result = runScopedInlineClassicScript(
        nextScript,
        script.textContent,
        widgetFunctionNamesFromScript(script.textContent)
      );

      if (!result.ok) {
        errors.push(result.message);
      }
    }
  }

  externalCallbacksReady = true;

  for (const { callbackSource, script } of externalCallbacks) {
    if (
      script.dataset.widgetLoaded === "true" &&
      script.dataset.widgetCallbackRan !== "true"
    ) {
      script.dataset.widgetCallbackRan = "true";
      const result = runScopedWidgetCallback(script, callbackSource);

      if (!result.ok) {
        errors.push(result.message);
      }
    }
  }

  return errors;
}

export function downloadGenerativeWidgetZip({
  title,
  widgetCode,
}: DownloadableGenerativeWidget) {
  if (!widgetCode.trim()) {
    return;
  }

  const filenameBase = filenameBaseFromWidgetTitle(title);
  const blob = createWidgetZipBlob([
    {
      name: "original-widget.html",
      content: widgetCode,
    },
    {
      name: "final-widget.html",
      content: createWidgetDownloadHtml(title, widgetCode),
    },
  ]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${filenameBase}-widget.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function GenerativeWidget({
  title,
  widgetCode,
  loadingMessages,
  status,
  errorText,
}: GenerativeWidgetProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const lastExecutedMarkupRef = useRef<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [widgetRuntimeError, setWidgetRuntimeError] = useState<string | null>(null);

  const hasRenderableMarkup = widgetCode.trim().length > 0;
  const visibleLoadingMessage = useMemo(() => {
    if (loadingMessages.length === 0) {
      return "";
    }

    return loadingMessages[loadingMessageIndex % loadingMessages.length];
  }, [loadingMessageIndex, loadingMessages]);
  const showLoadingStatus =
    status === "streaming" && visibleLoadingMessage.length > 0;

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const mount = getOrCreateShadowMount(hostRef.current);
    const root = mount.getRootNode();

    if (!(root instanceof ShadowRoot)) {
      return;
    }

    function handleHostClick(event: Event) {
      const path = event.composedPath();
      const anchor = path.find(
        (node): node is HTMLAnchorElement =>
          node instanceof HTMLAnchorElement && mount.contains(node)
      );

      if (!anchor) {
        return;
      }

      event.preventDefault();
      openTrustedWidgetLink(anchor.href);
    }

    root.addEventListener("click", handleHostClick);

    return () => {
      root.removeEventListener("click", handleHostClick);
    };
  }, []);

  useEffect(() => {
    if (status !== "streaming" || loadingMessages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingMessageIndex((currentIndex) => currentIndex + 1);
    }, 3600);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadingMessages.length, status]);

  useEffect(() => {
    // Only reset if loadingMessages changes its reference deeply or goes empty
    // Using a ref to track the previous messages length helps avoid resetting on every new chunk appended
    if (loadingMessages.length === 0) {
      setLoadingMessageIndex(0);
    }
  }, [loadingMessages.length]);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const source = getOrCreateShadowMount(hostRef.current);
    const observer = new MutationObserver((mutations) => {
      const shouldSync = mutations.some(
        (mutation) =>
          mutation.type === "childList" ||
          (mutation.type === "attributes" &&
            mutation.attributeName !== null &&
            mutation.attributeName.startsWith("on"))
      );

      if (!shouldSync) {
        return;
      }

      syncInlineHandlers();
    });

    function syncInlineHandlers() {
      observer.disconnect();

      try {
        syncScopedInlineEventHandlers(source);
      } finally {
        observer.observe(source, {
          subtree: true,
          childList: true,
          attributes: true,
        });
      }
    }

    syncInlineHandlers();

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const source = getOrCreateShadowMount(hostRef.current);

    if (!hasRenderableMarkup) {
      source.replaceChildren();
      lastExecutedMarkupRef.current = null;
      setWidgetRuntimeError(null);
      return;
    }

    if (status === "ready" && lastExecutedMarkupRef.current === widgetCode) {
      return;
    }

    const target = source.cloneNode(false) as HTMLDivElement;
    target.innerHTML = widgetCode;
    stripOuterWidgetChrome(target);
    prepareWidgetScriptsForMount(target);
    prepareWidgetInlineEventHandlersForMount(target);

    morphdom(source, target, {
      childrenOnly: true,
      onBeforeElUpdated(fromEl, toEl) {
        if (fromEl.isEqualNode(toEl)) {
          return false;
        }

        return true;
      },
      onNodeAdded(node) {
        if (node instanceof HTMLElement && node.tagName !== "SCRIPT") {
          node.style.animation = "widgetFadeIn 220ms ease both";
        }

        return node;
      },
    });

    for (const anchor of source.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const resolvedHref = resolveTrustedWidgetLink(anchor.getAttribute("href") ?? "");

      if (!resolvedHref) {
        anchor.removeAttribute("href");
        continue;
      }

      anchor.href = resolvedHref;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.referrerPolicy = "no-referrer";
    }

    if (status === "ready" && lastExecutedMarkupRef.current !== widgetCode) {
      const executionErrors = executeScripts(source);
      syncScopedInlineEventHandlers(source);
      setWidgetRuntimeError(executionErrors[0] ?? null);
      lastExecutedMarkupRef.current = widgetCode;
    } else if (status !== "ready") {
      setWidgetRuntimeError(null);
    }
  }, [hasRenderableMarkup, status, widgetCode]);

  return (
    <section aria-label={title.replace(/_/g, " ")} className="widget-shell">
      <div className={`widget-frame ${status === "error" ? "is-error" : ""}`}>
        {!hasRenderableMarkup ? (
          <div className="widget-placeholder">
            <div className="widget-loader-line" />
            {showLoadingStatus ? (
              <div className="widget-loading-status">
                <span aria-hidden="true" className="widget-loading-dot" />
                <span className="widget-loading-text">
                  {visibleLoadingMessage}
                  <span aria-hidden="true" className="widget-loading-ellipsis">
                    ...
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className={
            hasRenderableMarkup
              ? "widget-live-region"
              : "widget-live-region is-hidden"
          }
        >
          <div className="widget-host" ref={hostRef} />
        </div>

        {hasRenderableMarkup && showLoadingStatus ? (
          <div className="widget-loading-status">
            <span aria-hidden="true" className="widget-loading-dot" />
            <span className="widget-loading-text">
              {visibleLoadingMessage}
              <span aria-hidden="true" className="widget-loading-ellipsis">
                ...
              </span>
            </span>
          </div>
        ) : null}

        {status === "error" && errorText ? (
          <p className="widget-error-text">{errorText}</p>
        ) : null}

        {status !== "error" && widgetRuntimeError ? (
          <p className="widget-error-text">{widgetRuntimeError}</p>
        ) : null}
      </div>
    </section>
  );
}
