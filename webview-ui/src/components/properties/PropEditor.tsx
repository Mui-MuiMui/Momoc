import { useEditor } from "@craftjs/core";

export function PropEditor() {
  const { selectedProps, actions, selectedNodeId } = useEditor((state) => {
    const nodeId = state.events.selected?.values().next().value;
    if (!nodeId) return { selectedProps: null, selectedNodeId: null };

    const node = state.nodes[nodeId];
    return {
      selectedProps: node?.data?.props || {},
      selectedNodeId: nodeId,
    };
  });

  if (!selectedProps || !selectedNodeId) {
    return null;
  }

  const handlePropChange = (key: string, value: unknown) => {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props[key] = value;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(selectedProps).map(([key, value]) => {
        if (key === "children" || key === "className") return null;

        return (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
              {key}
            </label>
            {typeof value === "boolean" ? (
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handlePropChange(key, e.target.checked)}
                className="h-4 w-4"
              />
            ) : typeof value === "number" ? (
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  handlePropChange(key, Number(e.target.value))
                }
                className="rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]"
              />
            ) : (
              <input
                type="text"
                value={String(value ?? "")}
                onChange={(e) => handlePropChange(key, e.target.value)}
                className="rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
