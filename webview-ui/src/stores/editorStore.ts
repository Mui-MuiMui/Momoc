import { create } from "zustand";
import type { CustomComponentEntry } from "../shared/messages";

export type LayoutMode = "flow" | "absolute";
export type ThemeMode = "light" | "dark";
export type ViewportMode = "desktop" | "tablet" | "mobile" | "custom";
export type MemoColor = "yellow" | "blue" | "green" | "pink" | "purple" | "orange";

export type MemoLineMode = "all" | "hover";

export interface Memo {
  id: string;
  title: string;
  body: string;
  color: MemoColor;
  collapsed: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** Craft.js node IDs this memo is associated with (for AI context) */
  targetNodeIds: string[];
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
  selectedNodeIds: string[];
  memos: Memo[];
  memosVisible: boolean;
  memoLineMode: MemoLineMode;
  hoveredMemoId: string | null;
  zoom: number;
  intent: string;
  isPaletteOpen: boolean;
  isPropertiesOpen: boolean;
  isFileLoading: boolean;
  historyLimit: number;

  setLayoutMode: (mode: LayoutMode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setViewportMode: (mode: ViewportMode) => void;
  setCustomViewportSize: (width: number, height: number) => void;
  setDocumentContent: (content: string) => void;
  setFileName: (name: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setMemos: (memos: Memo[]) => void;
  addMemo: (memo: Memo) => void;
  updateMemo: (id: string, updates: Partial<Memo>) => void;
  removeMemo: (id: string) => void;
  toggleMemosVisible: () => void;
  setMemosVisible: (visible: boolean) => void;
  setMemoLineMode: (mode: MemoLineMode) => void;
  setHoveredMemoId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setIntent: (intent: string) => void;
  togglePalette: () => void;
  toggleProperties: () => void;
  setFileLoading: (loading: boolean) => void;
  setHistoryLimit: (limit: number) => void;
  customComponents: CustomComponentEntry[];
  setCustomComponents: (entries: CustomComponentEntry[]) => void;
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
  selectedNodeIds: [],
  memos: [],
  memosVisible: true,
  memoLineMode: "hover",
  hoveredMemoId: null,
  zoom: 1,
  intent: "",
  isPaletteOpen: true,
  isPropertiesOpen: true,
  isFileLoading: true,
  historyLimit: 50,
  customComponents: [],

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setCustomViewportSize: (width, height) =>
    set({ customViewportWidth: width, customViewportHeight: height }),
  setDocumentContent: (content) => set({ documentContent: content }),
  setFileName: (name) => set({ fileName: name }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  setMemos: (memos) => set({ memos }),
  addMemo: (memo) => set((state) => ({ memos: [...state.memos, memo] })),
  updateMemo: (id, updates) =>
    set((state) => ({
      memos: state.memos.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  removeMemo: (id) =>
    set((state) => ({ memos: state.memos.filter((m) => m.id !== id) })),
  toggleMemosVisible: () => set((state) => ({ memosVisible: !state.memosVisible })),
  setMemosVisible: (visible) => set({ memosVisible: visible }),
  setMemoLineMode: (mode) => set({ memoLineMode: mode }),
  setHoveredMemoId: (id) => set({ hoveredMemoId: id }),
  setZoom: (zoom) => set({ zoom }),
  setIntent: (intent) => set({ intent }),
  togglePalette: () => set((state) => ({ isPaletteOpen: !state.isPaletteOpen })),
  toggleProperties: () => set((state) => ({ isPropertiesOpen: !state.isPropertiesOpen })),
  setFileLoading: (loading) => set({ isFileLoading: loading }),
  setHistoryLimit: (limit) => set({ historyLimit: limit }),
  setCustomComponents: (entries) => set({ customComponents: entries }),
}));
