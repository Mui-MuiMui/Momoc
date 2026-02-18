import { useCallback } from "react";
import { Editor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ComponentPalette } from "./components/palette/ComponentPalette";
import { EditorCanvas } from "./components/canvas/EditorCanvas";
import { PropertiesPanel } from "./components/properties/PropertiesPanel";
import { useVscodeMessage } from "./hooks/useVscodeMessage";
import { useEditorStore } from "./stores/editorStore";
import { resolvers } from "./crafts/resolvers";

export default function App() {
  const { i18n } = useTranslation();
  const { setDocumentContent, setFileName, setThemeMode } = useEditorStore();

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
          i18n.changeLanguage(p.locale);
          break;
        }
      }
    },
    [setDocumentContent, setFileName, setThemeMode, i18n],
  );

  useVscodeMessage(handleMessage);

  return (
    <Editor resolver={resolvers}>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--vscode-editor-background,#1e1e1e)] text-[var(--vscode-foreground,#ccc)]">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <ComponentPalette />
          <EditorCanvas />
          <PropertiesPanel />
        </div>
      </div>
    </Editor>
  );
}
