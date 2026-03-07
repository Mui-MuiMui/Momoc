import { useEditor } from "@craftjs/core";
import type { SlideMeta } from "../../crafts/shadcn/CraftCarousel";

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

function parseSlideMeta(raw: string): SlideMeta {
  try {
    const parsed = JSON.parse(raw);
    return {
      keys: Array.isArray(parsed.keys) ? parsed.keys : [0, 1, 2],
      nextKey: typeof parsed.nextKey === "number" ? parsed.nextKey : 3,
      labels:
        typeof parsed.labels === "object" && parsed.labels !== null
          ? parsed.labels
          : { "0": "Slide 1", "1": "Slide 2", "2": "Slide 3" },
    };
  } catch {
    return {
      keys: [0, 1, 2],
      nextKey: 3,
      labels: { "0": "Slide 1", "1": "Slide 2", "2": "Slide 3" },
    };
  }
}

interface SlideMetaEditorProps {
  value: string;
  selectedNodeId: string;
}

export function SlideMetaEditor({ value, selectedNodeId }: SlideMetaEditorProps) {
  const { actions } = useEditor((state) => ({ nodes: state.nodes }));

  const meta = parseSlideMeta(value);

  function updateMeta(newMeta: SlideMeta) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.slideMeta = JSON.stringify(newMeta);
    });
  }

  function addSlide() {
    const newKey = meta.nextKey;
    const newMeta: SlideMeta = {
      keys: [...meta.keys, newKey],
      nextKey: newKey + 1,
      labels: { ...meta.labels, [String(newKey)]: `Slide ${newKey + 1}` },
    };
    updateMeta(newMeta);
  }

  function removeSlide(idx: number) {
    if (meta.keys.length <= 1) return;
    const removedKey = meta.keys[idx];
    const newKeys = meta.keys.filter((_, i) => i !== idx);
    const newLabels = { ...meta.labels };
    delete newLabels[String(removedKey)];
    updateMeta({ ...meta, keys: newKeys, labels: newLabels });
  }

  function setLabel(key: number, label: string) {
    updateMeta({ ...meta, labels: { ...meta.labels, [String(key)]: label } });
  }

  const btnClass =
    "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground,#3c3c3c)] px-2 py-0.5 text-[11px] text-[var(--vscode-button-secondaryForeground,#ccc)] hover:opacity-90 disabled:opacity-40";
  const btnDangerClass =
    "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-errorForeground,#f44)] px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">slideMeta</label>

      {/* Slide list */}
      <div className="flex flex-col gap-2">
        {meta.keys.map((key, idx) => (
          <div key={key} className="flex items-center gap-1">
            <input
              type="text"
              value={meta.labels[String(key)] ?? ""}
              onChange={(e) => setLabel(key, e.target.value)}
              className={`${INPUT_CLASS} flex-1`}
              placeholder={`Slide ${idx + 1}`}
            />
            <button
              type="button"
              className={btnDangerClass}
              disabled={meta.keys.length <= 1}
              onClick={() => removeSlide(idx)}
              title="削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add slide */}
      <button type="button" className={btnClass} onClick={addSlide}>
        + スライドを追加
      </button>
    </div>
  );
}
