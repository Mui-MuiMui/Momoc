import { useEditor } from "@craftjs/core";
import type { TabMeta } from "../../crafts/shadcn/CraftTabs";
import { IconCombobox } from "./IconCombobox";

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

function parseTabMeta(raw: string): TabMeta {
  try {
    const parsed = JSON.parse(raw);
    return {
      keys: Array.isArray(parsed.keys) ? parsed.keys : [0, 1, 2],
      nextKey: typeof parsed.nextKey === "number" ? parsed.nextKey : 3,
      labels:
        typeof parsed.labels === "object" && parsed.labels !== null
          ? parsed.labels
          : { "0": "Tab 1", "1": "Tab 2", "2": "Tab 3" },
      icons:
        typeof parsed.icons === "object" && parsed.icons !== null
          ? parsed.icons
          : { "0": "", "1": "", "2": "" },
      tooltips:
        typeof parsed.tooltips === "object" && parsed.tooltips !== null
          ? parsed.tooltips
          : { "0": "", "1": "", "2": "" },
    };
  } catch {
    return {
      keys: [0, 1, 2],
      nextKey: 3,
      labels: { "0": "Tab 1", "1": "Tab 2", "2": "Tab 3" },
      icons: { "0": "", "1": "", "2": "" },
      tooltips: { "0": "", "1": "", "2": "" },
    };
  }
}

interface TabMetaEditorProps {
  value: string;
  selectedNodeId: string;
}

export function TabMetaEditor({ value, selectedNodeId }: TabMetaEditorProps) {
  const { actions } = useEditor((state) => ({ nodes: state.nodes }));

  const meta = parseTabMeta(value);

  function updateMeta(newMeta: TabMeta) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.tabMeta = JSON.stringify(newMeta);
    });
  }

  function addTab() {
    const newKey = meta.nextKey;
    const newMeta: TabMeta = {
      keys: [...meta.keys, newKey],
      nextKey: newKey + 1,
      labels: { ...meta.labels, [String(newKey)]: `Tab ${newKey + 1}` },
      icons: { ...meta.icons, [String(newKey)]: "" },
      tooltips: { ...meta.tooltips, [String(newKey)]: "" },
    };
    updateMeta(newMeta);
  }

  function removeTab(idx: number) {
    if (meta.keys.length <= 1) return;
    const removedKey = meta.keys[idx];
    const newKeys = meta.keys.filter((_, i) => i !== idx);
    const newLabels = { ...meta.labels };
    const newIcons = { ...meta.icons };
    const newTooltips = { ...meta.tooltips };
    delete newLabels[String(removedKey)];
    delete newIcons[String(removedKey)];
    delete newTooltips[String(removedKey)];
    updateMeta({ ...meta, keys: newKeys, labels: newLabels, icons: newIcons, tooltips: newTooltips });
  }

  function setLabel(key: number, label: string) {
    updateMeta({ ...meta, labels: { ...meta.labels, [String(key)]: label } });
  }

  function setIcon(key: number, icon: string) {
    updateMeta({ ...meta, icons: { ...meta.icons, [String(key)]: icon } });
  }

  function setTooltip(key: number, tooltip: string) {
    updateMeta({ ...meta, tooltips: { ...meta.tooltips, [String(key)]: tooltip } });
  }

  const btnClass =
    "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground,#3c3c3c)] px-2 py-0.5 text-[11px] text-[var(--vscode-button-secondaryForeground,#ccc)] hover:opacity-90 disabled:opacity-40";
  const btnDangerClass =
    "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-errorForeground,#f44)] px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">tabMeta</label>

      {/* Tab list */}
      <div className="flex flex-col gap-2">
        {meta.keys.map((key, idx) => (
          <div key={key} className="flex flex-col gap-1">
            {/* Label input + delete button */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={meta.labels[String(key)] ?? ""}
                onChange={(e) => setLabel(key, e.target.value)}
                className={`${INPUT_CLASS} flex-1`}
                placeholder={`Tab ${idx + 1}`}
              />
              <button
                type="button"
                className={btnDangerClass}
                disabled={meta.keys.length <= 1}
                onClick={() => removeTab(idx)}
                title="削除"
              >
                ✕
              </button>
            </div>
            {/* Icon selector */}
            <IconCombobox
              value={meta.icons[String(key)] ?? ""}
              onChange={(v) => setIcon(key, v)}
            />
            {/* Tooltip input */}
            <input
              type="text"
              value={meta.tooltips[String(key)] ?? ""}
              onChange={(e) => setTooltip(key, e.target.value)}
              className={`${INPUT_CLASS} w-full`}
              placeholder="ツールチップ..."
            />
          </div>
        ))}
      </div>

      {/* Add tab */}
      <button type="button" className={btnClass} onClick={addTab}>
        + タブを追加
      </button>
    </div>
  );
}
