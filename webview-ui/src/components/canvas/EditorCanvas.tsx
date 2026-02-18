import { Frame, Element } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { CraftContainer } from "../../crafts/layout/CraftContainer";
import { MemoOverlay } from "../memo/MemoOverlay";

const VIEWPORT_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

export function EditorCanvas() {
  const { t } = useTranslation();
  const { themeMode, viewportMode } = useEditorStore();
  const viewportWidth = VIEWPORT_WIDTHS[viewportMode] || 1280;

  return (
    <div
      data-mocker-canvas
      className="relative flex flex-1 items-start justify-center overflow-auto bg-[var(--vscode-editor-background,#1e1e1e)] p-4"
    >
      <MemoOverlay />
      <div
        className="relative bg-white shadow-lg transition-all duration-300"
        style={{
          width: viewportWidth,
          minHeight: "calc(100vh - 80px)",
        }}
      >
        <div className={themeMode === "dark" ? "dark" : ""}>
          <div className="min-h-full bg-background text-foreground">
            <Frame>
              <Element
                is={CraftContainer}
                canvas
                display="flex"
                flexDirection="column"
                className="min-h-screen"
              >
              </Element>
            </Frame>
          </div>
        </div>
      </div>
    </div>
  );
}
