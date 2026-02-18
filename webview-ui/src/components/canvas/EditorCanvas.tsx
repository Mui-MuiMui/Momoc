import { Frame, Element } from "@craftjs/core";
import { useEditorStore } from "../../stores/editorStore";
import { CraftContainer } from "../../crafts/layout/CraftContainer";
import { MemoOverlay } from "../memo/MemoOverlay";

const VIEWPORT_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

const VIEWPORT_HEIGHTS: Record<string, number> = {
  desktop: 800,
  tablet: 1024,
  mobile: 812,
};

export function EditorCanvas() {
  const { themeMode, viewportMode, customViewportWidth, customViewportHeight } =
    useEditorStore();

  const viewportWidth =
    viewportMode === "custom"
      ? customViewportWidth
      : VIEWPORT_WIDTHS[viewportMode] || 1280;

  const viewportHeight =
    viewportMode === "custom"
      ? customViewportHeight
      : VIEWPORT_HEIGHTS[viewportMode] || 800;

  return (
    <div
      data-mocker-canvas
      className="relative flex flex-1 items-start justify-center overflow-auto bg-[var(--vscode-editor-background,#1e1e1e)] p-4"
    >
      <MemoOverlay />
      <div
        className="relative flex-shrink-0 bg-white shadow-lg transition-all duration-300"
        style={{
          width: viewportWidth,
          maxWidth: viewportWidth,
          minHeight: viewportHeight,
        }}
      >
        {/* Size label */}
        <div className="absolute -top-5 left-0 text-[10px] text-[var(--vscode-descriptionForeground,#888)] font-mono">
          {viewportWidth} x {viewportHeight}
        </div>
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
