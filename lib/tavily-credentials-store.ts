import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createKeyPreview,
  decryptStoredSecret,
  encryptStoredSecret,
  ensureCredentialDirectory,
} from "@/lib/local-credential-utils";

const tavilyCredentialsDir = path.join(process.cwd(), ".data", "settings");
const tavilyCredentialsPath = path.join(
  tavilyCredentialsDir,
  "tavily-credentials.json"
);

type StoredTavilyCredentialRecord = {
  encryptedApiKey: string;
  keyPreview: string;
  updatedAt: string;
};

type StoredTavilyCredentialFile = {
  version: 1;
  tavily: StoredTavilyCredentialRecord | null;
};

export type StoredTavilyCredential = {
  apiKey: string;
  keyPreview: string;
  source: "frontend";
  updatedAt: string;
};

function sanitizeStoredCredentialFile(
  value: Partial<StoredTavilyCredentialFile> | null | undefined
): StoredTavilyCredentialFile {
  return {
    version: 1,
    tavily:
      value?.tavily && typeof value.tavily === "object" ? value.tavily : null,
  };
}

function readStoredCredentialFile() {
  ensureCredentialDirectory(tavilyCredentialsDir);

  try {
    return sanitizeStoredCredentialFile(
      JSON.parse(
        readFileSync(tavilyCredentialsPath, "utf8")
      ) as Partial<StoredTavilyCredentialFile>
    );
  } catch {
    return sanitizeStoredCredentialFile(null);
  }
}

function writeStoredCredentialFile(value: StoredTavilyCredentialFile) {
  ensureCredentialDirectory(tavilyCredentialsDir);
  writeFileSync(tavilyCredentialsPath, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
}

export function readStoredTavilyCredential(): StoredTavilyCredential | null {
  const record = readStoredCredentialFile().tavily;

  if (!record?.encryptedApiKey || !record.updatedAt) {
    return null;
  }

  try {
    const apiKey = decryptStoredSecret(record.encryptedApiKey).trim();

    if (!apiKey) {
      return null;
    }

    return {
      apiKey,
      keyPreview: record.keyPreview || createKeyPreview(apiKey),
      source: "frontend",
      updatedAt: record.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeStoredTavilyCredential(apiKey: string) {
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    throw new Error("API key is required.");
  }

  const file = readStoredCredentialFile();
  const nextCredential = {
    encryptedApiKey: encryptStoredSecret(trimmedApiKey),
    keyPreview: createKeyPreview(trimmedApiKey),
    updatedAt: new Date().toISOString(),
  } satisfies StoredTavilyCredentialRecord;

  file.tavily = nextCredential;
  writeStoredCredentialFile(file);

  return {
    keyPreview: nextCredential.keyPreview,
    updatedAt: nextCredential.updatedAt,
  };
}

export function deleteStoredTavilyCredential() {
  const file = readStoredCredentialFile();

  if (!file.tavily) {
    return false;
  }

  file.tavily = null;
  writeStoredCredentialFile(file);
  return true;
}
