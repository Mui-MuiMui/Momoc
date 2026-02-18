import { useCallback, useRef, useEffect } from "react";
import { Editor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ComponentPalette } from "./components/palette/ComponentPalette";
import { EditorCanvas } from "./components/canvas/EditorCanvas";
import { PropertiesPanel } from "./components/properties/PropertiesPanel";
import { ContextMenu } from "./components/canvas/ContextMenu";
import { RenderNode } from "./components/canvas/RenderNode";
import { useVscodeMessage } from "./hooks/useVscodeMessage";
import { useEditorStore } from "./stores/editorStore";
import { getVsCodeApi } from "./utils/vscodeApi";
import { resolvers } from "./crafts/resolvers";

const SAVE_DEBOUNCE_MS = 800;

export default function App() {
  const { i18n } = useTranslation();
  const { setDocumentContent, setFileName, setThemeMode, setIsDirty } =
    useEditorStore();

  // --- Save system using Craft.js onNodesChange callback ---
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const initializedRef = useRef(false);

  const doSave = useCallback(
    (serialized: string) => {
      getVsCodeApi().postMessage({
        type: "doc:save",
        payload: { content: serialized },
      });
      lastSavedRef.current = serialized;
      setIsDirty(false);
    },
    [setIsDirty],
  );

  // Craft.js calls this whenever any node changes
  const handleNodesChange = useCallback(
    (query: { serialize: () => string }) => {
      try {
        const serialized = query.serialize();

        // First change after mount - just record initial state
        if (!initializedRef.current) {
          initializedRef.current = true;
          lastSavedRef.current = serialized;
          return;
        }

        // No actual change
        if (serialized === lastSavedRef.current) return;

        setIsDirty(true);

        // Debounce: clear previous timer, set a new one
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
          // Re-serialize at save time to capture latest state
          try {
            const latest = query.serialize();
            doSave(latest);
          } catch {
            doSave(serialized);
          }
          saveTimerRef.current = null;
        }, SAVE_DEBOUNCE_MS);
      } catch (err) {
        console.error("[Mocker] onNodesChange serialize error:", err);
      }
    },
    [setIsDirty, doSave],
  );

  // Ctrl+S immediate save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        // Clear pending debounce
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        // Force save current state
        const content = lastSavedRef.current;
        if (content) {
          // Trigger VSCode to save the document
          getVsCodeApi().postMessage({
            type: "doc:save",
            payload: { content },
          });
          setIsDirty(false);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setIsDirty]);

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
      }
    },
    [setDocumentContent, setFileName, setThemeMode, i18n],
  );

  useVscodeMessage(handleMessage);

  return (
    <Editor
      resolver={resolvers}
      onRender={RenderNode}
      onNodesChange={handleNodesChange}
    >
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
