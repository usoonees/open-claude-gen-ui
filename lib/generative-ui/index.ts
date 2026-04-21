import {
  AVAILABLE_MODULES,
  getGuidelines as getReferenceGuidelines,
} from "@/lib/generative-ui/reference-guidelines";

export const generativeUIModuleNames = AVAILABLE_MODULES as Array<
  "interactive" | "chart" | "mockup" | "art" | "diagram"
>;

export type GenerativeUIModule = (typeof generativeUIModuleNames)[number];

export const widgetScriptAllowlist = [
  "https://cdnjs.cloudflare.com/",
  "https://cdn.jsdelivr.net/",
  "https://unpkg.com/",
  "https://esm.sh/",
] as const;

export function isGenerativeUITrustedModeEnabled() {
  return process.env.NEXT_PUBLIC_GENERATIVE_UI_TRUSTED === "true";
}

export function getGenerativeUIGuidelines(modules: GenerativeUIModule[]) {
  return getReferenceGuidelines(modules);
}

export function isAllowedWidgetScriptUrl(url: string) {
  return widgetScriptAllowlist.some((origin) => url.startsWith(origin));
}
