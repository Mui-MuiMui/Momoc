import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, type NodeTree, type Node } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { Trash2, Copy, Scissors, ClipboardPaste, CopyPlus } from "lucide-react";
import { resolvers } from "../../crafts/resolvers";

interface MenuPosition {
  x: number;
  y: number;
}

const CLIP_PREFIX = "@moc-clipdata:";

/** NodeTree を JSON シリアライズ可能な形式に変換（type: 関数 → コンポーネント名文字列） */
function serializeTree(tree: NodeTree): string {
  const serializable = {
    rootNodeId: tree.rootNodeId,
    nodes: Object.fromEntries(
      Object.entries(tree.nodes).map(([id, node]) => {
        const typeFn = node.data.type as unknown as ((...args: unknown[]) => unknown) & { resolvedName?: string };
        const typeName =
          Object.entries(resolvers).find(([, fn]) => fn === typeFn)?.[0] ??
          typeFn?.resolvedName ??
          (typeof typeFn === "string" ? typeFn : "CraftDiv");
        // rules は関数を含むため JSON化で消滅する。必要フィールドのみ明示的にピックアップ。
        return [
          id,
          {
            id: node.id,
            data: { ...node.data, type: typeName },
            dom: null,
            events: { selected: false, dragged: false, hovered: false },
          },
        ];
      }),
    ),
  };
  return CLIP_PREFIX + JSON.stringify(serializable);
}

/** JSON 文字列から NodeTree を復元（type: 文字列 → コンポーネント関数） */
function deserializeTree(text: string): NodeTree | null {
  if (!text.startsWith(CLIP_PREFIX)) return null;
  try {
    const raw = JSON.parse(text.slice(CLIP_PREFIX.length)) as {
      rootNodeId: string;
      nodes: Record<string, { id: string; data: Node["data"] & { type: string }; events: Node["events"] }>;
    };
    const nodes: Record<string, Node> = {};
    for (const [id, node] of Object.entries(raw.nodes)) {
      const typeFn = resolvers[node.data.type as keyof typeof resolvers];
      if (!typeFn) return null; // 未知のコンポーネントは拒否
      // craft.rules から関数を復元（JSONで消滅するため）
      const craftRules = (typeFn as { craft?: { rules?: { canDrag?: () => boolean; canDrop?: () => boolean; canMoveIn?: (...args: unknown[]) => boolean; canMoveOut?: () => boolean } } }).craft?.rules;
      nodes[id] = {
        id: node.id,
        data: { ...node.data, type: typeFn },
        dom: null,
        _hydrationTimestamp: Date.now(),
        events: { selected: false, dragged: false, hovered: false },
        rules: {
          canDrag: craftRules?.canDrag ?? (() => true),
          canDrop: craftRules?.canDrop ?? (() => true),
          canMoveIn: craftRules?.canMoveIn ?? (() => true),
          canMoveOut: craftRules?.canMoveOut ?? (() => true),
        },
        info: {},
        related: {},
      } as unknown as Node;
    }
    return { rootNodeId: raw.rootNodeId, nodes };
  } catch {
    return null;
  }
}

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
      info: { ...(node.info || {}) },
      related: { ...(node.related || {}) },
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
  const [hasClipboard, setHasClipboard] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { actions, selected, selectedIds, query } = useEditor((state) => {
    const ids = state.events.selected
      ? Array.from(state.events.selected)
      : [];
    return {
      selected: ids[0] || null,
      selectedIds: ids,
    };
  });

  const isMultiSelected = selectedIds.length > 1;

  // Sync Craft.js selection → editorStore so memo linking works
  const setSelectedNodeId = useEditorStore((s) => s.setSelectedNodeId);
  const setSelectedNodeIds = useEditorStore((s) => s.setSelectedNodeIds);
  useEffect(() => {
    setSelectedNodeId(selected);
    setSelectedNodeIds(selectedIds);
  }, [selected, selectedIds, setSelectedNodeId, setSelectedNodeIds]);

  // Use refs to always access latest values in event handlers
  const selectedRef = useRef(selected);
  const selectedIdsRef = useRef(selectedIds);
  const queryRef = useRef(query);
  const actionsRef = useRef(actions);
  selectedRef.current = selected;
  selectedIdsRef.current = selectedIds;
  queryRef.current = query;
  actionsRef.current = actions;

  const deleteSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length === 0) return;
    for (const nodeId of ids) {
      try {
        const nodeHelper = queryRef.current.node(nodeId);
        const node = nodeHelper.get();
        if (!node) continue;
        if (nodeHelper.isRoot() || nodeHelper.isTopLevelNode()) continue;
        if (!nodeHelper.isDeletable()) continue;
        actionsRef.current.delete(nodeId);
      } catch {
        // Node may have already been removed
      }
    }
    setMenuPos(null);
  }, []);

  const copySelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    try {
      const nodeTree = queryRef.current.node(sel).toNodeTree();
      // コピー時はIDを変えない（ペースト時にfreshIDを付与）
      navigator.clipboard.writeText(serializeTree(nodeTree)).then(() => {
        setHasClipboard(true);
      }).catch(() => {/* ignore */});
    } catch {
      // Node may not exist
    }
    setMenuPos(null);
  }, []);

  const cutSelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    try {
      const nodeHelper = queryRef.current.node(sel);
      if (nodeHelper.isRoot() || nodeHelper.isTopLevelNode()) return;
      if (!nodeHelper.isDeletable()) return;
      const nodeTree = nodeHelper.toNodeTree();
      // カット時もIDを変えない（ペースト時にfreshIDを付与）
      navigator.clipboard.writeText(serializeTree(nodeTree)).then(() => {
        setHasClipboard(true);
        // 切り取り：クリップボード書き込み確認後に元ノードを削除
        actionsRef.current.delete(sel);
      }).catch(() => {/* ignore */});
    } catch {
      // Node may not exist
    }
    setMenuPos(null);
  }, []);

  const pasteClipboard = useCallback(() => {
    if (!selectedRef.current) return;
    navigator.clipboard.readText().then((text) => {
      const tree = deserializeTree(text);
      if (!tree) return;
      try {
        const sel = selectedRef.current;
        if (!sel) return;
        const selNode = queryRef.current.node(sel).get();

        // Canvas (子を受け入れ可能) なら子として、そうでなければ親に兄弟として追加
        const isCanvas = selNode?.data?.isCanvas;
        const parentId = isCanvas ? sel : selNode?.data?.parent;
        if (!parentId) return;

        // 毎回 fresh IDs で貼り付け（連続貼り付け対応）
        const pasteTree = cloneTreeWithFreshIds(tree);
        actionsRef.current.addNodeTree(pasteTree, parentId);
      } catch {
        // target can't accept children
      }
    }).catch(() => {/* clipboard read failed */});
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
      if (selectedIdsRef.current.length === 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-momoc-canvas]")) {
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
      if (selectedIdsRef.current.length === 0) return;

      // Don't handle if focused on input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Arrow keys: move selected nodes by 1px in absolute mode
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const currentLayoutMode = useEditorStore.getState().layoutMode;
        if (currentLayoutMode === "absolute") {
          e.preventDefault();
          const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
          const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
          const ids = selectedIdsRef.current;
          for (const nodeId of ids) {
            try {
              const nodeHelper = queryRef.current.node(nodeId);
              const node = nodeHelper.get();
              if (!node?.dom) continue;
              const currentTop = parseInt(node.dom.style.top || "0", 10);
              const currentLeft = parseInt(node.dom.style.left || "0", 10);
              node.dom.style.top = `${currentTop + dy}px`;
              node.dom.style.left = `${currentLeft + dx}px`;
              actionsRef.current.setProp(nodeId, (props: Record<string, unknown>) => {
                props.top = `${currentTop + dy}px`;
                props.left = `${currentLeft + dx}px`;
              });
            } catch {
              // Node may not exist
            }
          }
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
      // Copy/Cut/Paste/Duplicate are single-selection only
      if (selectedIdsRef.current.length <= 1) {
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

  if (!menuPos || selectedIds.length === 0) return null;

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
        disabled={isMultiSelected}
      />
      <MenuItem
        icon={<Scissors size={14} />}
        label={t("contextMenu.cut")}
        shortcut="Ctrl+X"
        onClick={cutSelected}
        disabled={isMultiSelected}
      />
      <MenuItem
        icon={<ClipboardPaste size={14} />}
        label={t("contextMenu.paste")}
        shortcut="Ctrl+V"
        onClick={pasteClipboard}
        disabled={!hasClipboard || isMultiSelected}
      />
      <MenuItem
        icon={<CopyPlus size={14} />}
        label={t("contextMenu.duplicate")}
        shortcut="Ctrl+D"
        onClick={duplicateSelected}
        disabled={isMultiSelected}
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
