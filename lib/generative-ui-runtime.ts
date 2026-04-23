import "server-only";

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { GenerativeUISettingsSummary } from "@/lib/chat-settings-config";
import { ensureCredentialDirectory } from "@/lib/local-credential-utils";

const settingsDir = path.join(process.cwd(), ".data", "settings");
const settingsPath = path.join(settingsDir, "generative-ui-settings.json");
const trustedModeEnvVar = "NEXT_PUBLIC_GENERATIVE_UI_TRUSTED";

type StoredGenerativeUISettingsFile = {
  version: 1;
  trustedModeOverride: boolean | null;
  updatedAt?: string;
};

function sanitizeStoredSettingsFile(
  value: Partial<StoredGenerativeUISettingsFile> | null | undefined
): StoredGenerativeUISettingsFile {
  return {
    version: 1,
    trustedModeOverride:
      typeof value?.trustedModeOverride === "boolean"
        ? value.trustedModeOverride
        : null,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : undefined,
  };
}

function readStoredSettingsFile() {
  ensureCredentialDirectory(settingsDir);

  try {
    return sanitizeStoredSettingsFile(
      JSON.parse(
        readFileSync(settingsPath, "utf8")
      ) as Partial<StoredGenerativeUISettingsFile>
    );
  } catch {
    return sanitizeStoredSettingsFile(null);
  }
}

function writeStoredSettingsFile(value: StoredGenerativeUISettingsFile) {
  ensureCredentialDirectory(settingsDir);
  writeFileSync(settingsPath, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
}

function getEnvironmentTrustedModeDefault() {
  const envValue = process.env[trustedModeEnvVar]?.trim().toLowerCase();

  if (envValue === "true" || envValue === "false") {
    return {
      enabled: envValue === "true",
      source: "env",
    } as const;
  }

  return {
    enabled: true,
    source: "default",
  } as const;
}

export function getGenerativeUITrustedModeSummary(): GenerativeUISettingsSummary {
  const storedSettings = readStoredSettingsFile();

  if (typeof storedSettings.trustedModeOverride === "boolean") {
    return {
      enabled: storedSettings.trustedModeOverride,
      envVar: trustedModeEnvVar,
      source: "frontend",
      updatedAt: storedSettings.updatedAt,
    };
  }

  const envDefault = getEnvironmentTrustedModeDefault();

  return {
    enabled: envDefault.enabled,
    envVar: trustedModeEnvVar,
    source: envDefault.source,
  };
}

export function isGenerativeUITrustedModeEnabled() {
  return getGenerativeUITrustedModeSummary().enabled;
}

export function writeStoredGenerativeUITrustedModeOverride(enabled: boolean) {
  writeStoredSettingsFile({
    version: 1,
    trustedModeOverride: enabled,
    updatedAt: new Date().toISOString(),
  });
}
