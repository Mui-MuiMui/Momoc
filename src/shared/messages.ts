import type { SelectionContext, ThemeMode } from "./types.js";

export type ExtToWebMessage =
  | { type: "doc:load"; payload: { content: string; fileName: string } }
  | { type: "doc:externalChange"; payload: { content: string } }
  | { type: "build:result"; payload: { componentId: string; jsCode: string } }
  | { type: "build:error"; payload: { componentId: string; error: string } }
  | { type: "tailwind:css"; payload: { css: string } }
  | { type: "theme:set"; payload: { theme: ThemeMode } }
  | {
      type: "i18n:locale";
      payload: { locale: string; messages: Record<string, string> };
    };

export type WebToExtMessage =
  | { type: "doc:save"; payload: { content: string } }
  | {
      type: "doc:requestBuild";
      payload: { componentId: string; tsx: string };
    }
  | { type: "editor:ready" }
  | { type: "selection:change"; payload: SelectionContext }
  | { type: "shadcn:install"; payload: { components: string[] } }
  | { type: "template:select"; payload: { templateId: string } }
  | {
      type: "tailwind:classesChanged";
      payload: { classes: string[] };
    };
