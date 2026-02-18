import { useEditor } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { PropEditor } from "./PropEditor";
import { TailwindEditor } from "./TailwindEditor";

export function PropertiesPanel() {
  const { t } = useTranslation();
  const { selected, selectedNodeDisplayName } = useEditor((state) => {
    const currentNodeId = state.events.selected?.values().next().value;
    let selectedNodeDisplayName = "";

    if (currentNodeId) {
      const node = state.nodes[currentNodeId];
      selectedNodeDisplayName =
        node?.data?.displayName || node?.data?.name || "";
    }

    return {
      selected: currentNodeId || null,
      selectedNodeDisplayName,
    };
  });

  return (
    <div className="flex w-64 flex-col border-l border-[var(--vscode-panel-border,#333)] bg-[var(--vscode-sideBar-background,#252526)]">
      <div className="border-b border-[var(--vscode-panel-border,#333)] p-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--vscode-sideBarTitle-foreground,#bbb)]">
          {t("properties.title")}
        </h2>
        {selected && (
          <p className="mt-1 text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {selectedNodeDisplayName}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="flex flex-col">
            <PanelSection title={t("properties.props")}>
              <PropEditor />
            </PanelSection>
            <PanelSection title={t("properties.tailwind")}>
              <TailwindEditor />
            </PanelSection>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center p-4 text-center text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {t("properties.noSelection")}
          </div>
        )}
      </div>
    </div>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--vscode-panel-border,#333)]">
      <div className="px-3 py-2">
        <h3 className="mb-2 text-xs font-semibold text-[var(--vscode-foreground,#ccc)]">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
