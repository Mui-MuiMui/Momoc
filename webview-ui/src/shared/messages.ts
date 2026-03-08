/**
 * postMessage 型定義 (Extension ↔ Webview)
 *
 * webview-ui と src は別ビルドのため型を直接共有できない。
 * src/shared/types.ts の同名型と同一内容を保つこと（デュアル定義）。
 */

/** カスタムコンポーネントのエントリ（src/shared/types.ts と同一） */
export interface CustomComponentEntry {
  id: string;
  name: string;
  path: string;
  craftState: string;
  layoutMode: string;
  importedAt: number;
}

// SelectionContext (src/shared/types.ts と同一)
export interface SelectionContext {
  componentType: string;
  elementId?: string;
  props: Record<string, unknown>;
  tailwindClasses: string[];
  sourceLine?: number;
  sourceColumn?: number;
  parentPath: string[];
}

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
  | { type: "resolve:mocFile:result"; payload: { path: string; exists: boolean } }
  | { type: "customComponent:importResult"; payload: CustomComponentEntry | { error: string } }
  | { type: "customComponent:all"; payload: CustomComponentEntry[] }
  | { type: "customComponent:reloadResult"; payload: { id: string; entry: CustomComponentEntry | null } }
  | { type: "customComponent:removeResult"; payload: { id: string } }
  | { type: "customComponent:updatePathResult"; payload: { id: string; entry: CustomComponentEntry | null } };

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
  | { type: "resolve:mocFile"; payload: { path: string } }
  | { type: "customComponent:import" }
  | { type: "customComponent:reload"; payload: { id: string } }
  | { type: "customComponent:remove"; payload: { id: string } }
  | { type: "customComponent:getAll" }
  | { type: "customComponent:updatePath"; payload: { id: string } };
