import { useState } from "react";
import { useNode, useEditor, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

export type MenuItemDef =
  | { type: "item"; label: string; shortcut?: string }
  | { type: "checkbox"; label: string; checked?: boolean; shortcut?: string }
  | { type: "separator" };

export type TopLevelMenuDef = { label: string; items: MenuItemDef[] };
export type MenuData = TopLevelMenuDef[];

export const DEFAULT_MENUBAR_DATA: MenuData = [
  {
    label: "File",
    items: [
      { type: "item", label: "New File", shortcut: "Ctrl+N" },
      { type: "item", label: "Open...", shortcut: "Ctrl+O" },
      { type: "separator" },
      { type: "checkbox", label: "Auto Save", checked: false },
      { type: "separator" },
      { type: "item", label: "Exit" },
    ],
  },
  {
    label: "Edit",
    items: [
      { type: "item", label: "Undo", shortcut: "Ctrl+Z" },
      { type: "item", label: "Redo", shortcut: "Ctrl+Y" },
      { type: "separator" },
      { type: "item", label: "Cut", shortcut: "Ctrl+X" },
      { type: "item", label: "Copy", shortcut: "Ctrl+C" },
      { type: "item", label: "Paste", shortcut: "Ctrl+V" },
    ],
  },
  {
    label: "View",
    items: [
      { type: "checkbox", label: "Word Wrap", checked: false },
      { type: "separator" },
      { type: "item", label: "Zoom In", shortcut: "Ctrl++" },
      { type: "item", label: "Zoom Out", shortcut: "Ctrl+-" },
    ],
  },
  {
    label: "Help",
    items: [
      { type: "item", label: "Documentation" },
      { type: "item", label: "About" },
    ],
  },
];

function parseMenuData(raw: string): MenuData {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as MenuData;
    return DEFAULT_MENUBAR_DATA;
  } catch {
    return DEFAULT_MENUBAR_DATA;
  }
}

interface CraftMenubarProps {
  menuData?: string;
  width?: string;
  height?: string;
  className?: string;
  // Button styling
  buttonBgClass?: string;
  buttonTextClass?: string;
  buttonBorderClass?: string;
  buttonBorderWidth?: string;
  buttonShadowClass?: string;
  hoverBgClass?: string;
  hoverTextClass?: string;
  // Dropdown styling
  dropdownBgClass?: string;
  dropdownTextClass?: string;
  dropdownBorderClass?: string;
  dropdownBorderWidth?: string;
  dropdownShadowClass?: string;
  shortcutTextClass?: string;
}

export const CraftMenubar: UserComponent<CraftMenubarProps> = ({
  menuData = JSON.stringify(DEFAULT_MENUBAR_DATA),
  width = "auto",
  height = "auto",
  className = "",
  buttonBgClass = "",
  buttonTextClass = "",
  buttonBorderClass = "",
  buttonBorderWidth = "",
  buttonShadowClass = "",
  hoverBgClass = "",
  hoverTextClass = "",
  dropdownBgClass = "",
  dropdownTextClass = "",
  dropdownBorderClass = "",
  dropdownBorderWidth = "",
  dropdownShadowClass = "",
  shortcutTextClass = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const menus = parseMenuData(menuData);

  const btnBorderWidthClass =
    buttonBorderWidth === "0" ? "border-0"
    : buttonBorderWidth === "2" ? "border-2"
    : buttonBorderWidth === "4" ? "border-4"
    : buttonBorderWidth === "8" ? "border-8"
    : buttonBorderWidth === "1" ? "border"
    : "";

  const dropBorderWidthClass =
    dropdownBorderWidth === "0" ? "border-0"
    : dropdownBorderWidth === "2" ? "border-2"
    : dropdownBorderWidth === "4" ? "border-4"
    : dropdownBorderWidth === "8" ? "border-8"
    : "border";

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "flex h-9 items-center space-x-1 rounded-md border bg-background p-1",
        className,
      )}
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
      }}
    >
      {menus.map((menu, i) => (
        <div key={i} className="relative">
          <button
            type="button"
            onClick={() => setActiveIndex(activeIndex === i ? null : i)}
            className={cn(
              "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none",
              buttonBgClass,
              buttonTextClass,
              btnBorderWidthClass,
              buttonBorderClass,
              buttonShadowClass,
              activeIndex === i
                ? cn(hoverBgClass || "bg-accent", hoverTextClass || "text-accent-foreground")
                : cn(!hoverBgClass && "hover:bg-accent", !hoverTextClass && "hover:text-accent-foreground"),
            )}
          >
            {menu.label}
          </button>

          {activeIndex === i && (
            <div
              className={cn(
                "absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-md p-1",
                dropdownBgClass || "bg-popover",
                dropBorderWidthClass,
                dropdownBorderClass,
                dropdownShadowClass || "shadow-md",
                dropdownTextClass,
              )}
              onMouseLeave={enabled ? undefined : () => setActiveIndex(null)}
            >
              {menu.items.map((item, j) => {
                if (item.type === "separator") {
                  return <div key={j} className="my-1 h-px bg-border" />;
                }
                if (item.type === "checkbox") {
                  return (
                    <div
                      key={j}
                      className="flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                    >
                      <span className="mr-2 w-4 text-center text-xs">{item.checked ? "✓" : ""}</span>
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
                    className="flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent"
                  >
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className={cn("ml-auto text-xs", shortcutTextClass || "text-muted-foreground")}>{item.shortcut}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

CraftMenubar.craft = {
  displayName: "Menubar",
  props: {
    menuData: JSON.stringify(DEFAULT_MENUBAR_DATA),
    width: "auto",
    height: "auto",
    className: "",
    buttonBgClass: "",
    buttonTextClass: "",
    buttonBorderClass: "",
    buttonBorderWidth: "",
    buttonShadowClass: "",
    hoverBgClass: "",
    hoverTextClass: "",
    dropdownBgClass: "",
    dropdownTextClass: "",
    dropdownBorderClass: "",
    dropdownBorderWidth: "",
    dropdownShadowClass: "",
    shortcutTextClass: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
