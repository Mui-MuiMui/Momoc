export interface MocMetadata {
  version: string;
  id: string;
  intent: string;
  theme: "light" | "dark";
  layout: "flow" | "absolute";
  viewport: "desktop" | "tablet" | "mobile";
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
