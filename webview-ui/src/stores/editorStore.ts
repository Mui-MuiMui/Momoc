import { create } from "zustand";

export type LayoutMode = "flow" | "absolute";
export type ThemeMode = "light" | "dark";
export type ViewportMode = "desktop" | "tablet" | "mobile";

interface EditorState {
  layoutMode: LayoutMode;
  themeMode: ThemeMode;
  viewportMode: ViewportMode;
  documentContent: string;
  fileName: string;
  isDirty: boolean;
  selectedNodeId: string | null;

  setLayoutMode: (mode: LayoutMode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setViewportMode: (mode: ViewportMode) => void;
  setDocumentContent: (content: string) => void;
  setFileName: (name: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  layoutMode: "flow",
  themeMode: "light",
  viewportMode: "desktop",
  documentContent: "",
  fileName: "",
  isDirty: false,
  selectedNodeId: null,

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setDocumentContent: (content) => set({ documentContent: content }),
  setFileName: (name) => set({ fileName: name }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
}));
