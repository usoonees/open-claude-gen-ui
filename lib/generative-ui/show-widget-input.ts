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

export function normalizeShowWidgetToolInput(
  input: unknown
): ShowWidgetToolInput {
  const record = asRecord(input);

  return {
    iHaveSeenReadMe:
      typeof record?.iHaveSeenReadMe === "boolean"
        ? record.iHaveSeenReadMe
        : undefined,
    title: typeof record?.title === "string" ? record.title : undefined,
    loadingMessages: Array.isArray(record?.loadingMessages)
      ? record.loadingMessages.filter(
          (value): value is string => typeof value === "string"
        )
      : undefined,
    widgetCode:
      typeof record?.widgetCode === "string" ? record.widgetCode : undefined,
  };
}
