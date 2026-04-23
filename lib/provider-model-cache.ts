import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChatProviderId } from "@/lib/chat-model-config";

const providerDataDir = path.join(process.cwd(), ".data", "providers");
const providerModelsPath = path.join(providerDataDir, "provider-models.json");

type StoredProviderModelsRecord = {
  models: string[];
  updatedAt: string;
};

type StoredProviderModelsFile = {
  version: 1;
  providers: Partial<Record<ChatProviderId, StoredProviderModelsRecord>>;
};

export type StoredProviderModels = {
  models: string[];
  updatedAt: string;
};

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function ensureProviderDataDir() {
  await mkdir(providerDataDir, { recursive: true, mode: 0o700 });
}

function sanitizeStoredProviderModelsFile(
  value: Partial<StoredProviderModelsFile> | null | undefined
): StoredProviderModelsFile {
  return {
    version: 1,
    providers:
      value?.providers && typeof value.providers === "object" ? value.providers : {},
  };
}

async function readStoredProviderModelsFile() {
  await ensureProviderDataDir();

  try {
    const file = await readFile(providerModelsPath, "utf8");
    return sanitizeStoredProviderModelsFile(
      JSON.parse(file) as Partial<StoredProviderModelsFile>
    );
  } catch {
    return sanitizeStoredProviderModelsFile(null);
  }
}

async function writeStoredProviderModelsFile(value: StoredProviderModelsFile) {
  await ensureProviderDataDir();
  await writeFile(providerModelsPath, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
}

export async function readStoredProviderModels(
  providerId: ChatProviderId
): Promise<StoredProviderModels | null> {
  const record = (await readStoredProviderModelsFile()).providers[providerId];

  if (!record?.updatedAt || !Array.isArray(record.models)) {
    return null;
  }

  return {
    models: uniqueStrings(record.models),
    updatedAt: record.updatedAt,
  };
}

export async function writeStoredProviderModels(
  providerId: ChatProviderId,
  models: string[]
) {
  const file = await readStoredProviderModelsFile();
  const nextRecord = {
    models: uniqueStrings(models),
    updatedAt: new Date().toISOString(),
  } satisfies StoredProviderModelsRecord;

  file.providers[providerId] = nextRecord;
  await writeStoredProviderModelsFile(file);
  return nextRecord;
}
