import { useEffect, useState } from "react";
import { useEditor } from "@craftjs/core";
import { getVsCodeApi } from "../../utils/vscodeApi";

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
};

/** Property names that have a smaller set of variant options per component. */
const COMPONENT_PROP_OPTIONS: Record<string, Record<string, string[]>> = {
  Badge: {
    variant: ["default", "secondary", "destructive", "outline"],
  },
  Accordion: {
    type: ["single", "multiple"],
  },
  Alert: {
    variant: ["default", "destructive"],
  },
  Toggle: {
    variant: ["default", "outline"],
  },
  ToggleGroup: {
    type: ["single", "multiple"],
  },
  Chart: {
    chartType: ["bar", "line", "pie"],
  },
  Resizable: {
    direction: ["horizontal", "vertical"],
  },
  Dialog: {
    variant: ["default", "destructive", "outline", "secondary", "ghost", "link"],
  },
  Sheet: {
    side: ["top", "right", "bottom", "left"],
  },
};

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

/** Props that support multiline text input (rendered as textarea). */
const MULTILINE_PROPS = new Set(["text", "title", "description", "placeholder", "label", "triggerText", "tooltipText", "toastText"]);

/** Props that use the .moc file browse UI (text input + browse button). */
const MOC_PATH_PROPS = new Set(["linkedMocPath", "contextMenuMocPath"]);

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

type PropGroup = "basic" | "overlay" | "interaction" | "layout" | "other";

const GROUP_LABELS: Record<PropGroup, string> = {
  basic: "Basic",
  overlay: "Overlay",
  interaction: "Interaction",
  layout: "Layout",
  other: "Other",
};

const GROUP_ORDER: PropGroup[] = ["basic", "overlay", "interaction", "layout", "other"];

const PROP_TO_GROUP: Record<string, PropGroup> = {
  // Basic
  text: "basic", label: "basic", title: "basic", description: "basic",
  variant: "basic", size: "basic", type: "basic", disabled: "basic",
  checked: "basic", pressed: "basic", placeholder: "basic", htmlFor: "basic",
  items: "basic", value: "basic", rows: "basic", columns: "basic",
  hasHeader: "basic", src: "basic", alt: "basic", fallback: "basic",
  open: "basic", step: "basic", min: "basic", max: "basic",
  ratio: "basic", chartType: "basic", direction: "basic",
  totalPages: "basic", currentPage: "basic", triggerText: "basic",
  side: "basic", role: "basic",
  // Overlay
  overlayType: "overlay", linkedMocPath: "overlay", sheetSide: "overlay",
  overlayWidth: "overlay", overlayHeight: "overlay", overlayClassName: "overlay",
  contextMenuMocPath: "overlay",
  // Interaction
  tooltipText: "interaction", toastText: "interaction",
  // Layout
  width: "layout", height: "layout",
  display: "layout", flexDirection: "layout", justifyContent: "layout",
  alignItems: "layout", gap: "layout", gridCols: "layout",
  orientation: "layout", objectFit: "layout", keepAspectRatio: "layout",
  tag: "layout",
};

function getPropGroup(key: string): PropGroup {
  return PROP_TO_GROUP[key] || "other";
}

export function PropEditor() {
  const { selectedProps, actions, selectedNodeId, componentName } = useEditor(
    (state) => {
      const nodeId = state.events.selected?.values().next().value;
      if (!nodeId)
        return {
          selectedProps: null,
          selectedNodeId: null,
          componentName: "",
        };

      const node = state.nodes[nodeId];
      return {
        selectedProps: node?.data?.props || {},
        selectedNodeId: nodeId,
        componentName: node?.data?.displayName || node?.data?.name || "",
      };
    },
  );

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Listen for browse:mocFile:result messages from extension
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === "browse:mocFile:result" && selectedNodeId) {
        const { relativePath, targetProp } = msg.payload as { relativePath: string; targetProp?: string };
        actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
          props[targetProp || "linkedMocPath"] = relativePath;
        });
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [selectedNodeId, actions]);

  if (!selectedProps || !selectedNodeId) {
    return null;
  }

  const handlePropChange = (key: string, value: unknown) => {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props[key] = value;
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

  // Group properties
  const propEntries = Object.entries(selectedProps).filter(
    ([key]) => key !== "children" && key !== "className",
  );

  const grouped = new Map<PropGroup, [string, unknown][]>();
  for (const entry of propEntries) {
    const group = getPropGroup(entry[0]);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(entry);
  }

  // Filter to groups that have at least one property
  const activeGroups = GROUP_ORDER.filter((g) => grouped.has(g));
  // If only 1 group, don't show group headers (flat layout)
  const showGroupHeaders = activeGroups.length > 1;

  function renderProp(key: string, value: unknown) {
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
            {showGroupHeaders && (
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex w-full items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--vscode-descriptionForeground,#888)] hover:text-[var(--vscode-foreground,#ccc)]"
              >
                <span className="text-[10px]">{isCollapsed ? "\u25b6" : "\u25bc"}</span>
                {GROUP_LABELS[group]}
                <span className="ml-auto text-[10px] font-normal opacity-60">{entries.length}</span>
              </button>
            )}
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
