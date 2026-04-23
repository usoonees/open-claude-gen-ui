export type TavilySettingsSummary = {
  apiKeyEnv: string;
  configured: boolean;
  credentialSource: "frontend" | "env" | null;
  credentialUpdatedAt?: string;
  keyPreview?: string;
  baseURL: string;
};
