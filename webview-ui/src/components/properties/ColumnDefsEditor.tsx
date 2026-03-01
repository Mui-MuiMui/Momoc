import { useState } from "react";
import { useEditor } from "@craftjs/core";
import type { ActionButton, ColumnDef } from "../../crafts/shadcn/CraftDataTable";

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

const BTN_CLASS =
  "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground,#3c3c3c)] px-2 py-0.5 text-[11px] text-[var(--vscode-button-secondaryForeground,#ccc)] hover:opacity-90 disabled:opacity-40";

const BTN_DANGER_CLASS =
  "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-errorForeground,#f44)] px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-40";

const LABEL_CLASS = "text-[10px] text-[var(--vscode-descriptionForeground,#888)]";

const ACTIVE_BTN =
  "rounded px-1.5 py-0.5 text-[10px] bg-[var(--vscode-button-background,#0e639c)] text-white";
const INACTIVE_BTN =
  "rounded px-1.5 py-0.5 text-[10px] bg-[var(--vscode-input-background,#3c3c3c)] text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]";

// ---- Tailwind palette data (copied from PropEditor.tsx) ----

const PALETTE_FAMILIES = [
  "slate", "gray", "red", "orange", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
] as const;

const PALETTE_SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;

const CP: Record<string, Record<string, string>> = {
  slate:   { "50":"#f8fafc","100":"#f1f5f9","200":"#e2e8f0","300":"#cbd5e1","400":"#94a3b8","500":"#64748b","600":"#475569","700":"#334155","800":"#1e293b","900":"#0f172a","950":"#020617" },
  gray:    { "50":"#f9fafb","100":"#f3f4f6","200":"#e5e7eb","300":"#d1d5db","400":"#9ca3af","500":"#6b7280","600":"#4b5563","700":"#374151","800":"#1f2937","900":"#111827","950":"#030712" },
  red:     { "50":"#fef2f2","100":"#fee2e2","200":"#fecaca","300":"#fca5a5","400":"#f87171","500":"#ef4444","600":"#dc2626","700":"#b91c1c","800":"#991b1b","900":"#7f1d1d","950":"#450a0a" },
  orange:  { "50":"#fff7ed","100":"#ffedd5","200":"#fed7aa","300":"#fdba74","400":"#fb923c","500":"#f97316","600":"#ea580c","700":"#c2410c","800":"#9a3412","900":"#7c2d12","950":"#431407" },
  amber:   { "50":"#fffbeb","100":"#fef3c7","200":"#fde68a","300":"#fcd34d","400":"#fbbf24","500":"#f59e0b","600":"#d97706","700":"#b45309","800":"#92400e","900":"#78350f","950":"#451a03" },
  yellow:  { "50":"#fefce8","100":"#fef9c3","200":"#fef08a","300":"#fde047","400":"#facc15","500":"#eab308","600":"#ca8a04","700":"#a16207","800":"#854d0e","900":"#713f12","950":"#422006" },
  lime:    { "50":"#f7fee7","100":"#ecfccb","200":"#d9f99d","300":"#bef264","400":"#a3e635","500":"#84cc16","600":"#65a30d","700":"#4d7c0f","800":"#3f6212","900":"#365314","950":"#1a2e05" },
  green:   { "50":"#f0fdf4","100":"#dcfce7","200":"#bbf7d0","300":"#86efac","400":"#4ade80","500":"#22c55e","600":"#16a34a","700":"#15803d","800":"#166534","900":"#14532d","950":"#052e16" },
  emerald: { "50":"#ecfdf5","100":"#d1fae5","200":"#a7f3d0","300":"#6ee7b7","400":"#34d399","500":"#10b981","600":"#059669","700":"#047857","800":"#065f46","900":"#064e3b","950":"#022c22" },
  teal:    { "50":"#f0fdfa","100":"#ccfbf1","200":"#99f6e4","300":"#5eead4","400":"#2dd4bf","500":"#14b8a6","600":"#0d9488","700":"#0f766e","800":"#115e59","900":"#134e4a","950":"#042f2e" },
  cyan:    { "50":"#ecfeff","100":"#cffafe","200":"#a5f3fc","300":"#67e8f9","400":"#22d3ee","500":"#06b6d4","600":"#0891b2","700":"#0e7490","800":"#155e75","900":"#164e63","950":"#083344" },
  sky:     { "50":"#f0f9ff","100":"#e0f2fe","200":"#bae6fd","300":"#7dd3fc","400":"#38bdf8","500":"#0ea5e9","600":"#0284c7","700":"#0369a1","800":"#075985","900":"#0c4a6e","950":"#082f49" },
  blue:    { "50":"#eff6ff","100":"#dbeafe","200":"#bfdbfe","300":"#93c5fd","400":"#60a5fa","500":"#3b82f6","600":"#2563eb","700":"#1d4ed8","800":"#1e40af","900":"#1e3a8a","950":"#172554" },
  indigo:  { "50":"#eef2ff","100":"#e0e7ff","200":"#c7d2fe","300":"#a5b4fc","400":"#818cf8","500":"#6366f1","600":"#4f46e5","700":"#4338ca","800":"#3730a3","900":"#312e81","950":"#1e1b4b" },
  violet:  { "50":"#f5f3ff","100":"#ede9fe","200":"#ddd6fe","300":"#c4b5fd","400":"#a78bfa","500":"#8b5cf6","600":"#7c3aed","700":"#6d28d9","800":"#5b21b6","900":"#4c1d95","950":"#2e1065" },
  purple:  { "50":"#faf5ff","100":"#f3e8ff","200":"#e9d5ff","300":"#d8b4fe","400":"#c084fc","500":"#a855f7","600":"#9333ea","700":"#7e22ce","800":"#6b21a8","900":"#581c87","950":"#3b0764" },
  fuchsia: { "50":"#fdf4ff","100":"#fae8ff","200":"#f5d0fe","300":"#f0abfc","400":"#e879f9","500":"#d946ef","600":"#c026d3","700":"#a21caf","800":"#86198f","900":"#701a75","950":"#4a044e" },
  pink:    { "50":"#fdf2f8","100":"#fce7f3","200":"#fbcfe8","300":"#f9a8d4","400":"#f472b6","500":"#ec4899","600":"#db2777","700":"#be185d","800":"#9d174d","900":"#831843","950":"#500724" },
  rose:    { "50":"#fff1f2","100":"#ffe4e6","200":"#fecdd3","300":"#fda4af","400":"#fb7185","500":"#f43f5e","600":"#e11d48","700":"#be123c","800":"#9f1239","900":"#881337","950":"#4c0519" },
};

function parseTailwindColorClass(value: string, prefix: string): { family: string; shade: string } | null {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = value.match(new RegExp(`^${escaped}-(\\w+)-(\\d{2,3})$`));
  if (!m || !CP[m[1]]) return null;
  return { family: m[1], shade: m[2] };
}

// ---- TailwindColorPicker component ----

interface TailwindColorPickerProps {
  prefix: "bg" | "text" | "border";
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

function TailwindColorPicker({ prefix, label, value, onChange }: TailwindColorPickerProps) {
  const currentValue = value ?? "";
  const colorInfo = parseTailwindColorClass(currentValue, prefix);
  const [family, setFamily] = useState<string>(colorInfo?.family ?? "blue");
  const isActive = (s: string) => currentValue === `${prefix}-${family}-${s}`;

  const noneLabel = prefix === "bg" ? "bg-black" : prefix === "text" ? "text-black" : "border-black";
  const whiteLabelVal = prefix === "bg" ? "bg-white" : prefix === "text" ? "text-white" : "border-white";

  return (
    <div className="flex flex-col gap-1">
      <span className={LABEL_CLASS}>{label}</span>
      {/* none / black / white */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={!currentValue ? ACTIVE_BTN : INACTIVE_BTN}
        >
          none
        </button>
        <button
          type="button"
          onClick={() => onChange(currentValue === noneLabel ? undefined : noneLabel)}
          title="black"
          className={`h-3.5 w-3.5 rounded-sm border border-[var(--vscode-input-border,#555)] transition-all ${
            currentValue === noneLabel
              ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]"
              : "hover:scale-110"
          }`}
          style={{ backgroundColor: "#000" }}
        />
        <button
          type="button"
          onClick={() => onChange(currentValue === whiteLabelVal ? undefined : whiteLabelVal)}
          title="white"
          className={`h-3.5 w-3.5 rounded-sm border border-[var(--vscode-input-border,#555)] transition-all ${
            currentValue === whiteLabelVal
              ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]"
              : "hover:scale-110"
          }`}
          style={{ backgroundColor: "#fff" }}
        />
        {colorInfo && (
          <span className="ml-auto shrink-0 text-[9px] text-[var(--vscode-descriptionForeground,#888)]">
            {colorInfo.family}-{colorInfo.shade}
          </span>
        )}
      </div>
      {/* Family selector */}
      <div className="flex flex-wrap gap-1">
        {PALETTE_FAMILIES.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFamily(f)}
            title={f}
            className={`h-3.5 w-3.5 rounded-sm transition-all ${
              family === f
                ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]"
                : "hover:scale-110"
            }`}
            style={{ backgroundColor: CP[f]["500"] }}
          />
        ))}
      </div>
      {/* Shade bar */}
      <div className="flex gap-0.5">
        {PALETTE_SHADES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(isActive(s) ? undefined : `${prefix}-${family}-${s}`)}
            title={`${family}-${s}`}
            className={`h-4 flex-1 rounded-sm transition-all ${
              isActive(s)
                ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]"
                : "hover:scale-y-125"
            }`}
            style={{ backgroundColor: CP[family][s] }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-[var(--vscode-descriptionForeground,#666)]">
        <span>50</span><span>500</span><span>950</span>
      </div>
      {/* Text input */}
      <input
        type="text"
        value={currentValue}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={`${INPUT_CLASS} w-full`}
        placeholder={`${prefix}-blue-500`}
      />
    </div>
  );
}

// ---- ButtonGroupField component ----

interface ButtonGroupFieldProps {
  label: string;
  options: string[];
  value: string | undefined;
  placeholder: string;
  onChange: (v: string | undefined) => void;
}

function ButtonGroupField({ label, options, value, placeholder, onChange }: ButtonGroupFieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={LABEL_CLASS}>{label}</span>
      <div className="flex flex-wrap gap-0.5">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={!value ? ACTIVE_BTN : INACTIVE_BTN}
        >
          –
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? undefined : opt)}
            className={value === opt ? ACTIVE_BTN : INACTIVE_BTN}
          >
            {opt}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={placeholder}
        className={`${INPUT_CLASS} w-full`}
      />
    </div>
  );
}

// ---- Main component ----

const DEFAULT_DEFS: ColumnDef[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "email", label: "Email" },
  { key: "actions", type: "actions" },
];

function parseColumnDefs(raw: string): ColumnDef[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_DEFS;
    return parsed;
  } catch {
    return DEFAULT_DEFS;
  }
}

interface ColumnDefsEditorProps {
  value: string;
  selectedNodeId: string;
}

export function ColumnDefsEditor({ value, selectedNodeId }: ColumnDefsEditorProps) {
  const { actions } = useEditor((state) => ({ nodes: state.nodes }));

  const defs = parseColumnDefs(value);

  function updateDefs(newDefs: ColumnDef[]) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.columnDefs = JSON.stringify(newDefs);
    });
  }

  function setField<K extends keyof ColumnDef>(idx: number, field: K, val: ColumnDef[K]) {
    const newDefs = defs.map((d, i) => (i === idx ? { ...d, [field]: val } : d));
    updateDefs(newDefs);
  }

  function addCol() {
    const newKey = `col_${defs.length}`;
    updateDefs([...defs, { key: newKey }]);
  }

  function removeCol(idx: number) {
    if (defs.length <= 1) return;
    updateDefs(defs.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const newDefs = [...defs];
    [newDefs[idx - 1], newDefs[idx]] = [newDefs[idx], newDefs[idx - 1]];
    updateDefs(newDefs);
  }

  function moveDown(idx: number) {
    if (idx === defs.length - 1) return;
    const newDefs = [...defs];
    [newDefs[idx], newDefs[idx + 1]] = [newDefs[idx + 1], newDefs[idx]];
    updateDefs(newDefs);
  }

  function addActionBtn(colIdx: number) {
    const newDefs = defs.map((d, i) => {
      if (i !== colIdx) return d;
      const existing = d.actionButtons ?? [];
      return { ...d, actionButtons: [...existing, { label: "Button" }] };
    });
    updateDefs(newDefs);
  }

  function removeActionBtn(colIdx: number, btnIdx: number) {
    const newDefs = defs.map((d, i) => {
      if (i !== colIdx) return d;
      const existing = d.actionButtons ?? [];
      return { ...d, actionButtons: existing.filter((_, bi) => bi !== btnIdx) };
    });
    updateDefs(newDefs);
  }

  function setActionBtnField<K extends keyof ActionButton>(
    colIdx: number,
    btnIdx: number,
    field: K,
    val: ActionButton[K],
  ) {
    const newDefs = defs.map((d, i) => {
      if (i !== colIdx) return d;
      const existing = d.actionButtons ?? [];
      const newBtns = existing.map((b, bi) => (bi === btnIdx ? { ...b, [field]: val } : b));
      return { ...d, actionButtons: newBtns };
    });
    updateDefs(newDefs);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">columnDefs</label>
        <button type="button" className={BTN_CLASS} onClick={addCol}>
          + Add
        </button>
      </div>

      {/* Column list */}
      <div className="flex flex-col gap-2">
        {defs.map((col, idx) => {
          const isData = !col.type || col.type === "data";
          const isActions = col.type === "actions";
          return (
            <div
              key={idx}
              className="flex flex-col gap-1.5 rounded border border-[var(--vscode-panel-border,#444)] p-2"
            >
              {/* Row 1: move buttons + key/label inputs + delete */}
              <div className="flex items-start gap-1">
                <div className="flex shrink-0 flex-col gap-0.5 pt-4">
                  <button
                    type="button"
                    className={BTN_CLASS}
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    title="上へ"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={BTN_CLASS}
                    onClick={() => moveDown(idx)}
                    disabled={idx === defs.length - 1}
                    title="下へ"
                  >
                    ↓
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 gap-1">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={LABEL_CLASS}>key</span>
                    <input
                      type="text"
                      value={col.key}
                      onChange={(e) => setField(idx, "key", e.target.value)}
                      placeholder="key"
                      className={`${INPUT_CLASS} w-full`}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={LABEL_CLASS}>label</span>
                    <input
                      type="text"
                      value={col.label ?? ""}
                      onChange={(e) => setField(idx, "label", e.target.value || undefined)}
                      placeholder="label"
                      className={`${INPUT_CLASS} w-full`}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className={`${BTN_DANGER_CLASS} mt-4`}
                  onClick={() => removeCol(idx)}
                  disabled={defs.length <= 1}
                  title="削除"
                >
                  ✕
                </button>
              </div>

              {/* Row 2: type */}
              <div className="flex items-center gap-2 pl-8">
                <span className={LABEL_CLASS}>type:</span>
                <select
                  value={col.type ?? ""}
                  onChange={(e) => {
                    const v = e.target.value as ColumnDef["type"] | "";
                    setField(idx, "type", v || undefined);
                  }}
                  className={`${INPUT_CLASS} shrink-0`}
                >
                  <option value="">data</option>
                  <option value="actions">actions</option>
                  <option value="slot">slot</option>
                </select>
              </div>

              {/* Row 3 (data only): sortable + width */}
              {isData && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-8">
                  <label className="flex cursor-pointer items-center gap-1 text-[11px] text-[var(--vscode-foreground,#ccc)]">
                    <input
                      type="checkbox"
                      checked={col.sortable ?? false}
                      onChange={(e) => setField(idx, "sortable", e.target.checked || undefined)}
                    />
                    sortable
                  </label>
                  <div className="flex items-center gap-1">
                    <span className={LABEL_CLASS}>width:</span>
                    <input
                      type="text"
                      value={col.width ?? ""}
                      onChange={(e) => setField(idx, "width", e.target.value || undefined)}
                      placeholder="120px / 50%"
                      className={`${INPUT_CLASS} w-20`}
                      title="width (px or %)"
                    />
                  </div>
                </div>
              )}

              {/* Row 3 (actions only): action buttons editor */}
              {isActions && (
                <div className="flex flex-col gap-1 pl-8">
                  <div className="flex items-center justify-between">
                    <span className={LABEL_CLASS}>Buttons:</span>
                    <button
                      type="button"
                      className={BTN_CLASS}
                      onClick={() => addActionBtn(idx)}
                    >
                      + Add
                    </button>
                  </div>
                  {(col.actionButtons ?? []).map((btn, bi) => (
                    <div
                      key={bi}
                      className="flex flex-col gap-1 rounded border border-[var(--vscode-panel-border,#444)] p-1.5"
                    >
                      <div className="flex items-center gap-1">
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className={LABEL_CLASS}>label</span>
                          <input
                            type="text"
                            value={btn.label}
                            onChange={(e) => setActionBtnField(idx, bi, "label", e.target.value)}
                            placeholder="Button"
                            className={`${INPUT_CLASS} w-full`}
                          />
                        </div>
                        <button
                          type="button"
                          className={`${BTN_DANGER_CLASS} mt-4 shrink-0`}
                          onClick={() => removeActionBtn(idx, bi)}
                          title="削除"
                        >
                          ✕
                        </button>
                      </div>
                      <TailwindColorPicker
                        prefix="bg"
                        label="bg"
                        value={btn.bgClass}
                        onChange={(v) => setActionBtnField(idx, bi, "bgClass", v)}
                      />
                      <TailwindColorPicker
                        prefix="text"
                        label="text"
                        value={btn.textClass}
                        onChange={(v) => setActionBtnField(idx, bi, "textClass", v)}
                      />
                      <TailwindColorPicker
                        prefix="border"
                        label="border color"
                        value={btn.borderClass}
                        onChange={(v) => setActionBtnField(idx, bi, "borderClass", v)}
                      />
                      <ButtonGroupField
                        label="border-w"
                        options={["border", "border-2", "border-4", "border-8"]}
                        value={btn.borderWidth}
                        placeholder="border-2"
                        onChange={(v) => setActionBtnField(idx, bi, "borderWidth", v)}
                      />
                      <ButtonGroupField
                        label="shadow"
                        options={["shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl"]}
                        value={btn.shadowClass}
                        placeholder="shadow-md"
                        onChange={(v) => setActionBtnField(idx, bi, "shadowClass", v)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
