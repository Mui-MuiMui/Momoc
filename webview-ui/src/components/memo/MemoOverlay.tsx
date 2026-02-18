import { useState } from "react";
import { useEditor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { StickyNote, Plus, X } from "lucide-react";

interface Memo {
  id: string;
  targetId: string;
  text: string;
  x: number;
  y: number;
}

export function MemoOverlay() {
  const { t } = useTranslation();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const { selected } = useEditor((state) => {
    const nodeId = state.events.selected?.values().next().value;
    return { selected: nodeId || null };
  });

  const addMemo = () => {
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      targetId: selected || "root",
      text: "",
      x: 100 + memos.length * 20,
      y: 100 + memos.length * 20,
    };
    setMemos([...memos, newMemo]);
    setIsAdding(false);
  };

  const updateMemo = (id: string, text: string) => {
    setMemos(memos.map((m) => (m.id === id ? { ...m, text } : m)));
  };

  const removeMemo = (id: string) => {
    setMemos(memos.filter((m) => m.id !== id));
  };

  return (
    <>
      {/* Memo toggle button */}
      <div className="absolute right-2 top-2 z-50">
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 rounded bg-yellow-500/80 px-2 py-1 text-xs text-black hover:bg-yellow-500"
          title={t("memo.addNew")}
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
          <StickyNote size={14} />
        </button>
      </div>

      {isAdding && (
        <div className="absolute right-2 top-10 z-50">
          <button
            type="button"
            onClick={addMemo}
            className="rounded bg-yellow-400 px-3 py-1 text-xs text-black shadow hover:bg-yellow-300"
          >
            {t("memo.addNew")} {selected ? `→ #${selected}` : ""}
          </button>
        </div>
      )}

      {/* Memo stickers */}
      {memos.map((memo) => (
        <MemoSticker
          key={memo.id}
          memo={memo}
          onUpdate={(text) => updateMemo(memo.id, text)}
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
  onUpdate: (text: string) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: memo.x, y: memo.y });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="absolute z-40 w-48 rounded bg-yellow-200 shadow-lg"
      style={{ left: position.x, top: position.y }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="flex cursor-move items-center justify-between border-b border-yellow-300 px-2 py-1"
        onMouseDown={handleMouseDown}
      >
        <span className="text-xs font-semibold text-yellow-800">
          #{memo.targetId}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-yellow-600 hover:text-red-600"
        >
          <X size={12} />
        </button>
      </div>
      <textarea
        value={memo.text}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder={t("memo.placeholder")}
        className="w-full resize-none bg-transparent p-2 text-xs text-yellow-900 placeholder:text-yellow-600 focus:outline-none"
        rows={3}
      />
    </div>
  );
}
