export interface MocMetadata {
  version: string;
  intent: string;
  theme: "light" | "dark";
  layout: "flow" | "absolute";
  viewport: string;
  memos: MocMemo[];
  craftState?: string;
  selection?: SelectionContext;
  /** v1.1.0: ファイル内で使用されているコンポーネントのスキーマ（パース結果） */
  componentSchemas?: Record<string, { displayName: string; props: Record<string, { type: string; default: unknown }> }>;
}

export interface MocMemo {
  targetId: string;
  text: string;
}

export interface MocDocument {
  metadata: MocMetadata;
  imports: string;
  tsxSource: string;
  rawContent: string;
  /** Base64-encoded JSON containing craftState + full memo objects for editor restoration */
  editorData?: MocEditorData;
}

export interface MocEditorData {
  craftState: Record<string, unknown>;
  memos: MocEditorMemo[];
  viewport?: {
    mode: string;
    width: number;
    height: number;
  };
}

/** Full memo object as used by the GUI editor (richer than MocMemo) */
export interface MocEditorMemo {
  id: string;
  title: string;
  body: string;
  color: string;
  collapsed: boolean;
  x: number;
  y: number;
  targetNodeId?: string;
}

export interface SelectionContext {
  componentType: string;
  elementId?: string;
  props: Record<string, unknown>;
  tailwindClasses: string[];
  sourceLine?: number;
  sourceColumn?: number;
  parentPath: string[];
}

export type LayoutMode = "flow" | "absolute";
export type ThemeMode = "light" | "dark";
export type ViewportMode = "desktop" | "tablet" | "mobile";

// ---------------------------------------------------------------------------
// postMessage 型定義 (Extension ↔ Webview)
// ---------------------------------------------------------------------------

/** Extension → Webview */
export type ExtensionToWebviewMessage =
  | { type: "doc:load"; payload: { content: string; fileName: string } }
  | { type: "doc:externalChange"; payload: { content: string } }
  | { type: "theme:set"; payload: { theme: "light" | "dark" } }
  | { type: "i18n:locale"; payload: { locale: string; messages: Record<string, unknown> } }
  | { type: "command:toggleTheme" }
  | { type: "command:switchLayoutMode" }
  | { type: "build:error"; payload: { componentId: string; error: string } }
  | { type: "build:result"; payload: { componentId: string; jsCode: string } }
  | { type: "capture:start" }
  | { type: "resolve:imageUri:result"; payload: { src: string; uri: string } }
  | { type: "browse:mocFile:result"; payload: { relativePath: string; targetProp?: string } }
  | { type: "browse:imageFile:result"; payload: { relativePath: string; targetProp?: string } }
  | { type: "resolve:mocFile:result"; payload: { path: string; exists: boolean } };

/** Webview → Extension */
export type WebviewToExtensionMessage =
  | { type: "editor:ready" }
  | { type: "doc:save"; payload: { content: string } }
  | { type: "doc:requestBuild"; payload: { componentId: string; tsx: string } }
  | { type: "shadcn:install"; payload: { components: string[] } }
  | { type: "selection:change"; payload: SelectionContext }
  | { type: "command:openBrowserPreview" }
  | { type: "command:exportImage" }
  | { type: "capture:complete"; payload: { dataUrl: string } }
  | { type: "capture:error"; payload: { error: string } }
  | { type: "resolve:imageUri"; payload: { src: string } }
  | { type: "browse:mocFile"; payload: { currentPath?: string; targetProp?: string } }
  | { type: "browse:imageFile"; payload: { currentPath?: string; targetProp?: string } }
  | { type: "resolve:mocFile"; payload: { path: string } };
