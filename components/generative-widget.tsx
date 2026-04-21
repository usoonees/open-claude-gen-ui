"use client";

import morphdom from "morphdom";
import { useEffect, useMemo, useRef, useState } from "react";
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

const WIDGET_DOWNLOAD_HOST_STYLES = `:root {
  color-scheme: light dark;
  --color-background-primary: #ffffff;
  --color-background-secondary: #f5f5f5;
  --color-background-tertiary: #fafafa;
  --color-background-info: #e6f1fb;
  --color-background-danger: #fcebeb;
  --color-background-success: #eaf3de;
  --color-background-warning: #faeeda;
  --color-text-primary: #171717;
  --color-text-secondary: #525252;
  --color-text-tertiary: #737373;
  --color-text-info: #0c447c;
  --color-text-danger: #791f1f;
  --color-text-success: #27500a;
  --color-text-warning: #633806;
  --color-border-primary: rgba(15, 23, 42, 0.4);
  --color-border-secondary: rgba(15, 23, 42, 0.3);
  --color-border-tertiary: rgba(15, 23, 42, 0.15);
  --color-border-info: #185fa5;
  --color-border-danger: #a32d2d;
  --color-border-success: #3b6d11;
  --color-border-warning: #854f0b;
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

function scopeInlineClassicScript(textContent: string | null) {
  return `{\n${textContent ?? ""}\n}`;
}

function executeScripts(container: HTMLElement) {
  for (const script of container.querySelectorAll("script")) {
    if (script.src && !isAllowedWidgetScriptUrl(script.src)) {
      script.remove();
      continue;
    }

    const nextScript = document.createElement("script");

    for (const { name, value } of Array.from(script.attributes)) {
      nextScript.setAttribute(name, value);
    }

    if (!script.src) {
      nextScript.textContent = isInlineClassicScript(script)
        ? scopeInlineClassicScript(script.textContent)
        : script.textContent;
    }

    script.replaceWith(nextScript);
  }
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
    if (!hostRef.current || !hasRenderableMarkup) {
      return;
    }

    const source = hostRef.current;
    const target = source.cloneNode(false) as HTMLDivElement;
    target.innerHTML = widgetCode;
    stripOuterWidgetChrome(target);

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

    if (status === "ready" && lastExecutedMarkupRef.current !== widgetCode) {
      executeScripts(source);
      lastExecutedMarkupRef.current = widgetCode;
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
      </div>
    </section>
  );
}
