import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, Element, type NodeTree } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { paletteItems, resolvers, type ResolverKey } from "../../crafts/resolvers";
import { Search, ChevronLeft, ChevronRight, Upload, RotateCcw, Pencil, Trash2, RefreshCw } from "lucide-react";
import * as Icons from "lucide-react";
import { useEditorStore } from "../../stores/editorStore";
import { useVscodeMessage, useSendMessage } from "../../hooks/useVscodeMessage";
import type { CustomComponentEntry } from "../../shared/messages";
import { buildGroupTreeFromCraftState } from "../../utils/customComponentUtils";

type SortMode = "category" | "alpha-asc" | "alpha-desc";
type PaletteTab = "standard" | "custom";

const SORT_MODE_KEY = "momoc.palette.sortMode";

function loadSortMode(): SortMode {
  try {
    const saved = localStorage.getItem(SORT_MODE_KEY);
    if (saved === "category" || saved === "alpha-asc" || saved === "alpha-desc") return saved;
  } catch {
    // ignore
  }
  return "category";
}

const SUB_CATEGORIES = ["action", "display", "form", "layout", "navigation", "overlay"] as const;
type SubCategory = (typeof SUB_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ComponentPalette() {
  const { t } = useTranslation();
  const { connectors, actions, query } = useEditor();
  const isPaletteOpen = useEditorStore((s) => s.isPaletteOpen);
  const togglePalette = useEditorStore((s) => s.togglePalette);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>(loadSortMode);
  const [activeTab, setActiveTab] = useState<PaletteTab>("standard");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    layout: true,
    shadcn: true,
    html: true,
    icon: true,
  });
  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({
    "shadcn:action": true,
    "shadcn:display": true,
    "shadcn:form": true,
    "shadcn:layout": true,
    "shadcn:navigation": true,
    "shadcn:overlay": true,
    "icon:lucide": true,
  });
  const [customComponents, setCustomComponents] = useState<CustomComponentEntry[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage();

  const actionsRef = useRef(actions);
  const queryRef = useRef(query);
  actionsRef.current = actions;
  queryRef.current = query;

  const pageFilePath = useEditorStore((s) => s.fileName);
  const pageFilePathRef = useRef(pageFilePath);
  pageFilePathRef.current = pageFilePath;

  // 一括「再読み込みして差し替え」で待機中のコンポーネントID集合
  const pendingReloadAllIdsRef = useRef<Set<string>>(new Set());

  // 1ノードをエントリで差し替える（ref パターン・stale closure 回避）
  const replaceGroupInPlaceRef = useRef<(nodeId: string, entry: CustomComponentEntry) => void>(() => {});
  replaceGroupInPlaceRef.current = (nodeId: string, entry: CustomComponentEntry) => {
    try {
      const node = queryRef.current.node(nodeId).get();
      if (!node) return;
      const { top, left, className } = node.data.props as Record<string, string>;
      const parentId = node.data.parent;
      if (!parentId) return;
      const tree = buildGroupTreeFromCraftState(entry.craftState, entry.path, pageFilePathRef.current, entry.id);
      if (!tree) return;
      const root = tree.nodes[tree.rootNodeId];
      if (top) root.data.props.top = top;
      if (left) root.data.props.left = left;
      if (className) root.data.props.className = className;
      actionsRef.current.delete(nodeId);
      actionsRef.current.addNodeTree(tree, parentId);
    } catch {
      // Node may have been removed
    }
  };

  // 指定コンポーネントIDの全インスタンスを差し替える
  const replaceAllInstancesRef = useRef<(componentId: string, entry: CustomComponentEntry) => void>(() => {});
  replaceAllInstancesRef.current = (componentId: string, entry: CustomComponentEntry) => {
    const state = queryRef.current.getState();
    const matchingIds = Object.keys(state.nodes).filter(
      (id) => state.nodes[id]?.data?.custom?.customComponentId === componentId,
    );
    for (const nodeId of matchingIds) {
      replaceGroupInPlaceRef.current(nodeId, entry);
    }
  };

  // 初回マウント時にカスタムコンポーネント一覧を取得
  useEffect(() => {
    sendMessage({ type: "customComponent:getAll" });
  }, [sendMessage]);

  // メッセージ受信
  useVscodeMessage(
    useCallback((message) => {
      if (message.type === "customComponent:all") {
        setCustomComponents(message.payload);
        useEditorStore.getState().setCustomComponents(message.payload);
      } else if (message.type === "customComponent:importResult") {
        if ("error" in message.payload) {
          // エラーは警告表示
          console.warn("[CustomComponent] import error:", message.payload.error);
        } else {
          setCustomComponents((prev) => {
            const updated = [...prev, message.payload as CustomComponentEntry];
            useEditorStore.getState().setCustomComponents(updated);
            return updated;
          });
        }
      } else if (message.type === "customComponent:reloadResult") {
        const { id, entry } = message.payload;
        if (entry) {
          setCustomComponents((prev) => {
            const updated = prev.map((c) => (c.id === id ? entry : c));
            useEditorStore.getState().setCustomComponents(updated);
            return updated;
          });
          // 一括「再読み込みして差し替え」の待機中なら全インスタンスを置換
          if (pendingReloadAllIdsRef.current.has(id)) {
            pendingReloadAllIdsRef.current.delete(id);
            replaceAllInstancesRef.current(id, entry);
          }
        }
      } else if (message.type === "customComponent:removeResult") {
        setCustomComponents((prev) => {
          const updated = prev.filter((c) => c.id !== message.payload.id);
          useEditorStore.getState().setCustomComponents(updated);
          return updated;
        });
      } else if (message.type === "customComponent:updatePathResult") {
        const { id, entry } = message.payload;
        if (entry) {
          setCustomComponents((prev) => {
            const updated = prev.map((c) => (c.id === id ? entry : c));
            useEditorStore.getState().setCustomComponents(updated);
            return updated;
          });
        }
      }
    }, []),
  );

  // コンテキストメニューを閉じる
  useEffect(() => {
    if (!contextMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!contextMenuRef.current?.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [contextMenu]);

  const layoutMode = useEditorStore((s) => s.layoutMode);
  const filteredItems = paletteItems.filter(
    (item) => item.enabled !== false
      && (!item.absoluteOnly || layoutMode === "absolute")
      && item.label.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [
    { key: "layout" as const, label: "Layout" },
    { key: "shadcn" as const, label: t("palette.shadcn") },
    { key: "html" as const, label: t("palette.html") },
    { key: "icon" as const, label: t("palette.icon") },
  ];

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubCategory = (key: string) => {
    setExpandedSubCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAlphaToggle = () => {
    const next: SortMode = sortMode === "alpha-asc" ? "alpha-desc" : "alpha-asc";
    setSortMode(next);
    try { localStorage.setItem(SORT_MODE_KEY, next); } catch { /* ignore */ }
  };

  const handleCategoryToggle = () => {
    setSortMode("category");
    try { localStorage.setItem(SORT_MODE_KEY, "category"); } catch { /* ignore */ }
  };

  const isAlphaMode = sortMode === "alpha-asc" || sortMode === "alpha-desc";

  if (!isPaletteOpen) {
    return (
      <div className="flex w-8 flex-col items-center border-r border-[var(--vscode-panel-border,#333)] bg-[var(--vscode-sideBar-background,#252526)] pt-2">
        <button
          type="button"
          onClick={togglePalette}
          title={t("palette.title")}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-56 flex-col border-r border-[var(--vscode-panel-border,#333)] bg-[var(--vscode-sideBar-background,#252526)]">
      <div className="border-b border-[var(--vscode-panel-border,#333)] p-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--vscode-sideBarTitle-foreground,#bbb)]">
            {t("palette.title")}
          </h2>
          <div className="flex gap-1">
            {activeTab === "standard" && (
              <>
                <button
                  type="button"
                  onClick={handleAlphaToggle}
                  title={t("palette.sortAlpha")}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                    isAlphaMode
                      ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                      : "text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
                  }`}
                >
                  {sortMode === "alpha-desc" ? "Z–A" : "A–Z"}
                </button>
                <button
                  type="button"
                  onClick={handleCategoryToggle}
                  title={t("palette.sortCategory")}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                    sortMode === "category"
                      ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                      : "text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
                  }`}
                >
                  ≡
                </button>
              </>
            )}
            <button
              type="button"
              onClick={togglePalette}
              title={t("palette.collapse")}
              className="rounded px-1 py-0.5 text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {/* タブ切り替え */}
        <div className="mb-2 flex border-b border-[var(--vscode-panel-border,#333)]">
          <button
            type="button"
            onClick={() => setActiveTab("standard")}
            className={`flex-1 py-1 text-[10px] font-medium transition-colors ${
              activeTab === "standard"
                ? "border-b-2 border-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-foreground,#ccc)]"
                : "text-[var(--vscode-foreground,#888)] hover:text-[var(--vscode-foreground,#ccc)]"
            }`}
          >
            コンポーネント
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-1 text-[10px] font-medium transition-colors ${
              activeTab === "custom"
                ? "border-b-2 border-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-foreground,#ccc)]"
                : "text-[var(--vscode-foreground,#888)] hover:text-[var(--vscode-foreground,#ccc)]"
            }`}
          >
            カスタム
          </button>
        </div>

        {activeTab === "standard" && (
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--vscode-input-placeholderForeground,#666)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("palette.search")}
              className="w-full rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] py-1 pl-7 pr-2 text-xs text-[var(--vscode-input-foreground,#ccc)] placeholder:text-[var(--vscode-input-placeholderForeground,#666)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {activeTab === "custom" ? (
          // カスタムタブ
          <div className="flex flex-col gap-2 p-1">
            <button
              type="button"
              onClick={() => sendMessage({ type: "customComponent:import" })}
              className="flex items-center justify-center gap-1.5 rounded border border-[var(--vscode-button-background,#0e639c)] px-2 py-1.5 text-xs text-[var(--vscode-button-background,#0e639c)] hover:bg-[var(--vscode-button-background,#0e639c)] hover:text-[var(--vscode-button-foreground,#fff)] transition-colors"
            >
              <Upload size={12} />
              .moc をインポート
            </button>
            {customComponents.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  for (const entry of customComponents) {
                    pendingReloadAllIdsRef.current.add(entry.id);
                    sendMessage({ type: "customComponent:reload", payload: { id: entry.id } });
                  }
                  // 15秒でタイムアウトし、未受信のIDを破棄する
                  setTimeout(() => { pendingReloadAllIdsRef.current.clear(); }, 15_000);
                }}
                title="全て再読み込みして差し替え"
                className="flex items-center justify-center gap-1.5 rounded border border-[var(--vscode-panel-border,#333)] px-2 py-1.5 text-xs text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)] transition-colors"
              >
                <RefreshCw size={12} />
                全て再読み込みして差し替え
              </button>
            )}
            {customComponents.length === 0 ? (
              <p className="mt-4 text-center text-[10px] text-[var(--vscode-foreground,#666)]">
                インポートした .moc がここに表示されます
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {customComponents.map((entry) => (
                  <CustomComponentCard
                    key={entry.id}
                    entry={entry}
                    connectors={connectors}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, id: entry.id });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : isAlphaMode ? (
          // アルファベット順フラット表示
          <div className="grid grid-cols-2 gap-1 px-1 py-1">
            {[...filteredItems]
              .sort((a, b) =>
                sortMode === "alpha-desc"
                  ? b.label.localeCompare(a.label)
                  : a.label.localeCompare(b.label),
              )
              .map((item) => (
                <PaletteItemCard key={item.resolverKey} item={item} connectors={connectors} />
              ))}
          </div>
        ) : (
          // カテゴリ順表示
          (() => {
            const visibleCats = categories.filter(
              (cat) => filteredItems.filter((i) => i.category === cat.key).length > 0,
            );
            return visibleCats.map((cat, catIdx) => {
              const catItems = filteredItems.filter((i) => i.category === cat.key);

              return (
                <div key={cat.key} className={catIdx > 0 ? "mt-3" : ""}>
                  {catIdx > 0 && (
                    <hr className="mb-2 border-[var(--vscode-panel-border,#333)]" />
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.key)}
                    className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[var(--vscode-sideBarSectionHeader-foreground,#bbb)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
                  >
                    <span className={`transition-transform ${expandedCategories[cat.key] ? "rotate-90" : ""}`}>
                      ▶
                    </span>
                    {cat.label}
                  </button>

                  {expandedCategories[cat.key] && (
                    cat.key === "shadcn" || cat.key === "icon" ? (
                      // shadcn / icon は中カテゴリでグループ化
                      <div className="ml-2">
                        {(() => {
                          const uniqueSubs = [...new Set(catItems.map((i) => i.subCategory).filter(Boolean))] as string[];
                          const visibleSubs = cat.key === "shadcn"
                            ? (SUB_CATEGORIES as readonly string[]).filter((sub) => catItems.some((i) => i.subCategory === sub))
                            : uniqueSubs;
                          return visibleSubs.map((sub, subIdx) => {
                            const subItems = catItems.filter((i) => i.subCategory === sub);
                            const subKey = `${cat.key}:${sub}`;
                            const subLabel = t(`palette.sub.${sub}` as keyof typeof import("../../i18n/en.json"));
                            return (
                              <div key={sub} className={subIdx > 0 ? "mt-2" : ""}>
                                {subIdx > 0 && (
                                  <hr className="mb-1.5 border-[var(--vscode-panel-border,#2a2a2a)]" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleSubCategory(subKey)}
                                  className="flex w-full items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-[var(--vscode-foreground,#aaa)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
                                >
                                  <span className={`text-[9px] transition-transform ${expandedSubCategories[subKey] ? "rotate-90" : ""}`}>
                                    ▶
                                  </span>
                                  {subLabel}
                                </button>
                                {expandedSubCategories[subKey] && (
                                  <div className="grid grid-cols-2 gap-1 px-1 py-1">
                                    {subItems.map((item) => (
                                      <PaletteItemCard key={item.resolverKey} item={item} connectors={connectors} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1 px-1 py-1">
                        {catItems.map((item) => (
                          <PaletteItemCard key={item.resolverKey} item={item} connectors={connectors} />
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* 右クリックコンテキストメニュー */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
          className="rounded border border-[var(--vscode-panel-border,#333)] bg-[var(--vscode-menu-background,#252526)] py-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              sendMessage({ type: "customComponent:reload", payload: { id: contextMenu.id } });
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-1 text-xs text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
          >
            <RotateCcw size={12} />
            再読み込み
          </button>
          <button
            type="button"
            onClick={() => {
              sendMessage({ type: "customComponent:updatePath", payload: { id: contextMenu.id } });
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-1 text-xs text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
          >
            <Pencil size={12} />
            パスを変更
          </button>
          <hr className="my-1 border-[var(--vscode-panel-border,#333)]" />
          <button
            type="button"
            onClick={() => {
              sendMessage({ type: "customComponent:remove", payload: { id: contextMenu.id } });
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-1 text-xs text-red-400 hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
          >
            <Trash2 size={12} />
            削除
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 自由配置モード専用ドラッグ実装。
 * Craft.js DnD を使わずゴーストを表示し、mouseup 位置でノードを直接 ROOT へ追加する。
 * ネイティブキャプチャフェーズから呼び出すため MouseEvent を受け取る。
 */
function startAbsoluteDrag(
  startEvent: MouseEvent,
  label: string,
  getTree: () => NodeTree | null,
  zoom: number,
  actions: ReturnType<typeof useEditor>["actions"],
  query: ReturnType<typeof useEditor>["query"],
) {
  startEvent.preventDefault();

  // ゴースト要素を作成
  const ghost = document.createElement("div");
  ghost.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    background: rgba(33,150,243,0.15);
    border: 1.5px dashed #2196f3;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 11px;
    color: #2196f3;
    font-family: system-ui, sans-serif;
    white-space: nowrap;
    left: ${startEvent.clientX + 10}px;
    top: ${startEvent.clientY + 10}px;
  `;
  ghost.textContent = label;
  document.body.appendChild(ghost);

  const onMove = (e: MouseEvent) => {
    ghost.style.left = `${e.clientX + 10}px`;
    ghost.style.top = `${e.clientY + 10}px`;
  };

  const onUp = (e: MouseEvent) => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    ghost.remove();

    // キャンバスエリア（minHeight 付きの zoom スケール div）でドロップ範囲を確認
    const canvasArea = document.querySelector("[data-momoc-canvas-area]");
    if (!canvasArea) return;
    const rect = canvasArea.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
      return;

    const tree = getTree();
    if (!tree) return;

    // ドロップ位置をキャンバス相対座標に変換（getBoundingClientRect は zoom 後の視覚座標）
    const x = Math.max(0, Math.round((e.clientX - rect.left) / zoom));
    const y = Math.max(0, Math.round((e.clientY - rect.top) / zoom));

    const rootNode = tree.nodes[tree.rootNodeId];
    if (rootNode) {
      rootNode.data.props.top = `${y}px`;
      rootNode.data.props.left = `${x}px`;
    }

    // MutationObserver で新規 DOM 要素追加をブラウザ描画前に検知し、
    // 即座に position/top/left を適用してフラッシュを防止する。
    // useEffect は dom ref が null → 非null になる2回目のレンダーまで動かないため、
    // DOM レベルで先に位置を確定させる必要がある。
    let observer: MutationObserver | undefined;
    try {
      const rootDom = query.node("ROOT").get().dom;
      if (rootDom) {
        observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const added of Array.from(mutation.addedNodes)) {
              if (added instanceof HTMLElement) {
                added.style.position = "absolute";
                added.style.top = `${y}px`;
                added.style.left = `${x}px`;
              }
            }
          }
          observer?.disconnect();
        });
        observer.observe(rootDom, { childList: true });
      }
    } catch {
      // query 失敗時は observer なしで続行（useEffect が後から適用）
    }

    actions.addNodeTree(tree, "ROOT");

    // 安全のため observer をクリーンアップ
    setTimeout(() => observer?.disconnect(), 200);
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function CustomComponentCard({
  entry,
  connectors,
  onContextMenu,
}: {
  entry: CustomComponentEntry;
  connectors: ReturnType<typeof useEditor>["connectors"];
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { query, actions } = useEditor();
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const zoom = useEditorStore((s) => s.zoom);
  const pageFilePath = useEditorStore((s) => s.fileName);

  const stateRef = useRef({ layoutMode, zoom, query, actions, entry, pageFilePath });
  stateRef.current = { layoutMode, zoom, query, actions, entry, pageFilePath };
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => {
      if (stateRef.current.layoutMode !== "absolute") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const { zoom, query, actions, entry, pageFilePath } = stateRef.current;
      startAbsoluteDrag(e, entry.name, () => buildGroupTreeFromCraftState(entry.craftState, entry.path, pageFilePath, entry.id), zoom, actions, query);
    };
    el.addEventListener("mousedown", onMouseDown, true);
    return () => el.removeEventListener("mousedown", onMouseDown, true);
  }, []);

  return (
    <div
      ref={(ref) => {
        elementRef.current = ref;
        if (!ref) return;
        if (layoutMode === "absolute") {
          // HTML5 drag を無効化して mouseup ベースのカスタムドラッグを機能させる
          ref.setAttribute("draggable", "false");
          return;
        }
        connectors.create(ref, () => {
          const tree = buildGroupTreeFromCraftState(entry.craftState, entry.path, pageFilePath, entry.id);
          if (!tree) return <div />;
          return tree;
        });
      }}
      onContextMenu={onContextMenu}
      className="flex cursor-grab items-center gap-2 rounded border border-transparent px-2 py-1.5 text-left text-xs text-[var(--vscode-foreground,#ccc)] transition-colors hover:border-[var(--vscode-focusBorder,#007fd4)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)] active:cursor-grabbing"
    >
      <Icons.Layers size={14} className="shrink-0 opacity-60" />
      <span className="truncate">{entry.name}</span>
    </div>
  );
}

function PaletteItemCard({
  item,
  connectors,
}: {
  item: (typeof paletteItems)[0];
  connectors: ReturnType<typeof useEditor>["connectors"];
}) {
  const { query, actions } = useEditor();
  const layoutMode = useEditorStore((s) => s.layoutMode);
  const zoom = useEditorStore((s) => s.zoom);
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[item.icon];
  const Component = resolvers[item.resolverKey as ResolverKey];

  // stateRef で最新の値をネイティブリスナーから参照
  const stateRef = useRef({ layoutMode, zoom, query, actions });
  stateRef.current = { layoutMode, zoom, query, actions };
  const elementRef = useRef<HTMLDivElement | null>(null);

  // キャプチャフェーズで Craft.js より先に処理し、自由配置ドラッグを開始
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => {
      if (stateRef.current.layoutMode !== "absolute") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const { zoom, query, actions } = stateRef.current;
      startAbsoluteDrag(
        e,
        item.label,
        () =>
          query
            .parseReactElement(
              <Element is={Component} canvas={item.isCanvas ?? false} {...item.defaultProps} />,
            )
            .toNodeTree(),
        zoom,
        actions,
        query,
      );
    };
    el.addEventListener("mousedown", onMouseDown, true);
    return () => el.removeEventListener("mousedown", onMouseDown, true);
  }, []); // stateRef で最新値を参照するため依存配列は空

  return (
    <div
      ref={(ref) => {
        elementRef.current = ref;
        if (!ref) return;
        if (layoutMode === "absolute") {
          // HTML5 drag を無効化して mouseup ベースのカスタムドラッグを機能させる
          ref.setAttribute("draggable", "false");
          return;
        }
        connectors.create(
          ref,
          <Element is={Component} canvas={item.isCanvas ?? false} {...item.defaultProps} />,
        );
      }}
      className="flex cursor-grab flex-col items-center gap-1 rounded border border-transparent p-2 text-center text-xs text-[var(--vscode-foreground,#ccc)] transition-colors hover:border-[var(--vscode-focusBorder,#007fd4)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)] active:cursor-grabbing"
    >
      {IconComponent && <IconComponent size={18} />}
      <span className="truncate leading-tight">{item.label}</span>
    </div>
  );
}
