import { useState } from "react";
import { useNode, useEditor, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { type MenuData, type MenuItemDef } from "./CraftMenubar";

export const DEFAULT_DROPDOWN_DATA: MenuData = [
  {
    label: "",
    items: [
      { type: "item", label: "Profile" },
      { type: "item", label: "Settings" },
      { type: "separator" },
      { type: "checkbox", label: "Notifications", checked: false },
      { type: "separator" },
      { type: "item", label: "Log out" },
    ],
  },
];

function parseMenuData(raw: string): MenuData {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as MenuData;
    return DEFAULT_DROPDOWN_DATA;
  } catch {
    return DEFAULT_DROPDOWN_DATA;
  }
}

interface CraftDropdownMenuProps {
  triggerText?: string;
  menuData?: string;
  width?: string;
  height?: string;
  className?: string;
  // Trigger button styling
  triggerBgClass?: string;
  triggerTextClass?: string;
  triggerBorderClass?: string;
  triggerBorderWidth?: string;
  triggerShadowClass?: string;
  // Dropdown panel styling
  dropdownBgClass?: string;
  dropdownTextClass?: string;
  dropdownBorderClass?: string;
  dropdownBorderWidth?: string;
  dropdownShadowClass?: string;
  // Item styling
  hoverBgClass?: string;
  hoverTextClass?: string;
  shortcutTextClass?: string;
  checkTextClass?: string;
}

export const CraftDropdownMenu: UserComponent<CraftDropdownMenuProps> = ({
  triggerText = "Open Menu",
  menuData = JSON.stringify(DEFAULT_DROPDOWN_DATA),
  width = "auto",
  height = "auto",
  className = "",
  triggerBgClass = "",
  triggerTextClass = "",
  triggerBorderClass = "",
  triggerBorderWidth = "",
  triggerShadowClass = "",
  dropdownBgClass = "",
  dropdownTextClass = "",
  dropdownBorderClass = "",
  dropdownBorderWidth = "",
  dropdownShadowClass = "",
  hoverBgClass = "",
  hoverTextClass = "",
  shortcutTextClass = "",
  checkTextClass = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const menus = parseMenuData(menuData);

  const triggerBwClass =
    triggerBorderWidth === "0" ? "border-0"
    : triggerBorderWidth === "2" ? "border-2"
    : triggerBorderWidth === "4" ? "border-4"
    : triggerBorderWidth === "8" ? "border-8"
    : triggerBorderWidth === "1" ? "border"
    : "";

  const dropBwClass =
    dropdownBorderWidth === "0" ? "border-0"
    : dropdownBorderWidth === "2" ? "border-2"
    : dropdownBorderWidth === "4" ? "border-4"
    : dropdownBorderWidth === "8" ? "border-8"
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
      className={cn("relative inline-block", className)}
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2",
          triggerBgClass || "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
          triggerTextClass,
          triggerBwClass,
          triggerBorderClass,
          triggerShadowClass,
        )}
      >
        {triggerText}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-md p-1",
            dropdownBgClass || "bg-popover",
            dropBwClass,
            dropdownBorderClass,
            dropdownShadowClass || "shadow-md",
            dropdownTextClass,
          )}
          onMouseLeave={enabled ? undefined : () => setOpen(false)}
        >
          {menus.flatMap((menu, sectionIdx) => {
            const items: React.ReactNode[] = [];
            if (sectionIdx > 0) {
              items.push(<div key={`sep-section-${sectionIdx}`} className="my-1 h-px bg-border" />);
            }
            if (menu.label) {
              items.push(
                <div key={`label-${sectionIdx}`} className="px-2 py-1.5 text-xs font-semibold">
                  {menu.label}
                </div>
              );
            }
            menu.items.forEach((item: MenuItemDef, j: number) => {
              const key = `${sectionIdx}-${j}`;
              if (item.type === "separator") {
                items.push(<div key={key} className="my-1 h-px bg-border" />);
              } else if (item.type === "checkbox") {
                const checked = getChecked(key, item.checked ?? false);
                items.push(
                  <div
                    key={key}
                    className={itemCls(key, "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none")}
                    onMouseEnter={() => setHoveredItem(key)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => toggleChecked(key, item.checked ?? false)}
                  >
                    <span className={cn("mr-2 w-4 text-center text-xs", checkTextClass)}>{checked ? "✓" : ""}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className={cn("ml-auto text-xs", shortcutTextClass || "text-muted-foreground")}>{item.shortcut}</span>
                    )}
                  </div>
                );
              } else {
                items.push(
                  <div
                    key={key}
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
              }
            });
            return items;
          })}
        </div>
      )}
    </div>
  );
};

CraftDropdownMenu.craft = {
  displayName: "DropdownMenu",
  props: {
    triggerText: "Open Menu",
    menuData: JSON.stringify(DEFAULT_DROPDOWN_DATA),
    width: "auto",
    height: "auto",
    className: "",
    triggerBgClass: "",
    triggerTextClass: "",
    triggerBorderClass: "",
    triggerBorderWidth: "",
    triggerShadowClass: "",
    dropdownBgClass: "",
    dropdownTextClass: "",
    dropdownBorderClass: "",
    dropdownBorderWidth: "",
    dropdownShadowClass: "",
    hoverBgClass: "",
    hoverTextClass: "",
    shortcutTextClass: "",
    checkTextClass: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
