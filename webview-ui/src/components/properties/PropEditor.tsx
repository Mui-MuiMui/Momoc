import { useEffect, useRef, useState } from "react";
import { useEditor } from "@craftjs/core";
import { getVsCodeApi } from "../../utils/vscodeApi";
import { IconCombobox } from "./IconCombobox";

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
  RadioGroup: {
    orientation: ["vertical", "horizontal"],
    variant: ["default", "card"],
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

/** Props that use the color palette picker UI. */
const COLOR_PALETTE_PROPS = new Set(["cardBorderColor", "cardBgColor", "descriptionColor"]);

/** Color palette for visual color picker. */
const COLOR_PALETTE: { label: string; value: string }[] = [
  // Standard (500)
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Slate", value: "#64748b" },
  { label: "Dark", value: "#1e293b" },
  // Light (200)
  { label: "Red Light", value: "#fecaca" },
  { label: "Orange Light", value: "#fed7aa" },
  { label: "Yellow Light", value: "#fef08a" },
  { label: "Green Light", value: "#bbf7d0" },
  { label: "Teal Light", value: "#99f6e4" },
  { label: "Cyan Light", value: "#a5f3fc" },
  { label: "Blue Light", value: "#bfdbfe" },
  { label: "Indigo Light", value: "#c7d2fe" },
  { label: "Violet Light", value: "#ddd6fe" },
  { label: "Pink Light", value: "#fbcfe8" },
  { label: "Slate Light", value: "#e2e8f0" },
  { label: "White", value: "#ffffff" },
];

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
  icon: "basic", ratio: "basic", chartType: "basic", direction: "basic",
  totalPages: "basic", currentPage: "basic", triggerText: "basic",
  side: "basic", role: "basic", descriptions: "basic",
  cardBorderColor: "basic", cardBgColor: "basic", descriptionColor: "basic",
  // Overlay
  overlayType: "overlay", linkedMocPath: "overlay", sheetSide: "overlay",
  overlayWidth: "overlay", overlayHeight: "overlay", overlayClassName: "overlay",
  contextMenuMocPath: "overlay",
  linkedMocPaths: "overlay",
  // Interaction
  tooltipText: "interaction", tooltipSide: "interaction", tooltipTrigger: "interaction", toastText: "interaction", toastPosition: "interaction",
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
  const pendingBrowseIndexRef = useRef<number>(-1);

  // Listen for browse:mocFile:result messages from extension
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

    // Custom UI for color palette props (cardBorderColor, cardBgColor, descriptionColor)
    if (COLOR_PALETTE_PROPS.has(key)) {
      const currentValue = String(value ?? "");
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => handlePropChange(key, "")}
              title="クリア"
              className={`flex h-5 w-5 items-center justify-center rounded-sm border text-[10px] ${!currentValue ? "ring-1 ring-[var(--vscode-focusBorder,#007fd4)]" : "border-[var(--vscode-input-border,#3c3c3c)]"}`}
              style={{ background: "var(--vscode-input-background, #3c3c3c)", color: "var(--vscode-input-foreground, #ccc)" }}
            >
              -
            </button>
            {COLOR_PALETTE.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handlePropChange(key, color.value)}
                title={color.label}
                className={`h-5 w-5 rounded-sm border ${currentValue === color.value ? "ring-1 ring-[var(--vscode-focusBorder,#007fd4)]" : "border-[var(--vscode-input-border,#3c3c3c)]"}`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
          {currentValue && (
            <span className="text-[10px] text-[var(--vscode-descriptionForeground,#888)]">
              {currentValue}
            </span>
          )}
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
