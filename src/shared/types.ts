export interface MocMetadata {
  version: string;
  id: string;
  intent: string;
  theme: "light" | "dark";
  layout: "flow" | "absolute";
  viewport: string;
  memos: MocMemo[];
  craftState?: string;
  selection?: SelectionContext;
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
