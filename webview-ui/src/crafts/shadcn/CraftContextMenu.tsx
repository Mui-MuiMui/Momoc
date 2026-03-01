import { useState } from "react";
import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { type MenuData, type MenuItemDef, type TopLevelMenuDef } from "./CraftMenubar";

export const DEFAULT_CONTEXTMENU_DATA: MenuData = [
  {
    label: "",
    items: [
      { type: "item", label: "Open", shortcut: "Ctrl+O" },
      { type: "item", label: "Edit" },
      { type: "separator" },
      { type: "checkbox", label: "Show Details", checked: false },
      { type: "separator" },
      { type: "item", label: "Delete" },
    ],
  },
];

function parseMenuData(raw: string): MenuData {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as MenuData;
    return DEFAULT_CONTEXTMENU_DATA;
  } catch {
    return DEFAULT_CONTEXTMENU_DATA;
  }
}

interface CraftContextMenuProps {
  menuData?: string;
  width?: string;
  height?: string;
  className?: string;
  panelBgClass?: string;
  panelTextClass?: string;
  panelBorderClass?: string;
  panelBorderWidth?: string;
  panelShadowClass?: string;
  hoverBgClass?: string;
  hoverTextClass?: string;
  shortcutTextClass?: string;
}

export const CraftContextMenu: UserComponent<CraftContextMenuProps> = ({
  menuData = JSON.stringify(DEFAULT_CONTEXTMENU_DATA),
  width = "200px",
  height = "auto",
  className = "",
  panelBgClass = "",
  panelTextClass = "",
  panelBorderClass = "",
  panelBorderWidth = "",
  panelShadowClass = "",
  hoverBgClass = "",
  hoverTextClass = "",
  shortcutTextClass = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const menus = parseMenuData(menuData);

  const panelBorderWidthClass =
    panelBorderWidth === "0" ? "border-0"
    : panelBorderWidth === "2" ? "border-2"
    : panelBorderWidth === "4" ? "border-4"
    : panelBorderWidth === "8" ? "border-8"
    : panelBorderWidth === "1" ? "border"
    : "border";

  const getChecked = (key: string, initial: boolean) =>
    key in checkedItems ? checkedItems[key] : initial;

  const toggleChecked = (key: string, initial: boolean) =>
    setCheckedItems((prev) => ({ ...prev, [key]: !(key in prev ? prev[key] : initial) }));

  const itemCls = (key: string, base: string) =>
    cn(
      base,
      hoverBgClass || hoverTextClass
        ? hoveredItem === key ? cn(hoverBgClass, hoverTextClass) : ""
        : "hover:bg-accent",
    );

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "flex flex-col rounded-md p-1",
        panelBgClass || "bg-popover",
        panelBorderWidthClass,
        panelBorderClass,
        panelShadowClass || "shadow-md",
        panelTextClass,
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="px-2 py-1 text-xs text-muted-foreground font-medium border-b border-border mb-1">
        右クリックメニュー
      </div>
      {menus.map((menu: TopLevelMenuDef, sectionIdx: number) => (
        <div key={sectionIdx}>
          {sectionIdx > 0 && <div className="my-1 h-px bg-border" />}
          {menu.label && (
            <div className="px-2 py-1.5 text-xs font-semibold">{menu.label}</div>
          )}
          {menu.items.map((item: MenuItemDef, j: number) => {
            const key = `${sectionIdx}-${j}`;
            if (item.type === "separator") {
              return <div key={j} className="my-1 h-px bg-border" />;
            }
            if (item.type === "checkbox") {
              const checked = getChecked(key, item.checked ?? false);
              return (
                <div
                  key={j}
                  className={itemCls(key, "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none")}
                  onMouseEnter={() => setHoveredItem(key)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => toggleChecked(key, item.checked ?? false)}
                >
                  <span className="mr-2 w-4 text-center text-xs">{checked ? "✓" : ""}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className={cn("ml-auto text-xs", shortcutTextClass || "text-muted-foreground")}>{item.shortcut}</span>
                  )}
                </div>
              );
            }
            return (
              <div
                key={j}
                className={itemCls(key, "flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none")}
                onMouseEnter={() => setHoveredItem(key)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className={cn("ml-auto text-xs", shortcutTextClass || "text-muted-foreground")}>{item.shortcut}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

CraftContextMenu.craft = {
  displayName: "ContextMenu",
  props: {
    menuData: JSON.stringify(DEFAULT_CONTEXTMENU_DATA),
    width: "200px",
    height: "auto",
    className: "",
    panelBgClass: "",
    panelTextClass: "",
    panelBorderClass: "",
    panelBorderWidth: "",
    panelShadowClass: "",
    hoverBgClass: "",
    hoverTextClass: "",
    shortcutTextClass: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
