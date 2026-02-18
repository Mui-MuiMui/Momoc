import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, type NodeTree, type Node } from "@craftjs/core";
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

/** Generate a short random ID similar to Craft.js's internal getRandomId */
function freshId(): string {
  return Math.random().toString(36).slice(2, 12);
}

/**
 * Clone a NodeTree with fresh IDs so that addNodeTree doesn't overwrite
 * existing nodes. Craft.js's addNodeTree reuses the original IDs if present.
 *
 * Uses shallow cloning to preserve non-serializable references like
 * React component types (node.data.type).
 */
function cloneTreeWithFreshIds(tree: NodeTree): NodeTree {
  const idMap = new Map<string, string>();

  for (const oldId of Object.keys(tree.nodes)) {
    idMap.set(oldId, freshId());
  }

  const remapId = (id: string) => idMap.get(id) || id;

  const newNodes: Record<string, Node> = {};

  for (const [oldId, node] of Object.entries(tree.nodes)) {
    const newId = idMap.get(oldId)!;

    // Shallow clone data, preserving type reference (React component)
    const newData = {
      ...node.data,
      props: { ...node.data.props },
      custom: { ...(node.data.custom || {}) },
      parent: node.data.parent ? remapId(node.data.parent) : node.data.parent,
      nodes: (node.data.nodes || []).map(remapId),
      linkedNodes: Object.fromEntries(
        Object.entries(node.data.linkedNodes || {}).map(([k, v]) => [k, remapId(v as string)]),
      ),
    };

    newNodes[newId] = {
      id: newId,
      data: newData,
      info: { ...node.info },
      related: { ...node.related },
      events: { selected: false, dragged: false, hovered: false },
      rules: node.rules,
      dom: null,
      _hydrationTimestamp: Date.now(),
    } as unknown as Node;
  }

  return {
    rootNodeId: idMap.get(tree.rootNodeId)!,
    nodes: newNodes,
  };
}

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

  // Use refs to always access latest values in event handlers
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
      const node = nodeHelper.get();
      if (!node) return;
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
      const sel = selectedRef.current;
      const selNode = queryRef.current.node(sel).get();

      // Paste as sibling: add to the selected node's parent
      const parentId = selNode?.data?.parent;
      if (!parentId) return;

      // Capture the tree BEFORE any mutations
      const nodeTree = queryRef.current.node(clipboardNodeId).toNodeTree();
      const freshTree = cloneTreeWithFreshIds(nodeTree);

      // For cut: delete original first (tree already captured above)
      if (clipboardAction === "cut") {
        try {
          actionsRef.current.delete(clipboardNodeId);
        } catch {
          // Cut source may have already been removed
        }
        clipboardNodeId = null;
        clipboardAction = null;
      }

      // Then add the clone
      actionsRef.current.addNodeTree(freshTree, parentId);
    } catch {
      // Clipboard node no longer exists or target can't accept children
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
      // Clone with fresh IDs to avoid ID collision with original
      const freshTree = cloneTreeWithFreshIds(nodeTree);
      actionsRef.current.addNodeTree(freshTree, parentId);
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
