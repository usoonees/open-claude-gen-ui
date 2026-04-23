import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const sharedCredentialsDir = path.join(process.cwd(), ".data", "providers");
const sharedCredentialsKeyPath = path.join(
  sharedCredentialsDir,
  "provider-credentials.key"
);

export function ensureCredentialDirectory(directoryPath: string) {
  mkdirSync(directoryPath, { recursive: true, mode: 0o700 });
}

function getCredentialMasterKey() {
  const envKey = process.env.PROVIDER_CREDENTIALS_MASTER_KEY?.trim();

  if (envKey) {
    return createHash("sha256").update(envKey).digest();
  }

  ensureCredentialDirectory(sharedCredentialsDir);

  // Keep the existing key path stable so previously saved provider keys remain
  // readable while Tavily settings reuse the same local encryption material.
  if (!existsSync(sharedCredentialsKeyPath)) {
    writeFileSync(sharedCredentialsKeyPath, randomBytes(32), { mode: 0o600 });
  }

  const key = readFileSync(sharedCredentialsKeyPath);
  return key.length === 32 ? key : createHash("sha256").update(key).digest();
}

function encodeBuffer(value: Buffer) {
  return value.toString("base64url");
}

function decodeBuffer(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptStoredSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getCredentialMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [encodeBuffer(iv), encodeBuffer(authTag), encodeBuffer(encrypted)].join(".");
}

export function decryptStoredSecret(payload: string) {
  const [ivValue, authTagValue, encryptedValue] = payload.split(".");

  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Invalid credential payload.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getCredentialMasterKey(),
    decodeBuffer(ivValue)
  );

  decipher.setAuthTag(decodeBuffer(authTagValue));

  return Buffer.concat([
    decipher.update(decodeBuffer(encryptedValue)),
    decipher.final(),
  ]).toString("utf8");
}

export function createKeyPreview(secret: string) {
  const trimmed = secret.trim();

  if (!trimmed) {
    return "";
  }

  const suffix = trimmed.slice(-4);
  return suffix ? `••••${suffix}` : "••••";
}
