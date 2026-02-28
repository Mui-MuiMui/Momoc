import { useEditor } from "@craftjs/core";
import { parseResizableMeta, type ResizableMeta } from "../../crafts/shadcn/CraftResizable";

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

interface ResizableMetaEditorProps {
  value: string;
  selectedNodeId: string;
}

export function ResizableMetaEditor({ value, selectedNodeId }: ResizableMetaEditorProps) {
  const { actions } = useEditor((state) => ({ nodes: state.nodes }));

  const meta = parseResizableMeta(value);

  function updateMeta(newMeta: ResizableMeta) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.panelMeta = JSON.stringify(newMeta);
    });
  }

  function setDirection(direction: "horizontal" | "vertical") {
    updateMeta({ ...meta, direction });
  }

  function setSize(idx: number, size: string) {
    const newPanels = meta.panels.map((p, i) => (i === idx ? { ...p, size } : p));
    updateMeta({ ...meta, panels: newPanels });
  }

  const allNumeric = meta.panels.every((p) => typeof p.size === "number" || /^\d+(\.\d+)?%?$/.test(String(p.size).trim()));

  function addPanel() {
    const newKey = meta.nextKey;
    if (allNumeric) {
      const splitSize = Math.floor(50 / meta.panels.length);
      const newPanels = [
        ...meta.panels.map((p) => ({ ...p, size: Math.max(10, Number(p.size) - splitSize) })),
        { key: newKey, size: 50 },
      ];
      updateMeta({ ...meta, nextKey: newKey + 1, panels: newPanels });
    } else {
      updateMeta({ ...meta, nextKey: newKey + 1, panels: [...meta.panels, { key: newKey, size: 50 }] });
    }
  }

  function removePanel(idx: number) {
    if (meta.panels.length <= 2) return;
    if (allNumeric) {
      const removed = meta.panels[idx];
      const distributeSize = Math.floor(Number(removed.size) / (meta.panels.length - 1));
      const newPanels = meta.panels
        .filter((_, i) => i !== idx)
        .map((p) => ({ ...p, size: Number(p.size) + distributeSize }));
      updateMeta({ ...meta, panels: newPanels });
    } else {
      updateMeta({ ...meta, panels: meta.panels.filter((_, i) => i !== idx) });
    }
  }

  const btnClass =
    "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground,#3c3c3c)] px-2 py-0.5 text-[11px] text-[var(--vscode-button-secondaryForeground,#ccc)] hover:opacity-90 disabled:opacity-40";
  const btnDangerClass =
    "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-errorForeground,#f44)] px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">panelMeta</label>

      {/* Direction selector */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[var(--vscode-descriptionForeground,#888)]">direction</label>
        <select
          value={meta.direction}
          onChange={(e) => setDirection(e.target.value as "horizontal" | "vertical")}
          className={`${INPUT_CLASS} w-full`}
        >
          <option value="horizontal">horizontal</option>
          <option value="vertical">vertical</option>
        </select>
      </div>

      {/* Panel list */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[var(--vscode-descriptionForeground,#888)]">panels</label>
        {meta.panels.map((panel, idx) => (
          <div key={panel.key} className="flex items-center gap-1">
            <span className="text-[11px] text-[var(--vscode-descriptionForeground,#888)] w-12 shrink-0">
              Panel {idx + 1}
            </span>
            <input
              type="text"
              value={panel.size}
              onChange={(e) => setSize(idx, e.target.value)}
              placeholder="50% or 200px"
              className={`${INPUT_CLASS} w-24`}
            />
            <button
              type="button"
              className={btnDangerClass}
              disabled={meta.panels.length <= 2}
              onClick={() => removePanel(idx)}
              title="削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Size total hint — only when all panels use numeric/% sizes */}
      {allNumeric && (
        <div className="text-[10px] text-[var(--vscode-descriptionForeground,#777)]">
          合計: {meta.panels.reduce((s, p) => s + Number(p.size), 0)}%
        </div>
      )}

      {/* Add panel */}
      <button type="button" className={btnClass} onClick={addPanel}>
        + パネルを追加
      </button>
    </div>
  );
}
