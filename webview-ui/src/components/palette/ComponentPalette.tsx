import { useState } from "react";
import { useEditor, Element } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { paletteItems, resolvers, type ResolverKey } from "../../crafts/resolvers";
import { Search } from "lucide-react";
import * as Icons from "lucide-react";

export function ComponentPalette() {
  const { t } = useTranslation();
  const { connectors } = useEditor();
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    layout: true,
    shadcn: true,
    html: true,
  });

  const filteredItems = paletteItems.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [
    { key: "layout" as const, label: "Layout" },
    { key: "shadcn" as const, label: t("palette.shadcn") },
    { key: "html" as const, label: t("palette.html") },
  ];

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex w-56 flex-col border-r border-[var(--vscode-panel-border,#333)] bg-[var(--vscode-sideBar-background,#252526)]">
      <div className="border-b border-[var(--vscode-panel-border,#333)] p-2">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--vscode-sideBarTitle-foreground,#bbb)]">
          {t("palette.title")}
        </h2>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--vscode-input-placeholderForeground,#666)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("palette.search")}
            className="w-full rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] py-1 pl-7 pr-2 text-xs text-[var(--vscode-input-foreground,#ccc)] placeholder:text-[var(--vscode-input-placeholderForeground,#666)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {categories.map((cat) => {
          const items = filteredItems.filter((i) => i.category === cat.key);
          if (items.length === 0) return null;

          return (
            <div key={cat.key} className="mb-1">
              <button
                type="button"
                onClick={() => toggleCategory(cat.key)}
                className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[var(--vscode-sideBarSectionHeader-foreground,#bbb)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
              >
                <span
                  className={`transition-transform ${expandedCategories[cat.key] ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                {cat.label}
              </button>

              {expandedCategories[cat.key] && (
                <div className="grid grid-cols-2 gap-1 px-1 py-1">
                  {items.map((item) => (
                    <PaletteItem
                      key={item.resolverKey}
                      item={item}
                      connectors={connectors}
                    />
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

function PaletteItem({
  item,
  connectors,
}: {
  item: (typeof paletteItems)[0];
  connectors: ReturnType<typeof useEditor>["connectors"];
}) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[item.icon];
  const Component = resolvers[item.resolverKey];

  return (
    <div
      ref={(ref) => {
        if (ref) {
          connectors.create(
            ref,
            <Element is={Component} canvas={false} {...item.defaultProps} />,
          );
        }
      }}
      className="flex cursor-grab flex-col items-center gap-1 rounded border border-transparent p-2 text-center text-xs text-[var(--vscode-foreground,#ccc)] transition-colors hover:border-[var(--vscode-focusBorder,#007fd4)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)] active:cursor-grabbing"
    >
      {IconComponent && <IconComponent size={18} />}
      <span className="truncate leading-tight">{item.label}</span>
    </div>
  );
}
