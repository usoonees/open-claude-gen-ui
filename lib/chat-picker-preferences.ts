export type ChatPickerPreferences = {
  hiddenModelKeys: string[];
};

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeHiddenModelKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return uniqueStrings(
    value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
  );
}

export function normalizeChatPickerPreferences(
  value: Partial<ChatPickerPreferences> | null | undefined
): ChatPickerPreferences {
  return {
    hiddenModelKeys: normalizeHiddenModelKeys(value?.hiddenModelKeys),
  };
}
