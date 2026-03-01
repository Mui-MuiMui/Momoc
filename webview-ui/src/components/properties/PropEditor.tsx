import { useEffect, useRef, useState } from "react";
import { useEditor } from "@craftjs/core";
import { getVsCodeApi } from "../../utils/vscodeApi";
import { IconCombobox } from "./IconCombobox";
import { TableMetaEditor } from "./TableMetaEditor";
import { TabMetaEditor } from "./TabMetaEditor";
import { ResizableMetaEditor } from "./ResizableMetaEditor";
import { useEditorStore } from "../../stores/editorStore";

/** Mapping of property names to their allowed values (select options). */
const PROP_OPTIONS: Record<string, string[]> = {
  variant: ["default", "destructive", "outline", "secondary", "ghost", "link"],
  size: ["default", "sm", "lg", "icon"],
  tag: ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6"],
  type: ["text", "email", "password", "number", "tel", "url", "search"],
  display: ["flex", "grid"],
  flexDirection: ["row", "column"],
  justifyContent: ["start", "center", "end", "between", "around", "evenly"],
  alignItems: ["start", "center", "end", "stretch", "baseline"],
  orientation: ["horizontal", "vertical"],
  objectFit: ["cover", "contain", "fill", "none", "scale-down"],
  overlayType: ["none", "dialog", "alert-dialog", "sheet", "drawer", "popover", "dropdown-menu"],
  sheetSide: ["top", "right", "bottom", "left"],
  tooltipSide: ["", "top", "right", "bottom", "left"],
  tooltipTrigger: ["hover", "focus"],
  toastPosition: ["bottom-right", "bottom-left", "top-right", "top-left"],
};

/** Property names that have a smaller set of variant options per component. */
const COMPONENT_PROP_OPTIONS: Record<string, Record<string, string[]>> = {
  Badge: {
    variant: ["default", "secondary", "destructive", "outline"],
  },
  Accordion: {
    type: ["single", "multiple"],
  },
  Collapsible: {
    triggerStyle: ["chevron", "plus-minus", "arrow", "none"],
    outerShadow: ["", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-inner", "shadow-none"],
    contentShadow: ["", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-inner", "shadow-none"],
    triggerShadow: ["", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-inner", "shadow-none"],
  },
  Alert: {
    variant: ["default", "destructive"],
  },
  Toggle: {
    variant: ["default", "outline"],
    size: ["default", "sm", "lg"],
  },
  ToggleGroup: {
    type: ["single", "multiple"],
    variant: ["default", "outline"],
    size: ["default", "sm", "lg"],
  },
  Chart: {
    chartType: ["bar", "line", "pie"],
  },
  RadioGroup: {
    orientation: ["vertical", "horizontal"],
    variant: ["default", "card"],
  },
  Resizable: {
    borderRadius: ["", "rounded", "rounded-md", "rounded-lg", "rounded-xl"],
    shadow: ["", "shadow-sm", "shadow", "shadow-md", "shadow-lg"],
    separatorSize: ["1", "2", "4", "6", "8"],
  },
  ResizablePanelSlot: {},
  Table: {
    borderWidth: ["0", "1", "2", "4"],
  },
  TableCellSlot: {
    align: ["left", "center", "right"],
  },
  Switch: {
    variant: ["default", "card"],
    size: ["default", "sm"],
  },
  Dialog: {
    variant: ["default", "destructive", "outline", "secondary", "ghost", "link"],
  },
  Avatar: {
    size: ["default", "sm", "lg"],
  },
  Sheet: {
    side: ["top", "right", "bottom", "left"],
  },
  Tabs: {
    orientation: ["horizontal", "vertical"],
    outerShadow: ["", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-inner", "shadow-none"],
    contentShadow: ["", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-inner", "shadow-none"],
  },
};

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

/** Props that support multiline text input (rendered as textarea). */
const MULTILINE_PROPS = new Set(["text", "title", "description", "placeholder", "label", "triggerText", "tooltipText", "toastText"]);

/** Props that use the .moc file browse UI (text input + browse button). */
const MOC_PATH_PROPS = new Set(["linkedMocPath", "contextMenuMocPath"]);

/** Props that use the color palette picker UI (stores hex values). */
const COLOR_PALETTE_PROPS = new Set(["cardBorderColor", "cardBgColor", "descriptionColor", "labelColor"]);

/** Props that use the Tailwind bg class palette picker UI (stores "bg-red-500" style class names). */
const TAILWIND_BG_PALETTE_PROPS = new Set(["checkedClassName", "uncheckedClassName", "fillClassName", "trackClassName", "bgClass", "tabListBgClass", "tabActiveBgClass", "contentBgClass", "separatorColor", "todayBgClass"]);

/** Props that use the Tailwind border class palette picker UI (stores "border-red-500" style class names). */
const TAILWIND_BORDER_PALETTE_PROPS = new Set(["borderColor", "outerBorderColor", "dividerBorderColor", "triggerBorderColor", "contentBorderColor"]);

/**
 * Tailwind CSS color palette (hex) — same data as TailwindEditor.tsx.
 */
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

/** Parse a Tailwind class with given prefix → { family, shade } */
function parseTailwindColorClass(value: string, prefix: string): { family: string; shade: string } | null {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = value.match(new RegExp(`^${escaped}-(\\w+)-(\\d{2,3})$`));
  if (!m || !CP[m[1]]) return null;
  return { family: m[1], shade: m[2] };
}

/** Parse "bg-red-500" style Tailwind bg class → { family, shade } */
function parseBgClass(value: string): { family: string; shade: string } | null {
  return parseTailwindColorClass(value, "bg");
}

/** Reverse lookup: hex value → { family, shade } */
function findColorInfo(value: string): { family: string; shade: string } | null {
  if (!value) return null;
  for (const [name, shades] of Object.entries(CP)) {
    for (const [shade, hex] of Object.entries(shades)) {
      if (hex === value) return { family: name, shade };
    }
  }
  return null;
}

/** overlayClassName presets */
const OVERLAY_CLASS_PRESETS: { label: string; value: string }[] = [
  { label: "(custom)", value: "" },
  { label: "Default", value: "rounded-lg border p-6 shadow-lg" },
  { label: "Minimal", value: "border-0 shadow-none p-4" },
  { label: "Compact", value: "p-2 rounded-sm" },
  { label: "Spacious", value: "p-8 rounded-xl shadow-xl" },
  { label: "Borderless", value: "border-0 shadow-lg rounded-xl p-6" },
];

// --- Property grouping ---

type PropGroup = "common" | "flow" | "absolute" | "component";

const GROUP_LABELS: Record<PropGroup, string> = {
  common: "共通",
  flow: "フロー配置",
  absolute: "自由配置",
  component: "コンポーネント",
};

const GROUP_ORDER: PropGroup[] = ["common", "flow", "absolute", "component"];

/** 共通プロパティ (width/height) — 常時表示 */
const COMMON_KEYS = new Set(["width", "height"]);

/** フロー配置専用プロパティ — layoutMode === "flow" のみ表示 */
const FLOW_KEYS = new Set([
  "display", "flexDirection", "justifyContent", "alignItems", "gap", "gridCols",
]);

/** 自由配置専用プロパティ — layoutMode === "absolute" のみ表示 */
const ABSOLUTE_KEYS = new Set(["top", "left"]);

/** 共通/フロー/自由配置 以外はコンポーネント固有として扱う */
const LAYOUT_ALL_KEYS = new Set([...COMMON_KEYS, ...FLOW_KEYS, ...ABSOLUTE_KEYS]);

/** フロー配置のデフォルト値 (selectedProps に無い場合に使用) */
const FLOW_DEFAULTS: Record<string, unknown> = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "start",
  alignItems: "stretch",
  gap: "4",
  gridCols: 3,
};

/** 自由配置のデフォルト値 */
const ABSOLUTE_DEFAULTS: Record<string, unknown> = {
  top: "0px",
  left: "0px",
};

/**
 * コンポーネント固有の非表示プロパティ。
 * 共通グループ・コンポーネントグループの両方から除外される。
 */
const COMPONENT_EXCLUDED_PROPS: Record<string, Set<string>> = {
  // AspectRatio: keepAspectRatio は RenderNode 内部用、ユーザーには非表示
  AspectRatio: new Set(["keepAspectRatio"]),
  // Avatar: width/height はドラッグリサイズ用に内部で保持するが PropEditor には非表示
  Avatar: new Set(["width", "height"]),
};

export function PropEditor() {
  const { selectedProps, actions, selectedNodeId, componentName, craftDefaultProps } = useEditor(
    (state) => {
      const nodeId = state.events.selected?.values().next().value;
      if (!nodeId)
        return {
          selectedProps: null,
          selectedNodeId: null,
          componentName: "",
          craftDefaultProps: null,
        };

      const node = state.nodes[nodeId];
      return {
        selectedProps: node?.data?.props || {},
        selectedNodeId: nodeId,
        componentName: node?.data?.displayName || node?.data?.name || "",
        craftDefaultProps: (node?.data?.type as any)?.craft?.props ?? null,
      };
    },
  );

  const layoutMode = useEditorStore((s) => s.layoutMode);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [colorFamilies, setColorFamilies] = useState<Record<string, string>>({});
  const pendingBrowseIndexRef = useRef<number>(-1);

  // Listen for browse:mocFile:result and browse:imageFile:result messages from extension
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === "browse:mocFile:result" && selectedNodeId) {
        const { relativePath, targetProp } = msg.payload as { relativePath: string; targetProp?: string };
        if (targetProp === "linkedMocPaths" && pendingBrowseIndexRef.current >= 0) {
          const idx = pendingBrowseIndexRef.current;
          pendingBrowseIndexRef.current = -1;
          actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
            const paths = (String(props.linkedMocPaths || "")).split(",");
            while (paths.length <= idx) paths.push("");
            paths[idx] = relativePath;
            props.linkedMocPaths = paths.join(",");
          });
        } else {
          actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
            props[targetProp || "linkedMocPath"] = relativePath;
          });
        }
      }
      if (msg?.type === "browse:imageFile:result" && selectedNodeId) {
        const { relativePath, targetProp } = msg.payload as { relativePath: string; targetProp?: string };
        actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
          props[targetProp || "src"] = relativePath;
        });
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [selectedNodeId, actions]);

  if (!selectedProps || !selectedNodeId) {
    return null;
  }

  if (componentName === "ResizablePanelSlot") {
    return (
      <div className="px-3 py-2 text-xs text-[var(--vscode-descriptionForeground,#777)] italic">
        サイズは親の Resizable コンポーネントで管理されます
      </div>
    );
  }

  const handlePropChange = (key: string, value: unknown) => {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props[key] = value;
      // AspectRatio: width/height の片方を手打ちしたら、もう片方を "auto" にリセット
      if (componentName === "AspectRatio") {
        if (key === "width" && value !== "auto") props.height = "auto";
        if (key === "height" && value !== "auto") props.width = "auto";
      }
    });
  };

  const getOptions = (key: string): string[] | null => {
    const componentOverride = COMPONENT_PROP_OPTIONS[componentName]?.[key];
    if (componentOverride) return componentOverride;
    return PROP_OPTIONS[key] || null;
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // --- 新グループ分けロジック ---

  const excludedProps = COMPONENT_EXCLUDED_PROPS[componentName] ?? new Set<string>();

  // 共通グループ: width/height を selectedProps から取得（無ければデフォルト値）
  const commonEntries: [string, unknown][] = Array.from(COMMON_KEYS)
    .filter((k) => !excludedProps.has(k))
    .map((k) => [k, selectedProps[k] ?? "auto"]);

  // フロー配置グループ: layoutMode === "flow" のみ。selectedProps に無ければデフォルト値
  const flowEntries: [string, unknown][] = layoutMode === "flow"
    ? Array.from(FLOW_KEYS).map((k) => [k, selectedProps[k] ?? FLOW_DEFAULTS[k]])
    : [];

  // 自由配置グループ: layoutMode === "absolute" のみ。selectedProps に無ければデフォルト値
  const absoluteEntries: [string, unknown][] = layoutMode === "absolute"
    ? Array.from(ABSOLUTE_KEYS).map((k) => [k, selectedProps[k] ?? ABSOLUTE_DEFAULTS[k]])
    : [];

  // コンポーネントグループ: craftDefaultProps に定義されているキーのうち、レイアウト系を除いたもの
  const componentEntries: [string, unknown][] = Object.entries(selectedProps).filter(
    ([key]) =>
      key !== "children" &&
      key !== "className" &&
      !LAYOUT_ALL_KEYS.has(key) &&
      !excludedProps.has(key) &&
      (craftDefaultProps ? key in craftDefaultProps : true),
  );

  const grouped = new Map<PropGroup, [string, unknown][]>([
    ["common", commonEntries],
    ["flow", flowEntries],
    ["absolute", absoluteEntries],
    ["component", componentEntries],
  ]);

  // 常にグループヘッダーを表示
  const activeGroups = GROUP_ORDER.filter((g) => (grouped.get(g)?.length ?? 0) > 0);

  function renderProp(key: string, value: unknown) {
    // Custom UI for tableMeta (table structure editor)
    if (key === "tableMeta" && selectedNodeId) {
      return (
        <TableMetaEditor
          key={key}
          value={String(value ?? "")}
          selectedNodeId={selectedNodeId}
        />
      );
    }

    // Custom UI for tabMeta (tab structure editor)
    if (key === "tabMeta" && selectedNodeId) {
      return (
        <TabMetaEditor
          key={key}
          value={String(value ?? "")}
          selectedNodeId={selectedNodeId}
        />
      );
    }

    // Custom UI for panelMeta (resizable panel structure editor)
    if (key === "panelMeta" && selectedNodeId) {
      return (
        <ResizableMetaEditor
          key={key}
          value={String(value ?? "")}
          selectedNodeId={selectedNodeId}
        />
      );
    }

    // Custom UI for ratio (AspectRatio)
    if (key === "ratio") {
      const currentValue = typeof value === "number" ? value : parseFloat(String(value ?? "1.7778"));
      const RATIO_PRESETS: { label: string; value: number }[] = [
        { label: "16:9", value: 16 / 9 },
        { label: "4:3", value: 4 / 3 },
        { label: "1:1", value: 1 },
        { label: "3:2", value: 3 / 2 },
        { label: "2:1", value: 2 },
        { label: "3:4", value: 3 / 4 },
        { label: "9:16", value: 9 / 16 },
      ];
      const matchesPreset = (v: number) => Math.abs(currentValue - v) < 0.001;
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          <div className="flex flex-wrap gap-1">
            {RATIO_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePropChange(key, preset.value)}
                className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                  matchesPreset(preset.value)
                    ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                    : "bg-[var(--vscode-input-background,#3c3c3c)] text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={currentValue}
            step={0.01}
            min={0.01}
            onChange={(e) => handlePropChange(key, Number(e.target.value))}
            className={`${INPUT_CLASS} w-full`}
          />
        </div>
      );
    }

    // Custom UI for icon (combobox with all Lucide icons)
    if (key === "icon") {
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          <IconCombobox
            value={String(value ?? "")}
            onChange={(v) => handlePropChange(key, v)}
          />
        </div>
      );
    }

    // Custom UI for overlayClassName (preset select + text input)
    if (key === "overlayClassName") {
      const currentValue = String(value ?? "");
      const matchesPreset = OVERLAY_CLASS_PRESETS.some((p) => p.value === currentValue);
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          <select
            value={matchesPreset ? currentValue : ""}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          >
            {OVERLAY_CLASS_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
            placeholder="Tailwind classes..."
          />
        </div>
      );
    }

    // Custom UI for color palette props — swatch UI matching TailwindEditor.tsx
    if (COLOR_PALETTE_PROPS.has(key)) {
      const currentValue = String(value ?? "");
      const colorInfo = findColorInfo(currentValue);
      const family = colorFamilies[key] || colorInfo?.family || "blue";
      const setFamily = (f: string) => setColorFamilies((prev) => ({ ...prev, [key]: f }));
      const isActive = (hex: string) => currentValue === hex;

      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          {/* Special colors: none / black / white */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePropChange(key, "")}
              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                !currentValue
                  ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                  : "bg-[var(--vscode-input-background,#3c3c3c)] text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
              }`}
            >
              none
            </button>
            <button
              type="button"
              onClick={() => handlePropChange(key, currentValue === "#000" ? "" : "#000")}
              title="black"
              className={`h-3.5 w-3.5 rounded-sm border border-[var(--vscode-input-border,#555)] transition-all ${
                currentValue === "#000" ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
              }`}
              style={{ backgroundColor: "#000" }}
            />
            <button
              type="button"
              onClick={() => handlePropChange(key, currentValue === "#fff" ? "" : "#fff")}
              title="white"
              className={`h-3.5 w-3.5 rounded-sm border border-[var(--vscode-input-border,#555)] transition-all ${
                currentValue === "#fff" ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
              }`}
              style={{ backgroundColor: "#fff" }}
            />
            {colorInfo && (
              <span className="ml-auto shrink-0 text-[9px] text-[var(--vscode-descriptionForeground,#888)]">
                {colorInfo.family}-{colorInfo.shade}
              </span>
            )}
          </div>
          {/* Palette family selector — row of colored squares (500 shade) */}
          <div className="flex flex-wrap gap-1">
            {PALETTE_FAMILIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFamily(f)}
                title={f}
                className={`h-3.5 w-3.5 rounded-sm transition-all ${
                  family === f ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
                }`}
                style={{ backgroundColor: CP[f]["500"] }}
              />
            ))}
          </div>
          {/* Shade swatches — horizontal bar of shades for selected family */}
          <div className="flex gap-0.5">
            {PALETTE_SHADES.map((s) => {
              const hex = CP[family][s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handlePropChange(key, isActive(hex) ? "" : hex)}
                  title={`${family}-${s}`}
                  className={`h-4 flex-1 rounded-sm transition-all ${
                    isActive(hex) ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-y-125"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] text-[var(--vscode-descriptionForeground,#666)]">
            <span>50</span><span>500</span><span>950</span>
          </div>
        </div>
      );
    }

    // Custom UI for Tailwind bg class palette props (checkedClassName, uncheckedClassName)
    if (TAILWIND_BG_PALETTE_PROPS.has(key)) {
      const currentValue = String(value ?? "");
      const bgInfo = parseBgClass(currentValue);
      const family = colorFamilies[key] || bgInfo?.family || "blue";
      const setFamily = (f: string) => setColorFamilies((prev) => ({ ...prev, [key]: f }));
      const isActive = (s: string) => currentValue === `bg-${family}-${s}`;

      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          {/* Special colors: none / black / white */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePropChange(key, "")}
              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                !currentValue
                  ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                  : "bg-[var(--vscode-input-background,#3c3c3c)] text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
              }`}
            >
              none
            </button>
            <button
              type="button"
              onClick={() => handlePropChange(key, currentValue === "bg-black" ? "" : "bg-black")}
              title="black"
              className={`h-3.5 w-3.5 rounded-sm border border-[var(--vscode-input-border,#555)] transition-all ${
                currentValue === "bg-black" ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
              }`}
              style={{ backgroundColor: "#000" }}
            />
            <button
              type="button"
              onClick={() => handlePropChange(key, currentValue === "bg-white" ? "" : "bg-white")}
              title="white"
              className={`h-3.5 w-3.5 rounded-sm border border-[var(--vscode-input-border,#555)] transition-all ${
                currentValue === "bg-white" ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
              }`}
              style={{ backgroundColor: "#fff" }}
            />
            {bgInfo && (
              <span className="ml-auto shrink-0 text-[9px] text-[var(--vscode-descriptionForeground,#888)]">
                {bgInfo.family}-{bgInfo.shade}
              </span>
            )}
          </div>
          {/* Palette family selector */}
          <div className="flex flex-wrap gap-1">
            {PALETTE_FAMILIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFamily(f)}
                title={f}
                className={`h-3.5 w-3.5 rounded-sm transition-all ${
                  family === f ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
                }`}
                style={{ backgroundColor: CP[f]["500"] }}
              />
            ))}
          </div>
          {/* Shade swatches */}
          <div className="flex gap-0.5">
            {PALETTE_SHADES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handlePropChange(key, isActive(s) ? "" : `bg-${family}-${s}`)}
                title={`${family}-${s}`}
                className={`h-4 flex-1 rounded-sm transition-all ${
                  isActive(s) ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-y-125"
                }`}
                style={{ backgroundColor: CP[family][s] }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[8px] text-[var(--vscode-descriptionForeground,#666)]">
            <span>50</span><span>500</span><span>950</span>
          </div>
          {/* Editable text field for fine-tuning */}
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
            placeholder="bg-blue-500 ..."
          />
        </div>
      );
    }

    // Custom UI for Tailwind border class palette props (borderColor)
    if (TAILWIND_BORDER_PALETTE_PROPS.has(key)) {
      const currentValue = String(value ?? "");
      const borderInfo = parseTailwindColorClass(currentValue, "border");
      const family = colorFamilies[key] || borderInfo?.family || "gray";
      const setFamily = (f: string) => setColorFamilies((prev) => ({ ...prev, [key]: f }));
      const isActive = (s: string) => currentValue === `border-${family}-${s}`;

      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          {/* Special colors: none / black / white */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePropChange(key, "")}
              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                !currentValue
                  ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                  : "bg-[var(--vscode-input-background,#3c3c3c)] text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
              }`}
            >
              none
            </button>
            <button
              type="button"
              onClick={() => handlePropChange(key, currentValue === "border-black" ? "" : "border-black")}
              title="black"
              className={`h-3.5 w-3.5 rounded-sm border border-[var(--vscode-input-border,#555)] transition-all ${
                currentValue === "border-black" ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
              }`}
              style={{ backgroundColor: "#000" }}
            />
            <button
              type="button"
              onClick={() => handlePropChange(key, currentValue === "border-white" ? "" : "border-white")}
              title="white"
              className={`h-3.5 w-3.5 rounded-sm border border-[var(--vscode-input-border,#555)] transition-all ${
                currentValue === "border-white" ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
              }`}
              style={{ backgroundColor: "#fff" }}
            />
            {borderInfo && (
              <span className="ml-auto shrink-0 text-[9px] text-[var(--vscode-descriptionForeground,#888)]">
                {borderInfo.family}-{borderInfo.shade}
              </span>
            )}
          </div>
          {/* Palette family selector */}
          <div className="flex flex-wrap gap-1">
            {PALETTE_FAMILIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFamily(f)}
                title={f}
                className={`h-3.5 w-3.5 rounded-sm transition-all ${
                  family === f ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
                }`}
                style={{ backgroundColor: CP[f]["500"] }}
              />
            ))}
          </div>
          {/* Shade swatches */}
          <div className="flex gap-0.5">
            {PALETTE_SHADES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handlePropChange(key, isActive(s) ? "" : `border-${family}-${s}`)}
                title={`${family}-${s}`}
                className={`h-4 flex-1 rounded-sm transition-all ${
                  isActive(s) ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-y-125"
                }`}
                style={{ backgroundColor: CP[family][s] }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[8px] text-[var(--vscode-descriptionForeground,#666)]">
            <span>50</span><span>500</span><span>950</span>
          </div>
          {/* Editable text field for fine-tuning */}
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
            placeholder="border-gray-300 ..."
          />
        </div>
      );
    }

    // Custom UI for descriptions: per-item text input linked to items
    if (key === "descriptions") {
      const itemsRaw = selectedProps?.items;
      const labels: string[] = typeof itemsRaw === "string"
        ? itemsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      const descs = String(value ?? "").split(",");

      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          {labels.length === 0 ? (
            <span className="text-[11px] italic text-[var(--vscode-descriptionForeground,#888)]">
              items が未設定です
            </span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {labels.map((lbl, idx) => {
                const currentDesc = (descs[idx] || "").trim();
                return (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <span className="truncate text-[11px] text-[var(--vscode-foreground,#ccc)]" title={lbl}>
                      {lbl}
                    </span>
                    <input
                      type="text"
                      value={currentDesc}
                      onChange={(e) => {
                        const newDescs = [...descs];
                        while (newDescs.length <= idx) newDescs.push("");
                        newDescs[idx] = e.target.value;
                        handlePropChange(key, newDescs.join(","));
                      }}
                      placeholder="説明文..."
                      className={`${INPUT_CLASS} w-full`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Custom UI for linkedMocPaths: per-item .moc file browse
    if (key === "linkedMocPaths") {
      const itemsRaw = selectedProps?.items;
      const labels: string[] = typeof itemsRaw === "string"
        ? itemsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      const paths = String(value ?? "").split(",");

      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          {labels.length === 0 ? (
            <span className="text-[11px] italic text-[var(--vscode-descriptionForeground,#888)]">
              items が未設定です
            </span>
          ) : (
            <div className="flex flex-col gap-1">
              {labels.map((lbl, idx) => {
                const currentPath = (paths[idx] || "").trim();
                const shortPath = currentPath
                  ? currentPath.split("/").slice(-2).join("/")
                  : "";
                return (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="min-w-[60px] truncate text-[11px] text-[var(--vscode-foreground,#ccc)]" title={lbl}>
                      {lbl}
                    </span>
                    <span
                      className="flex-1 truncate text-[11px] text-[var(--vscode-descriptionForeground,#888)]"
                      title={currentPath || "(未設定)"}
                    >
                      {shortPath || "(未設定)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        pendingBrowseIndexRef.current = idx;
                        getVsCodeApi().postMessage({
                          type: "browse:mocFile",
                          payload: { currentPath, targetProp: "linkedMocPaths" },
                        });
                      }}
                      className="rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-background,#0e639c)] px-1.5 py-0.5 text-[11px] text-[var(--vscode-button-foreground,#fff)] hover:opacity-90"
                      title="参照..."
                    >
                      ...
                    </button>
                    {currentPath && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPaths = [...paths];
                          while (newPaths.length <= idx) newPaths.push("");
                          newPaths[idx] = "";
                          handlePropChange(key, newPaths.join(","));
                        }}
                        className="px-1 py-0.5 text-[11px] text-[var(--vscode-descriptionForeground,#888)] hover:text-[var(--vscode-errorForeground,#f44)]"
                        title="クリア"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Custom UI for Image/Avatar src prop (text input + file browse button)
    if ((componentName === "Image" || componentName === "Avatar") && key === "src") {
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            src
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              value={String(value ?? "")}
              onChange={(e) => handlePropChange(key, e.target.value)}
              className={`${INPUT_CLASS} flex-1`}
              placeholder="image path"
            />
            <button
              type="button"
              onClick={() => {
                getVsCodeApi().postMessage({
                  type: "browse:imageFile",
                  payload: { currentPath: String(value ?? ""), targetProp: key },
                });
              }}
              className="rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-background,#0e639c)] px-2 py-1 text-xs text-[var(--vscode-button-foreground,#fff)] hover:opacity-90"
            >
              ...
            </button>
          </div>
        </div>
      );
    }

    // Custom UI for .moc file path props (linkedMocPath, contextMenuMocPath)
    if (MOC_PATH_PROPS.has(key)) {
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              value={String(value ?? "")}
              onChange={(e) => handlePropChange(key, e.target.value)}
              className={`${INPUT_CLASS} flex-1`}
              placeholder=".moc file path"
            />
            <button
              type="button"
              onClick={() => {
                getVsCodeApi().postMessage({
                  type: "browse:mocFile",
                  payload: { currentPath: String(value ?? ""), targetProp: key },
                });
              }}
              className="rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-background,#0e639c)] px-2 py-1 text-xs text-[var(--vscode-button-foreground,#fff)] hover:opacity-90"
            >
              ...
            </button>
          </div>
        </div>
      );
    }

    const options = getOptions(key);

    return (
      <div key={key} className="flex flex-col gap-1">
        <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
          {key}
        </label>
        {typeof value === "boolean" ? (
          <label className="flex items-center gap-2 text-xs text-[var(--vscode-foreground,#ccc)]">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handlePropChange(key, e.target.checked)}
              className="h-4 w-4"
            />
            {value ? "true" : "false"}
          </label>
        ) : options ? (
          <select
            value={String(value ?? "")}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : typeof value === "number" ? (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              handlePropChange(key, Number(e.target.value))
            }
            className={`${INPUT_CLASS} w-full`}
          />
        ) : MULTILINE_PROPS.has(key) ? (
          <textarea
            value={String(value ?? "")}
            onChange={(e) => handlePropChange(key, e.target.value)}
            rows={2}
            className={`${INPUT_CLASS} w-full resize-y`}
          />
        ) : (
          <input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Read-only node ID */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
          id
        </label>
        <input
          type="text"
          value={selectedNodeId}
          readOnly
          className={`${INPUT_CLASS} w-full cursor-default opacity-60`}
          title={selectedNodeId}
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      </div>

      {activeGroups.map((group) => {
        const entries = grouped.get(group)!;
        const isCollapsed = collapsedGroups.has(group);

        return (
          <div key={group}>
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="flex w-full items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--vscode-descriptionForeground,#888)] hover:text-[var(--vscode-foreground,#ccc)]"
            >
              <span className="text-[10px]">{isCollapsed ? "\u25b6" : "\u25bc"}</span>
              {GROUP_LABELS[group]}
              <span className="ml-auto text-[10px] font-normal opacity-60">{entries.length}</span>
            </button>
            {!isCollapsed && (
              <div className="flex flex-col gap-2">
                {entries.map(([key, value]) => renderProp(key, value))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
