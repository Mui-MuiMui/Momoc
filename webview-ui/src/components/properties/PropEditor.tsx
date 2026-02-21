import { useEffect } from "react";
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
      {Object.entries(selectedProps).map(([key, value]) => {
        if (key === "children" || key === "className") return null;

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
      })}
    </div>
  );
}
