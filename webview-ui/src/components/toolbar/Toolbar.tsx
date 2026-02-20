import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { getVsCodeApi } from "../../utils/vscodeApi";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Undo2,
  Redo2,
  Sun,
  Moon,
  LayoutGrid,
  Move,
  Monitor,
  Tablet,
  Smartphone,
  Settings2,
  Circle,
  ExternalLink,
  Camera,
} from "lucide-react";

export function Toolbar() {
  const { t } = useTranslation();
  const { canUndo, canRedo, actions } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));
  const {
    layoutMode,
    setLayoutMode,
    themeMode,
    setThemeMode,
    viewportMode,
    setViewportMode,
    customViewportWidth,
    customViewportHeight,
    setCustomViewportSize,
    isDirty,
  } = useEditorStore();
  const [pendingLayout, setPendingLayout] = useState<"flow" | "absolute" | null>(null);
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [customW, setCustomW] = useState(String(customViewportWidth));
  const [customH, setCustomH] = useState(String(customViewportHeight));
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleUndo = () => actions.history.undo();
  const handleRedo = () => actions.history.redo();

  const handleLayoutChange = (mode: "flow" | "absolute") => {
    if (mode === layoutMode) return;
    setPendingLayout(mode);
  };

  const handleThemeToggle = () => {
    const newTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(newTheme);
  };

  const handleCustomViewport = () => {
    setViewportMode("custom");
    setShowCustomSize(true);
    setCustomW(String(customViewportWidth));
    setCustomH(String(customViewportHeight));
  };

  const applyCustomSize = () => {
    const w = parseInt(customW, 10);
    const h = parseInt(customH, 10);
    if (w > 0 && h > 0) {
      setCustomViewportSize(w, h);
    }
    setShowCustomSize(false);
  };

  const handleBrowserPreview = useCallback(() => {
    getVsCodeApi().postMessage({ type: "command:openBrowserPreview" });
  }, []);

  const handleExportImage = useCallback(() => {
    getVsCodeApi().postMessage({ type: "command:exportImage" });
  }, []);

  // Close popover on click outside
  useEffect(() => {
    if (!showCustomSize) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustomSize(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCustomSize]);

  return (
    <div className="flex h-10 items-center gap-1 border-b border-[var(--vscode-panel-border,#333)] bg-[var(--vscode-titleBar-activeBackground,#2d2d2d)] px-2">
      {/* Dirty indicator */}
      {isDirty && (
        <span title={t("toolbar.unsaved")} className="mr-1 flex items-center">
          <Circle size={8} fill="#e8a317" stroke="none" />
        </span>
      )}

      <ToolbarButton
        onClick={handleUndo}
        disabled={!canUndo}
        title={t("toolbar.undo")}
      >
        <Undo2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={handleRedo}
        disabled={!canRedo}
        title={t("toolbar.redo")}
      >
        <Redo2 size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => handleLayoutChange("flow")}
        active={layoutMode === "flow"}
        title={t("toolbar.layoutFlow")}
      >
        <LayoutGrid size={16} />
        <span className="ml-1 text-xs">{t("toolbar.layoutFlow")}</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => handleLayoutChange("absolute")}
        active={layoutMode === "absolute"}
        title={t("toolbar.layoutAbsolute")}
      >
        <Move size={16} />
        <span className="ml-1 text-xs">{t("toolbar.layoutAbsolute")}</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={handleThemeToggle}
        title={t("toolbar.theme")}
      >
        {themeMode === "light" ? <Sun size={16} /> : <Moon size={16} />}
        <span className="ml-1 text-xs">
          {themeMode === "light" ? t("toolbar.themeLight") : t("toolbar.themeDark")}
        </span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => setViewportMode("desktop")}
        active={viewportMode === "desktop"}
        title={t("toolbar.viewportDesktop")}
      >
        <Monitor size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setViewportMode("tablet")}
        active={viewportMode === "tablet"}
        title={t("toolbar.viewportTablet")}
      >
        <Tablet size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setViewportMode("mobile")}
        active={viewportMode === "mobile"}
        title={t("toolbar.viewportMobile")}
      >
        <Smartphone size={16} />
      </ToolbarButton>

      {/* Custom viewport button */}
      <div className="relative">
        <ToolbarButton
          onClick={handleCustomViewport}
          active={viewportMode === "custom"}
          title={t("toolbar.viewportCustom")}
        >
          <Settings2 size={16} />
          {viewportMode === "custom" && (
            <span className="ml-1 text-xs">
              {customViewportWidth}x{customViewportHeight}
            </span>
          )}
        </ToolbarButton>

        {showCustomSize && (
          <div
            ref={popoverRef}
            className="absolute right-0 top-full z-[9999] mt-1 rounded-md border border-[var(--vscode-panel-border,#454545)] bg-[var(--vscode-editor-background,#1e1e1e)] p-3 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyCustomSize()}
                className="w-20 rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] outline-none focus:border-[var(--vscode-focusBorder,#007fd4)]"
                min={100}
                placeholder="W"
              />
              <span className="text-xs text-[var(--vscode-descriptionForeground,#888)]">x</span>
              <input
                type="number"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyCustomSize()}
                className="w-20 rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] outline-none focus:border-[var(--vscode-focusBorder,#007fd4)]"
                min={100}
                placeholder="H"
              />
              <button
                type="button"
                onClick={applyCustomSize}
                className="rounded bg-[var(--vscode-button-background,#0e639c)] px-2 py-1 text-xs text-[var(--vscode-button-foreground,#fff)] hover:bg-[var(--vscode-button-hoverBackground,#1177bb)]"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>

      <Divider />

      <ToolbarButton
        onClick={handleBrowserPreview}
        title={t("toolbar.browserPreview")}
      >
        <ExternalLink size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={handleExportImage}
        title={t("toolbar.exportImage")}
      >
        <Camera size={16} />
      </ToolbarButton>

      <ConfirmDialog
        open={pendingLayout !== null}
        title={t("dialog.layoutSwitch.title")}
        message={t("dialog.layoutSwitch.message")}
        confirmLabel={t("dialog.layoutSwitch.confirm")}
        cancelLabel={t("dialog.layoutSwitch.cancel")}
        onConfirm={() => {
          if (pendingLayout) setLayoutMode(pendingLayout);
          setPendingLayout(null);
        }}
        onCancel={() => setPendingLayout(null)}
      />
    </div>
  );
}

function Divider() {
  return <div className="mx-2 h-5 w-px bg-[var(--vscode-panel-border,#444)]" />;
}

function ToolbarButton({
  onClick,
  disabled,
  active,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center rounded px-2 py-1 text-xs transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : active
            ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
            : "hover:bg-[var(--vscode-toolbar-hoverBackground,#383838)] text-[var(--vscode-foreground,#ccc)]"
      }`}
    >
      {children}
    </button>
  );
}
