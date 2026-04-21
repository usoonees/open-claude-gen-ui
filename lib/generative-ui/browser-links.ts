"use client";

export function resolveTrustedWidgetLink(rawUrl: string) {
  try {
    const resolved = new URL(rawUrl, window.location.href);

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }

    return resolved.toString();
  } catch {
    return null;
  }
}

export function openTrustedWidgetLink(rawUrl: string) {
  const resolvedUrl = resolveTrustedWidgetLink(rawUrl);

  if (!resolvedUrl) {
    return false;
  }

  const openedWindow = window.open(
    resolvedUrl,
    "_blank",
    "noopener,noreferrer"
  );

  if (openedWindow) {
    openedWindow.opener = null;
  }

  return true;
}
