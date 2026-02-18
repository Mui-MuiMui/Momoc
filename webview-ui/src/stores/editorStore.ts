import { create } from "zustand";

export type LayoutMode = "flow" | "absolute";
export type ThemeMode = "light" | "dark";
export type ViewportMode = "desktop" | "tablet" | "mobile" | "custom";
export type MemoColor = "yellow" | "blue" | "green" | "pink" | "purple" | "orange";

export interface Memo {
  id: string;
  title: string;
  body: string;
  color: MemoColor;
  collapsed: boolean;
  x: number;
  y: number;
}

interface EditorState {
  layoutMode: LayoutMode;
  themeMode: ThemeMode;
  viewportMode: ViewportMode;
  customViewportWidth: number;
  customViewportHeight: number;
  documentContent: string;
  fileName: string;
  isDirty: boolean;
  selectedNodeId: string | null;
  memos: Memo[];
  zoom: number;

  setLayoutMode: (mode: LayoutMode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setViewportMode: (mode: ViewportMode) => void;
  setCustomViewportSize: (width: number, height: number) => void;
  setDocumentContent: (content: string) => void;
  setFileName: (name: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
  setMemos: (memos: Memo[]) => void;
  addMemo: (memo: Memo) => void;
  updateMemo: (id: string, updates: Partial<Memo>) => void;
  removeMemo: (id: string) => void;
  setZoom: (zoom: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  layoutMode: "flow",
  themeMode: "light",
  viewportMode: "desktop",
  customViewportWidth: 1920,
  customViewportHeight: 1080,
  documentContent: "",
  fileName: "",
  isDirty: false,
  selectedNodeId: null,
  memos: [],
  zoom: 1,

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setCustomViewportSize: (width, height) =>
    set({ customViewportWidth: width, customViewportHeight: height }),
  setDocumentContent: (content) => set({ documentContent: content }),
  setFileName: (name) => set({ fileName: name }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setMemos: (memos) => set({ memos }),
  addMemo: (memo) => set((state) => ({ memos: [...state.memos, memo] })),
  updateMemo: (id, updates) =>
    set((state) => ({
      memos: state.memos.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  removeMemo: (id) =>
    set((state) => ({ memos: state.memos.filter((m) => m.id !== id) })),
  setZoom: (zoom) => set({ zoom }),
}));
