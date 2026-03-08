import { useState } from "react";
import { useEditor, Element } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { paletteItems, resolvers, type ResolverKey } from "../../crafts/resolvers";
import { Search } from "lucide-react";
import * as Icons from "lucide-react";

type SortMode = "category" | "alpha-asc" | "alpha-desc";

const SORT_MODE_KEY = "momoc.palette.sortMode";

function loadSortMode(): SortMode {
  try {
    const saved = localStorage.getItem(SORT_MODE_KEY);
    if (saved === "category" || saved === "alpha-asc" || saved === "alpha-desc") return saved;
  } catch {
    // ignore
  }
  return "category";
}

const SUB_CATEGORIES = ["action", "display", "form", "layout", "navigation", "overlay"] as const;
type SubCategory = (typeof SUB_CATEGORIES)[number];

export function ComponentPalette() {
  const { t } = useTranslation();
  const { connectors } = useEditor();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>(loadSortMode);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    layout: true,
    shadcn: true,
    html: true,
  });
  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({
    "shadcn:action": true,
    "shadcn:display": true,
    "shadcn:form": true,
    "shadcn:layout": true,
    "shadcn:navigation": true,
    "shadcn:overlay": true,
  });

  const filteredItems = paletteItems.filter(
    (item) => item.enabled !== false && item.label.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [
    { key: "layout" as const, label: "Layout" },
    { key: "shadcn" as const, label: t("palette.shadcn") },
    { key: "html" as const, label: t("palette.html") },
  ];

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubCategory = (key: string) => {
    setExpandedSubCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAlphaToggle = () => {
    const next: SortMode = sortMode === "alpha-asc" ? "alpha-desc" : "alpha-asc";
    setSortMode(next);
    try { localStorage.setItem(SORT_MODE_KEY, next); } catch { /* ignore */ }
  };

  const handleCategoryToggle = () => {
    setSortMode("category");
    try { localStorage.setItem(SORT_MODE_KEY, "category"); } catch { /* ignore */ }
  };

  const isAlphaMode = sortMode === "alpha-asc" || sortMode === "alpha-desc";

  return (
    <div className="flex w-56 flex-col border-r border-[var(--vscode-panel-border,#333)] bg-[var(--vscode-sideBar-background,#252526)]">
      <div className="border-b border-[var(--vscode-panel-border,#333)] p-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--vscode-sideBarTitle-foreground,#bbb)]">
            {t("palette.title")}
          </h2>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleAlphaToggle}
              title={t("palette.sortAlpha")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                isAlphaMode
                  ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                  : "text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
              }`}
            >
              {sortMode === "alpha-desc" ? "Z–A" : "A–Z"}
            </button>
            <button
              type="button"
              onClick={handleCategoryToggle}
              title={t("palette.sortCategory")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                sortMode === "category"
                  ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                  : "text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
              }`}
            >
              ≡
            </button>
          </div>
        </div>
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
        {isAlphaMode ? (
          // アルファベット順フラット表示
          <div className="grid grid-cols-2 gap-1 px-1 py-1">
            {[...filteredItems]
              .sort((a, b) =>
                sortMode === "alpha-desc"
                  ? b.label.localeCompare(a.label)
                  : a.label.localeCompare(b.label),
              )
              .map((item) => (
                <PaletteItemCard key={item.resolverKey} item={item} connectors={connectors} />
              ))}
          </div>
        ) : (
          // カテゴリ順表示
          (() => {
            const visibleCats = categories.filter(
              (cat) => filteredItems.filter((i) => i.category === cat.key).length > 0,
            );
            return visibleCats.map((cat, catIdx) => {
              const catItems = filteredItems.filter((i) => i.category === cat.key);

              return (
                <div key={cat.key} className={catIdx > 0 ? "mt-3" : ""}>
                  {catIdx > 0 && (
                    <hr className="mb-2 border-[var(--vscode-panel-border,#333)]" />
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.key)}
                    className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[var(--vscode-sideBarSectionHeader-foreground,#bbb)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
                  >
                    <span className={`transition-transform ${expandedCategories[cat.key] ? "rotate-90" : ""}`}>
                      ▶
                    </span>
                    {cat.label}
                  </button>

                  {expandedCategories[cat.key] && (
                    cat.key === "shadcn" ? (
                      // shadcn は中カテゴリでグループ化
                      <div className="ml-2">
                        {(() => {
                          const visibleSubs = SUB_CATEGORIES.filter(
                            (sub) => catItems.filter((i) => i.subCategory === sub).length > 0,
                          );
                          return visibleSubs.map((sub, subIdx) => {
                            const subItems = catItems.filter((i) => i.subCategory === sub);
                            const subKey = `shadcn:${sub}`;
                            const subLabel = t(`palette.sub.${sub}`);
                            return (
                              <div key={sub} className={subIdx > 0 ? "mt-2" : ""}>
                                {subIdx > 0 && (
                                  <hr className="mb-1.5 border-[var(--vscode-panel-border,#2a2a2a)]" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleSubCategory(subKey)}
                                  className="flex w-full items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-[var(--vscode-foreground,#aaa)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]"
                                >
                                  <span className={`text-[9px] transition-transform ${expandedSubCategories[subKey] ? "rotate-90" : ""}`}>
                                    ▶
                                  </span>
                                  {subLabel}
                                </button>
                                {expandedSubCategories[subKey] && (
                                  <div className="grid grid-cols-2 gap-1 px-1 py-1">
                                    {subItems.map((item) => (
                                      <PaletteItemCard key={item.resolverKey} item={item} connectors={connectors} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1 px-1 py-1">
                        {catItems.map((item) => (
                          <PaletteItemCard key={item.resolverKey} item={item} connectors={connectors} />
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
            });
          })()
        )}
      </div>
    </div>
  );
}

function PaletteItemCard({
  item,
  connectors,
}: {
  item: (typeof paletteItems)[0];
  connectors: ReturnType<typeof useEditor>["connectors"];
}) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[item.icon];
  const Component = resolvers[item.resolverKey as ResolverKey];

  return (
    <div
      ref={(ref) => {
        if (ref) {
          connectors.create(
            ref,
            <Element is={Component} canvas={item.isCanvas ?? false} {...item.defaultProps} />,
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
