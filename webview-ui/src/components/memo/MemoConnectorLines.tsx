import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { useEditor } from "@craftjs/core";
import { useEditorStore } from "../../stores/editorStore";

const MEMO_COLOR_HEX: Record<string, string> = {
  yellow: "#ca8a04",
  blue: "#2563eb",
  green: "#16a34a",
  pink: "#db2777",
  purple: "#9333ea",
  orange: "#ea580c",
};

interface LineData {
  memoId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export function MemoConnectorLines({
  scrollContentRef,
}: {
  scrollContentRef: RefObject<HTMLDivElement | null>;
}) {
  const { query, hoveredCraftNodeId } = useEditor((state) => {
    let nodeId: string | null = null;
    const hovered = state.events.hovered;
    if (hovered && typeof hovered === "object" && "values" in hovered) {
      const vals = [...(hovered as Set<string>).values()];
      nodeId = vals[0] || null;
    }
    return { hoveredCraftNodeId: nodeId };
  });

  const memos = useEditorStore((s) => s.memos);
  const memosVisible = useEditorStore((s) => s.memosVisible);
  const memoLineMode = useEditorStore((s) => s.memoLineMode);
  const hoveredMemoId = useEditorStore((s) => s.hoveredMemoId);
  const zoom = useEditorStore((s) => s.zoom);

  const [lines, setLines] = useState<LineData[]>([]);
  const rafRef = useRef(0);

  const computeLines = useCallback(() => {
    const content = scrollContentRef.current;
    if (!content) return;
    const scrollEl = content.parentElement;
    if (!scrollEl) return;
    const contentRect = content.getBoundingClientRect();

    const linkedMemos = memos.filter((m) => m.targetNodeId);
    if (linkedMemos.length === 0) {
      setLines([]);
      return;
    }

    // Determine which memos should show lines
    const visibleMemos = linkedMemos.filter((m) => {
      if (memoLineMode === "all") return true;
      // hover mode: show if this memo is hovered or its target node is hovered
      if (m.id === hoveredMemoId) return true;
      if (m.targetNodeId === hoveredCraftNodeId) return true;
      return false;
    });

    const newLines: LineData[] = [];

    for (const m of visibleMemos) {
      if (!m.targetNodeId) continue;

      let nodeDom: HTMLElement | null = null;
      try {
        nodeDom = query.node(m.targetNodeId).get()?.dom as HTMLElement | null;
      } catch {
        continue;
      }
      if (!nodeDom) continue;

      const nodeRect = nodeDom.getBoundingClientRect();
      const memoWidth = m.width || 256;
      // Memo sticker element height - approximate based on collapsed state
      const memoStickerEl = content.querySelector(`[data-memo-id="${m.id}"]`);
      const memoHeight = memoStickerEl ? memoStickerEl.getBoundingClientRect().height / 1 : 60;

      // Memo anchor: center of memo (in scrollContent coordinates)
      const mx = m.x + memoWidth / 2;
      const my = m.y + memoHeight / 2;

      // Node anchor: center of node (convert from screen to scrollContent coordinates)
      const nx = (nodeRect.left - contentRect.left + scrollEl.scrollLeft) / 1;
      const ny = (nodeRect.top - contentRect.top + scrollEl.scrollTop) / 1;
      const ncx = nx + nodeRect.width / 2;
      const ncy = ny + nodeRect.height / 2;

      newLines.push({
        memoId: m.id,
        x1: mx,
        y1: my,
        x2: ncx,
        y2: ncy,
        color: MEMO_COLOR_HEX[m.color] || MEMO_COLOR_HEX.yellow,
      });
    }

    setLines(newLines);
  }, [memos, memoLineMode, hoveredMemoId, hoveredCraftNodeId, scrollContentRef, query]);

  // Recompute on relevant changes
  useEffect(() => {
    rafRef.current = requestAnimationFrame(computeLines);
    return () => cancelAnimationFrame(rafRef.current);
  }, [computeLines, zoom]);

  // Recompute on scroll
  useEffect(() => {
    const scrollEl = scrollContentRef.current?.parentElement;
    if (!scrollEl) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(computeLines);
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [scrollContentRef, computeLines]);

  if (!memosVisible || lines.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-30"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      {lines.map((line) => (
        <g key={line.memoId}>
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={0.6}
          />
          <circle cx={line.x1} cy={line.y1} r={3} fill={line.color} opacity={0.6} />
          <circle cx={line.x2} cy={line.y2} r={3} fill={line.color} opacity={0.6} />
        </g>
      ))}
    </svg>
  );
}
