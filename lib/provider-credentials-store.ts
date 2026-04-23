import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ChatProviderId } from "@/lib/chat-model-config";

const providerCredentialsDir = path.join(process.cwd(), ".data", "providers");
const providerCredentialsPath = path.join(
  providerCredentialsDir,
  "provider-credentials.json"
);
const providerCredentialsKeyPath = path.join(
  providerCredentialsDir,
  "provider-credentials.key"
);

export type ProviderCredentialSource = "frontend" | "env";

type StoredProviderCredentialRecord = {
  encryptedApiKey: string;
  keyPreview: string;
  updatedAt: string;
};

type StoredProviderCredentialFile = {
  version: 1;
  providers: Partial<Record<ChatProviderId, StoredProviderCredentialRecord>>;
};

export type StoredProviderCredential = {
  apiKey: string;
  keyPreview: string;
  source: "frontend";
  updatedAt: string;
};

function ensureProviderCredentialsDir() {
  mkdirSync(providerCredentialsDir, { recursive: true, mode: 0o700 });
}

function getProviderCredentialsKey() {
  const envKey = process.env.PROVIDER_CREDENTIALS_MASTER_KEY?.trim();

  if (envKey) {
    return createHash("sha256").update(envKey).digest();
  }

  ensureProviderCredentialsDir();

  if (!existsSync(providerCredentialsKeyPath)) {
    writeFileSync(providerCredentialsKeyPath, randomBytes(32), { mode: 0o600 });
  }

  const key = readFileSync(providerCredentialsKeyPath);
  return key.length === 32 ? key : createHash("sha256").update(key).digest();
}

function encodeBuffer(value: Buffer) {
  return value.toString("base64url");
}

function decodeBuffer(value: string) {
  return Buffer.from(value, "base64url");
}

function encryptApiKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getProviderCredentialsKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [encodeBuffer(iv), encodeBuffer(authTag), encodeBuffer(encrypted)].join(".");
}

function decryptApiKey(payload: string) {
  const [ivValue, authTagValue, encryptedValue] = payload.split(".");

  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Invalid credential payload.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getProviderCredentialsKey(),
    decodeBuffer(ivValue)
  );

  decipher.setAuthTag(decodeBuffer(authTagValue));

  return Buffer.concat([
    decipher.update(decodeBuffer(encryptedValue)),
    decipher.final(),
  ]).toString("utf8");
}

function sanitizeStoredCredentialFile(
  value: Partial<StoredProviderCredentialFile> | null | undefined
): StoredProviderCredentialFile {
  return {
    version: 1,
    providers:
      value?.providers && typeof value.providers === "object" ? value.providers : {},
  };
}

function readStoredCredentialFile() {
  ensureProviderCredentialsDir();

  try {
    return sanitizeStoredCredentialFile(
      JSON.parse(readFileSync(providerCredentialsPath, "utf8")) as Partial<StoredProviderCredentialFile>
    );
  } catch {
    return sanitizeStoredCredentialFile(null);
  }
}

function writeStoredCredentialFile(value: StoredProviderCredentialFile) {
  ensureProviderCredentialsDir();
  writeFileSync(providerCredentialsPath, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
}

function createKeyPreview(apiKey: string) {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    return "";
  }

  const suffix = trimmed.slice(-4);
  return suffix ? `••••${suffix}` : "••••";
}

export function readStoredProviderCredential(
  providerId: ChatProviderId
): StoredProviderCredential | null {
  const record = readStoredCredentialFile().providers[providerId];

  if (!record?.encryptedApiKey || !record.updatedAt) {
    return null;
  }

  try {
    const apiKey = decryptApiKey(record.encryptedApiKey).trim();

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

export function writeStoredProviderCredential(
  providerId: ChatProviderId,
  apiKey: string
) {
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    throw new Error("API key is required.");
  }

  const file = readStoredCredentialFile();
  const nextCredential = {
    encryptedApiKey: encryptApiKey(trimmedApiKey),
    keyPreview: createKeyPreview(trimmedApiKey),
    updatedAt: new Date().toISOString(),
  } satisfies StoredProviderCredentialRecord;

  file.providers[providerId] = nextCredential;
  writeStoredCredentialFile(file);

  return {
    keyPreview: nextCredential.keyPreview,
    updatedAt: nextCredential.updatedAt,
  };
}

export function deleteStoredProviderCredential(providerId: ChatProviderId) {
  const file = readStoredCredentialFile();

  if (!file.providers[providerId]) {
    return false;
  }

  delete file.providers[providerId];
  writeStoredCredentialFile(file);
  return true;
}
