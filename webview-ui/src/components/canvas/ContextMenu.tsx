import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { Trash2, Copy, Scissors, ClipboardPaste, CopyPlus } from "lucide-react";

interface MenuPosition {
  x: number;
  y: number;
}

// Clipboard store (module-level since we can't use system clipboard for Craft nodes)
let clipboardNodeId: string | null = null;
let clipboardAction: "copy" | "cut" | null = null;

export function ContextMenu() {
  const { t } = useTranslation();
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { actions, selected, query } = useEditor((state) => {
    const nodeId = state.events.selected
      ? Array.from(state.events.selected)[0]
      : undefined;
    return {
      selected: nodeId || null,
    };
  });

  // Sync Craft.js selection → editorStore so memo linking works
  const setSelectedNodeId = useEditorStore((s) => s.setSelectedNodeId);
  useEffect(() => {
    setSelectedNodeId(selected);
  }, [selected, setSelectedNodeId]);

  // Use refs to always access latest values in event handlers,
  // avoiding stale closure issues with useCallback
  const selectedRef = useRef(selected);
  const queryRef = useRef(query);
  const actionsRef = useRef(actions);
  selectedRef.current = selected;
  queryRef.current = query;
  actionsRef.current = actions;

  const deleteSelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    try {
      const nodeHelper = queryRef.current.node(sel);
      // Check node still exists
      const node = nodeHelper.get();
      if (!node) return;
      // Don't delete root or top-level canvas node
      if (nodeHelper.isRoot() || nodeHelper.isTopLevelNode()) return;
      if (!nodeHelper.isDeletable()) return;
      actionsRef.current.delete(sel);
    } catch {
      // Node may have already been removed
    }
    setMenuPos(null);
  }, []);

  const copySelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    clipboardNodeId = sel;
    clipboardAction = "copy";
    setMenuPos(null);
  }, []);

  const cutSelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    clipboardNodeId = sel;
    clipboardAction = "cut";
    setMenuPos(null);
  }, []);

  const pasteClipboard = useCallback(() => {
    if (!clipboardNodeId || !selectedRef.current) return;
    try {
      const parentId = selectedRef.current;
      const nodeTree = queryRef.current.node(clipboardNodeId).toNodeTree();
      actionsRef.current.addNodeTree(nodeTree, parentId);

      if (clipboardAction === "cut") {
        const cutNode = queryRef.current.node(clipboardNodeId).get();
        if (cutNode?.data.parent) {
          actionsRef.current.delete(clipboardNodeId);
        }
        clipboardNodeId = null;
        clipboardAction = null;
      }
    } catch {
      // Target may not accept children
    }
    setMenuPos(null);
  }, []);

  const duplicateSelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    try {
      const node = queryRef.current.node(sel).get();
      const parentId = node?.data.parent;
      if (!parentId) return;
      const nodeTree = queryRef.current.node(sel).toNodeTree();
      actionsRef.current.addNodeTree(nodeTree, parentId);
    } catch {
      // ignore
    }
    setMenuPos(null);
  }, []);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!selectedRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-mocker-canvas]")) {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
      }
    },
    [],
  );

  const handleClick = useCallback(() => {
    setMenuPos(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedRef.current) return;

      // Don't handle if focused on input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copySelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault();
        cutSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteClipboard();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      }
    },
    [deleteSelected, copySelected, cutSelected, pasteClipboard, duplicateSelected],
  );

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleContextMenu, handleClick, handleKeyDown]);

  if (!menuPos || !selected) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] rounded-md border border-[var(--vscode-menu-border,#454545)] bg-[var(--vscode-menu-background,#252526)] py-1 shadow-xl"
      style={{ left: menuPos.x, top: menuPos.y }}
    >
      <MenuItem
        icon={<Copy size={14} />}
        label={t("contextMenu.copy")}
        shortcut="Ctrl+C"
        onClick={copySelected}
      />
      <MenuItem
        icon={<Scissors size={14} />}
        label={t("contextMenu.cut")}
        shortcut="Ctrl+X"
        onClick={cutSelected}
      />
      <MenuItem
        icon={<ClipboardPaste size={14} />}
        label={t("contextMenu.paste")}
        shortcut="Ctrl+V"
        onClick={pasteClipboard}
        disabled={!clipboardNodeId}
      />
      <MenuItem
        icon={<CopyPlus size={14} />}
        label={t("contextMenu.duplicate")}
        shortcut="Ctrl+D"
        onClick={duplicateSelected}
      />
      <div className="my-1 h-px bg-[var(--vscode-menu-separatorBackground,#454545)]" />
      <MenuItem
        icon={<Trash2 size={14} />}
        label={t("contextMenu.delete")}
        shortcut="Del"
        onClick={deleteSelected}
        danger
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : danger
            ? "text-red-400 hover:bg-[var(--vscode-menu-selectionBackground,#04395e)]"
            : "text-[var(--vscode-menu-foreground,#ccc)] hover:bg-[var(--vscode-menu-selectionBackground,#04395e)]"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-[var(--vscode-descriptionForeground,#888)]">
          {shortcut}
        </span>
      )}
    </button>
  );
}
