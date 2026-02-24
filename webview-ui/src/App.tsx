import { useCallback, useRef, useEffect } from "react";
import { Editor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ComponentPalette } from "./components/palette/ComponentPalette";
import { EditorCanvas } from "./components/canvas/EditorCanvas";
import { PropertiesPanel } from "./components/properties/PropertiesPanel";
import { ContextMenu } from "./components/canvas/ContextMenu";
import { RenderNode } from "./components/canvas/RenderNode";
import { EditorLoader } from "./components/EditorLoader";
import { useVscodeMessage } from "./hooks/useVscodeMessage";
import { useEditorStore } from "./stores/editorStore";
import { getVsCodeApi } from "./utils/vscodeApi";
import { resolvers } from "./crafts/resolvers";

const SAVE_DEBOUNCE_MS = 800;

export default function App() {
  const { i18n } = useTranslation();
  const { setDocumentContent, setFileName, setThemeMode, setIsDirty, setLayoutMode } =
    useEditorStore();

  // --- Save system ---
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const loadingRef = useRef(false);
  const lastCraftStateRef = useRef<string>("");

  /** Build combined save payload (craftState + memos + canvas size + intent) */
  const buildSaveContent = useCallback((craftStateStr: string) => {
    const s = useEditorStore.getState();
    const craftState = JSON.parse(craftStateStr);
    return JSON.stringify({
      version: 1,
      craftState,
      memos: s.memos,
      viewport: {
        mode: s.viewportMode,
        width: s.customViewportWidth,
        height: s.customViewportHeight,
      },
      intent: s.intent,
    });
  }, []);

  const doSave = useCallback(
    (content: string) => {
      getVsCodeApi().postMessage({
        type: "doc:save",
        payload: { content },
      });
      lastSavedRef.current = content;
      setIsDirty(false);
    },
    [setIsDirty],
  );

  /** Schedule a debounced save using the latest state */
  const scheduleSave = useCallback(() => {
    if (loadingRef.current) return;
    if (!lastCraftStateRef.current) return;

    const content = buildSaveContent(lastCraftStateRef.current);
    if (content === lastSavedRef.current) return;

    setIsDirty(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const latest = buildSaveContent(lastCraftStateRef.current);
      doSave(latest);
      saveTimerRef.current = null;
    }, SAVE_DEBOUNCE_MS);
  }, [setIsDirty, doSave, buildSaveContent]);

  // Craft.js calls this whenever any node changes
  const handleNodesChange = useCallback(
    (query: { serialize: () => string }) => {
      try {
        if (loadingRef.current) return;
        const serialized = query.serialize();
        lastCraftStateRef.current = serialized;

        // First call: just record, don't save
        if (!lastSavedRef.current) {
          lastSavedRef.current = buildSaveContent(serialized);
          return;
        }

        scheduleSave();
      } catch (err) {
        console.error("[Momoc] onNodesChange serialize error:", err);
      }
    },
    [scheduleSave, buildSaveContent],
  );

  // Watch memo changes and trigger save
  const memos = useEditorStore((s) => s.memos);
  const prevMemosRef = useRef(memos);
  useEffect(() => {
    if (loadingRef.current) return;
    if (prevMemosRef.current === memos) return;
    prevMemosRef.current = memos;
    scheduleSave();
  }, [memos, scheduleSave]);

  // Watch intent changes and trigger save
  const intent = useEditorStore((s) => s.intent);
  const prevIntentRef = useRef(intent);
  useEffect(() => {
    if (loadingRef.current) return;
    if (prevIntentRef.current === intent) return;
    prevIntentRef.current = intent;
    scheduleSave();
  }, [intent, scheduleSave]);

  // Watch canvas size changes and trigger save
  const viewportMode = useEditorStore((s) => s.viewportMode);
  const customViewportWidth = useEditorStore((s) => s.customViewportWidth);
  const customViewportHeight = useEditorStore((s) => s.customViewportHeight);
  const viewportKey = `${viewportMode}:${customViewportWidth}:${customViewportHeight}`;
  const prevViewportKeyRef = useRef(viewportKey);
  useEffect(() => {
    if (loadingRef.current) return;
    if (prevViewportKeyRef.current === viewportKey) return;
    prevViewportKeyRef.current = viewportKey;
    scheduleSave();
  }, [viewportKey, scheduleSave]);

  // Ctrl+S immediate save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        if (lastCraftStateRef.current) {
          const content = buildSaveContent(lastCraftStateRef.current);
          doSave(content);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [doSave, buildSaveContent]);

  // --- VSCode message handler ---
  const handleMessage = useCallback(
    (message: { type: string; payload?: unknown }) => {
      switch (message.type) {
        case "doc:load": {
          const p = message.payload as { content: string; fileName: string };
          setDocumentContent(p.content);
          setFileName(p.fileName);
          break;
        }
        case "doc:externalChange": {
          const p = message.payload as { content: string };
          setDocumentContent(p.content);
          break;
        }
        case "theme:set": {
          const p = message.payload as { theme: "light" | "dark" };
          setThemeMode(p.theme);
          break;
        }
        case "i18n:locale": {
          const p = message.payload as { locale: string };
          const lang = p.locale.split("-")[0];
          i18n.changeLanguage(lang);
          break;
        }
        case "command:toggleTheme": {
          const newTheme = useEditorStore.getState().themeMode === "light" ? "dark" : "light";
          setThemeMode(newTheme);
          break;
        }
        case "command:switchLayoutMode": {
          const newLayout = useEditorStore.getState().layoutMode === "flow" ? "absolute" : "flow";
          setLayoutMode(newLayout);
          break;
        }
      }
    },
    [setDocumentContent, setFileName, setThemeMode, setLayoutMode, i18n],
  );

  useVscodeMessage(handleMessage);

  // Notify extension that the webview React app is mounted and ready
  useEffect(() => {
    getVsCodeApi().postMessage({ type: "editor:ready" });
  }, []);

  return (
    <Editor
      resolver={resolvers}
      onRender={RenderNode}
      onNodesChange={handleNodesChange}
    >
      <EditorLoader
        loadingRef={loadingRef}
        lastSavedRef={lastSavedRef}
        lastCraftStateRef={lastCraftStateRef}
      />
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--vscode-editor-background,#1e1e1e)] text-[var(--vscode-foreground,#ccc)]">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <ComponentPalette />
          <EditorCanvas />
          <PropertiesPanel />
        </div>
        <ContextMenu />
      </div>
    </Editor>
  );
}
