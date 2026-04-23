export type ShowWidgetToolInput = {
  iHaveSeenReadMe?: boolean;
  title?: string;
  loadingMessages?: string[];
  widgetCode?: string;
};

type ShowWidgetToolInputRecord = Record<string, unknown>;

function asRecord(value: unknown): ShowWidgetToolInputRecord | null {
  return value && typeof value === "object"
    ? (value as ShowWidgetToolInputRecord)
    : null;
}

function coerceBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return undefined;
}

function extractEmbeddedParameters(record: ShowWidgetToolInputRecord) {
  const extracted: ShowWidgetToolInput = {};
  const snippets = Object.entries(record).flatMap(([key, value]) => {
    const values = [key];

    if (typeof value === "string") {
      values.push(value);
    }

    return values;
  });
  const parameterPattern =
    /<parameter(?:\s+name="([^"]+)"|\s*=([a-zA-Z0-9_:-]+))[^>]*>([\s\S]*?)(?=<\/parameter>|<parameter|$)/gi;

  for (const snippet of snippets) {
    let match: RegExpExecArray | null;

    while ((match = parameterPattern.exec(snippet)) !== null) {
      const parameterName = match[1] ?? match[2] ?? "";
      const parameterValue = match[3]?.trim() ?? "";

      switch (parameterName) {
        case "iHaveSeenReadMe":
          extracted.iHaveSeenReadMe = coerceBoolean(parameterValue);
          break;
        case "title":
          extracted.title = parameterValue || extracted.title;
          break;
        case "widgetCode":
          extracted.widgetCode = parameterValue || extracted.widgetCode;
          break;
      }
    }
  }

  return extracted;
}

export function normalizeShowWidgetToolInput(
  input: unknown
): ShowWidgetToolInput {
  const record = asRecord(input);
  const embeddedParameters = record ? extractEmbeddedParameters(record) : {};

  return {
    iHaveSeenReadMe:
      typeof record?.iHaveSeenReadMe === "boolean"
        ? record.iHaveSeenReadMe
        : embeddedParameters.iHaveSeenReadMe,
    title:
      typeof record?.title === "string" ? record.title : embeddedParameters.title,
    loadingMessages: Array.isArray(record?.loadingMessages)
      ? record.loadingMessages.filter(
          (value): value is string => typeof value === "string"
        )
      : undefined,
    widgetCode:
      typeof record?.widgetCode === "string"
        ? record.widgetCode
        : embeddedParameters.widgetCode,
  };
}

export function hasShowWidgetRenderablePayload(input: unknown) {
  const normalized = normalizeShowWidgetToolInput(input);

  return Boolean(
    normalized.widgetCode?.trim() && normalized.loadingMessages?.length
  );
}
