import { useEditor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useSendMessage } from "../../hooks/useVscodeMessage";
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
} from "lucide-react";

export function Toolbar() {
  const { t } = useTranslation();
  const { canUndo, canRedo, actions } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));
  const { layoutMode, setLayoutMode, themeMode, setThemeMode, viewportMode, setViewportMode } =
    useEditorStore();
  const sendMessage = useSendMessage();

  const handleUndo = () => actions.history.undo();
  const handleRedo = () => actions.history.redo();

  const handleLayoutChange = (mode: "flow" | "absolute") => {
    if (mode === layoutMode) return;
    if (confirm(t("dialog.layoutSwitch.message"))) {
      setLayoutMode(mode);
    }
  };

  const handleThemeToggle = () => {
    const newTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(newTheme);
    sendMessage("doc:save", { themeChange: newTheme });
  };

  return (
    <div className="flex h-10 items-center gap-1 border-b border-[var(--vscode-panel-border,#333)] bg-[var(--vscode-titleBar-activeBackground,#2d2d2d)] px-2">
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

      <div className="mx-2 h-5 w-px bg-[var(--vscode-panel-border,#444)]" />

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

      <div className="mx-2 h-5 w-px bg-[var(--vscode-panel-border,#444)]" />

      <ToolbarButton
        onClick={handleThemeToggle}
        title={t("toolbar.theme")}
      >
        {themeMode === "light" ? <Sun size={16} /> : <Moon size={16} />}
        <span className="ml-1 text-xs">
          {themeMode === "light" ? t("toolbar.themeLight") : t("toolbar.themeDark")}
        </span>
      </ToolbarButton>

      <div className="mx-2 h-5 w-px bg-[var(--vscode-panel-border,#444)]" />

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
    </div>
  );
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
