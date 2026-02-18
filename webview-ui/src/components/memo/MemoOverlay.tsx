import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StickyNote, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
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

export function MemoOverlay() {
  const { t } = useTranslation();
  const { memos, addMemo, updateMemo, removeMemo } = useEditorStore();

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
    <>
      {/* Add memo button */}
      <div className="absolute right-2 top-2 z-50">
        <button
          type="button"
          onClick={handleAddMemo}
          className="flex items-center gap-1 rounded bg-yellow-500/80 px-2 py-1 text-xs text-black hover:bg-yellow-500"
          title={t("memo.addNew")}
        >
          <Plus size={14} />
          <StickyNote size={14} />
        </button>
      </div>

      {/* Memo stickers */}
      {memos.map((memo) => (
        <MemoSticker
          key={memo.id}
          memo={memo}
          onUpdate={(updates) => updateMemo(memo.id, updates)}
          onRemove={() => removeMemo(memo.id)}
        />
      ))}
    </>
  );
}

function MemoSticker({
  memo,
  onUpdate,
  onRemove,
}: {
  memo: Memo;
  onUpdate: (updates: Partial<Memo>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: memo.x, y: memo.y });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const colors = getColorScheme(memo.color);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, textarea")) return;
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPos = {
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      };
      setPosition(newPos);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      onUpdate({ x: position.x, y: position.y });
    }
    setIsDragging(false);
  };

  const toggleCollapse = () => {
    onUpdate({ collapsed: !memo.collapsed });
  };

  return (
    <div
      className={`absolute z-40 rounded shadow-lg ${colors.bg} ${memo.collapsed ? "w-52" : "w-56"}`}
      style={{ left: position.x, top: position.y }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header - always visible, draggable */}
      <div
        className={`flex cursor-move items-center gap-1 rounded-t px-2 py-1.5 ${colors.header}`}
        onMouseDown={handleMouseDown}
      >
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
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder={t("memo.titlePlaceholder")}
          className={`flex-1 bg-transparent text-xs font-semibold ${colors.headerText} placeholder:${colors.headerText}/60 outline-none`}
        />

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
                    onUpdate({ color: c.name });
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
          onClick={onRemove}
          className={`shrink-0 ${colors.headerText} hover:text-red-600`}
        >
          <X size={12} />
        </button>
      </div>

      {/* Body - collapsible */}
      {!memo.collapsed && (
        <div className={`border-t ${colors.border}`}>
          <textarea
            value={memo.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder={t("memo.placeholder")}
            className={`w-full resize-none bg-transparent p-2 text-xs ${colors.text} ${colors.placeholder} focus:outline-none`}
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
