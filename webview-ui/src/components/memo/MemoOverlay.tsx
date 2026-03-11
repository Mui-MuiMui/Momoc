import { useState, useRef, useEffect, useCallback, memo, type RefObject } from "react";
import { useEditor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { StickyNote, Plus, X, ChevronDown, ChevronRight, Link2, Unlink, GripVertical } from "lucide-react";
import { useEditorStore, type Memo, type MemoColor } from "../../stores/editorStore";

const MEMO_COLORS = [
  { name: "yellow", bg: "bg-yellow-200", header: "bg-yellow-300", border: "border-yellow-300", text: "text-yellow-900", headerText: "text-yellow-800", placeholder: "placeholder:text-yellow-600" },
  { name: "blue", bg: "bg-blue-200", header: "bg-blue-300", border: "border-blue-300", text: "text-blue-900", headerText: "text-blue-800", placeholder: "placeholder:text-blue-600" },
  { name: "green", bg: "bg-green-200", header: "bg-green-300", border: "border-green-300", text: "text-green-900", headerText: "text-green-800", placeholder: "placeholder:text-green-600" },
  { name: "pink", bg: "bg-pink-200", header: "bg-pink-300", border: "border-pink-300", text: "text-pink-900", headerText: "text-pink-800", placeholder: "placeholder:text-pink-600" },
  { name: "purple", bg: "bg-purple-200", header: "bg-purple-300", border: "border-purple-300", text: "text-purple-900", headerText: "text-purple-800", placeholder: "placeholder:text-purple-600" },
  { name: "orange", bg: "bg-orange-200", header: "bg-orange-300", border: "border-orange-300", text: "text-orange-900", headerText: "text-orange-800", placeholder: "placeholder:text-orange-600" },
] as const;

function getColorScheme(color: MemoColor) {
  return MEMO_COLORS.find((c) => c.name === color) || MEMO_COLORS[0];
}

/** Fixed "Add memo" button - render outside scroll container */
export function MemoAddButton() {
  const { t } = useTranslation();
  const memos = useEditorStore((s) => s.memos);
  const addMemo = useEditorStore((s) => s.addMemo);

  const handleAddMemo = () => {
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      title: "",
      body: "",
      color: "yellow",
      collapsed: false,
      x: 100 + memos.length * 20,
      y: 100 + memos.length * 20,
    };
    addMemo(newMemo);
  };

  return (
    <button
      type="button"
      onClick={handleAddMemo}
      className="flex items-center gap-1 rounded bg-yellow-500/80 px-2 py-1 text-xs text-black hover:bg-yellow-500"
      title={t("memo.addNew")}
    >
      <Plus size={14} />
      <StickyNote size={14} />
    </button>
  );
}

/** Scrollable memo stickers - render inside scroll container */
export function MemoStickers({
  scrollContentRef,
}: {
  scrollContentRef: RefObject<HTMLDivElement | null>;
}) {
  const memos = useEditorStore((s) => s.memos);
  const updateMemo = useEditorStore((s) => s.updateMemo);
  const removeMemo = useEditorStore((s) => s.removeMemo);

  const handleUpdate = useCallback(
    (id: string, updates: Partial<Memo>) => updateMemo(id, updates),
    [updateMemo],
  );

  const handleRemove = useCallback(
    (id: string) => removeMemo(id),
    [removeMemo],
  );

  return (
    <>
      {memos.map((memo) => (
        <MemoStickerMemo
          key={memo.id}
          memo={memo}
          scrollContentRef={scrollContentRef}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      ))}
    </>
  );
}

const MemoStickerMemo = memo(MemoSticker);

function MemoSticker({
  memo,
  scrollContentRef,
  onUpdate,
  onRemove,
}: {
  memo: Memo;
  scrollContentRef: RefObject<HTMLDivElement | null>;
  onUpdate: (id: string, updates: Partial<Memo>) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { query } = useEditor();
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const setHoveredMemoId = useEditorStore((s) => s.setHoveredMemoId);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: memo.x, y: memo.y });
  const [currentWidth, setCurrentWidth] = useState(memo.width || 256);
  const [currentHeight, setCurrentHeight] = useState(memo.height);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, startWidth: 256, startHeight: 0 });

  const colors = getColorScheme(memo.color);

  // Get linked node display label (e.g. "Button[qqU5A87koR]")
  const linkedNodeLabel = (() => {
    if (!memo.targetNodeId) return null;
    try {
      const node = query.node(memo.targetNodeId).get();
      if (!node) return null;
      const displayName =
        node.data.custom?.displayName ||
        node.data.displayName ||
        (typeof node.data.type === "string"
          ? node.data.type
          : node.data.type?.name) ||
        "Element";
      return `${String(displayName)}[${memo.targetNodeId}]`;
    } catch {
      return null;
    }
  })();

  const positionRef = useRef(position);
  positionRef.current = position;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = scrollContentRef.current;
    if (!container) return;
    const scrollEl = container.parentElement;
    const rect = container.getBoundingClientRect();
    const scrollLeft = scrollEl?.scrollLeft ?? 0;
    const scrollTop = scrollEl?.scrollTop ?? 0;
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - rect.left + scrollLeft - position.x,
      y: e.clientY - rect.top + scrollTop - position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const container = scrollContentRef.current;
      if (!container) return;
      const scrollEl = container.parentElement;
      const rect = container.getBoundingClientRect();
      const scrollLeft = scrollEl?.scrollLeft ?? 0;
      const scrollTop = scrollEl?.scrollTop ?? 0;
      const newPos = {
        x: e.clientX - rect.left + scrollLeft - dragOffsetRef.current.x,
        y: e.clientY - rect.top + scrollTop - dragOffsetRef.current.y,
      };
      setPosition(newPos);
    },
    [scrollContentRef],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onUpdate(memo.id, { x: positionRef.current.x, y: positionRef.current.y });
  }, [memo.id, onUpdate]);

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // --- Resize handlers ---
  const MEMO_MIN_WIDTH = 200;
  const MEMO_MIN_HEIGHT = 80;

  const memoElRef = useRef<HTMLDivElement>(null);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Measure actual rendered height as start value
    const actualHeight = memoElRef.current?.offsetHeight || currentHeight || 120;
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startWidth: currentWidth,
      startHeight: actualHeight,
    };
    // Lock height once resize starts (switch from auto to explicit)
    setCurrentHeight(actualHeight);
  };

  const handleResizeMouseMove = useCallback(
    (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.mouseX;
      const dy = e.clientY - resizeStartRef.current.mouseY;
      setCurrentWidth(Math.max(MEMO_MIN_WIDTH, resizeStartRef.current.startWidth + dx));
      setCurrentHeight(Math.max(MEMO_MIN_HEIGHT, resizeStartRef.current.startHeight + dy));
    },
    [],
  );

  const currentWidthRef = useRef(currentWidth);
  currentWidthRef.current = currentWidth;
  const currentHeightRef = useRef(currentHeight);
  currentHeightRef.current = currentHeight;

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
    onUpdate(memo.id, { width: currentWidthRef.current, height: currentHeightRef.current });
  }, [memo.id, onUpdate]);

  useEffect(() => {
    if (!isResizing) return;
    document.addEventListener("mousemove", handleResizeMouseMove);
    document.addEventListener("mouseup", handleResizeMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleResizeMouseMove);
      document.removeEventListener("mouseup", handleResizeMouseUp);
    };
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  const toggleCollapse = () => {
    onUpdate(memo.id, { collapsed: !memo.collapsed });
  };

  const handleLinkNode = () => {
    if (memo.targetNodeId) {
      // Unlink
      onUpdate(memo.id, { targetNodeId: undefined });
    } else if (selectedNodeId) {
      // Link to currently selected node
      onUpdate(memo.id, { targetNodeId: selectedNodeId });
    }
  };

  return (
    <div
      ref={memoElRef}
      className={`absolute z-40 flex flex-col rounded shadow-lg ${colors.bg} ${isDragging || isResizing ? "select-none" : ""}`}
      data-memo-id={memo.id}
      style={{ left: position.x, top: position.y, width: currentWidth, ...(currentHeight != null ? { height: currentHeight } : {}) }}
      onMouseEnter={() => setHoveredMemoId(memo.id)}
      onMouseLeave={() => setHoveredMemoId(null)}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-1 rounded-t px-1 py-1.5 ${colors.header}`}
      >
        {/* Drag handle */}
        <div
          className={`shrink-0 cursor-grab active:cursor-grabbing ${colors.headerText} opacity-50 hover:opacity-100`}
          onMouseDown={handleMouseDown}
        >
          <GripVertical size={14} />
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          className={`shrink-0 ${colors.headerText} hover:opacity-70`}
        >
          {memo.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        <input
          type="text"
          value={memo.title}
          onChange={(e) => onUpdate(memo.id, { title: e.target.value })}
          placeholder={t("memo.titlePlaceholder")}
          className={`flex-1 bg-transparent text-xs font-semibold ${colors.headerText} placeholder:${colors.headerText}/60 outline-none`}
        />

        {/* Link to element button */}
        <button
          type="button"
          onClick={handleLinkNode}
          title={
            memo.targetNodeId
              ? t("memo.unlink")
              : selectedNodeId
                ? t("memo.linkSelected")
                : t("memo.selectToLink")
          }
          className={`shrink-0 ${memo.targetNodeId ? "text-blue-600" : colors.headerText} hover:opacity-70 ${!memo.targetNodeId && !selectedNodeId ? "opacity-30" : ""}`}
          disabled={!memo.targetNodeId && !selectedNodeId}
        >
          {memo.targetNodeId ? <Unlink size={12} /> : <Link2 size={12} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`shrink-0 rounded-full border-2 border-white/50 ${colors.bg}`}
            style={{ width: 14, height: 14 }}
            title={t("memo.changeColor")}
          />
          {showColorPicker && (
            <div className="absolute right-0 top-full z-50 mt-1 flex gap-1 rounded bg-white p-1.5 shadow-lg">
              {MEMO_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    onUpdate(memo.id, { color: c.name });
                    setShowColorPicker(false);
                  }}
                  className={`rounded-full ${c.bg} ${memo.color === c.name ? "ring-2 ring-gray-600" : ""}`}
                  style={{ width: 18, height: 18 }}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(memo.id)}
          className={`shrink-0 ${colors.headerText} hover:text-red-600`}
        >
          <X size={12} />
        </button>
      </div>

      {/* Linked element indicator */}
      {linkedNodeLabel && (
        <div className={`flex items-center gap-1 px-2 py-0.5 text-[10px] ${colors.text} opacity-70 border-b ${colors.border}`}>
          <Link2 size={10} />
          <span className="truncate font-mono">{linkedNodeLabel}</span>
        </div>
      )}

      {/* Body - collapsible */}
      {!memo.collapsed && (
        <div className={`flex-1 overflow-hidden border-t ${colors.border}`}>
          <textarea
            value={memo.body}
            onChange={(e) => onUpdate(memo.id, { body: e.target.value })}
            placeholder={t("memo.placeholder")}
            className={`h-full w-full resize-none bg-transparent p-2 text-xs ${colors.text} ${colors.placeholder} focus:outline-none`}
            rows={currentHeight != null ? undefined : 3}
          />
        </div>
      )}

      {/* Resize handle */}
      <div
        className={`absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize ${colors.headerText} opacity-30 hover:opacity-70`}
        onMouseDown={handleResizeMouseDown}
      >
        <svg viewBox="0 0 12 12" fill="currentColor" className="h-full w-full">
          <path d="M11 6L6 11M11 9L9 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
}
