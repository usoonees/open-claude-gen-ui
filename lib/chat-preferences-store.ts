import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  normalizeChatPickerPreferences,
  normalizeHiddenModelKeys,
} from "@/lib/chat-picker-preferences";

const preferencesDir = path.join(process.cwd(), ".data", "preferences");
const chatPreferencesPath = path.join(
  preferencesDir,
  "chat-model-picker.json"
);

export type StoredChatPreferences = {
  hiddenModelKeys: string[];
  updatedAt: string;
};

function sanitizeStoredChatPreferences(
  value: Partial<StoredChatPreferences> | null | undefined
): StoredChatPreferences {
  return {
    ...normalizeChatPickerPreferences(value),
    updatedAt:
      typeof value?.updatedAt === "string" && value.updatedAt
        ? value.updatedAt
        : new Date(0).toISOString(),
  };
}

async function ensurePreferencesDir() {
  await mkdir(preferencesDir, { recursive: true, mode: 0o700 });
}

export async function readChatPreferences(): Promise<StoredChatPreferences> {
  await ensurePreferencesDir();

  try {
    const file = await readFile(chatPreferencesPath, "utf8");
    return sanitizeStoredChatPreferences(
      JSON.parse(file) as Partial<StoredChatPreferences>
    );
  } catch {
    return sanitizeStoredChatPreferences(null);
  }
}

export async function writeChatPreferences(
  value:
    | {
        hiddenModelKeys?: unknown;
      }
    | null
    | undefined
): Promise<StoredChatPreferences> {
  await ensurePreferencesDir();

  const nextPreferences = {
    hiddenModelKeys: normalizeHiddenModelKeys(value?.hiddenModelKeys),
    updatedAt: new Date().toISOString(),
  } satisfies StoredChatPreferences;

  await writeFile(
    chatPreferencesPath,
    `${JSON.stringify(nextPreferences, null, 2)}\n`,
    { mode: 0o600 }
  );

  return nextPreferences;
}
