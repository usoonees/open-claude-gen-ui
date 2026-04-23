export type TavilySettingsSummary = {
  apiKeyEnv: string;
  configured: boolean;
  credentialSource: "frontend" | "env" | null;
  credentialUpdatedAt?: string;
  keyPreview?: string;
  baseURL: string;
};

export type GenerativeUISettingsSummary = {
  enabled: boolean;
  envVar: string;
  source: "frontend" | "env" | "default";
  updatedAt?: string;
};

export type AppSettingsPayload = {
  tavily: TavilySettingsSummary;
  generativeUI: GenerativeUISettingsSummary;
};
