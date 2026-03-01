import { useState } from "react";
import { Element, useNode, useEditor, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import type { ReactNode } from "react";

/** Internal canvas slot for each nav item's dropdown content */
export const NavMenuSlot: UserComponent<{ children?: ReactNode }> = ({ children }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="min-h-[60px] min-w-[160px]"
    >
      {children}
    </div>
  );
};

NavMenuSlot.craft = {
  displayName: "NavMenuSlot",
  custom: { noResize: true },
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

interface CraftNavigationMenuProps {
  items?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftNavigationMenu: UserComponent<CraftNavigationMenuProps> = ({
  items = "Getting Started,Components,Documentation",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const itemList = (items || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <nav
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative flex items-center", className)}
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
      }}
    >
      <ul className="flex list-none items-center gap-1">
        {itemList.map((item, i) => (
          <li key={i} className="relative">
            {/* Nav item button */}
            <button
              type="button"
              onClick={enabled ? () => setActiveIndex(activeIndex === i ? null : i) : undefined}
              onMouseEnter={!enabled ? () => setActiveIndex(i) : undefined}
              onMouseLeave={!enabled ? () => setActiveIndex(null) : undefined}
              className={cn(
                "inline-flex h-9 w-max items-center justify-center gap-1 rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none",
                activeIndex === i && "bg-accent text-accent-foreground",
              )}
            >
              {item}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-1 h-3 w-3 opacity-50"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* Dropdown panel — all slots rendered, inactive hidden via display:none */}
            {itemList.map((_, j) =>
              j === i ? (
                <div
                  key={j}
                  style={{ display: activeIndex === i ? undefined : "none" }}
                  className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2"
                >
                  <Element id={`menu_${i}`} is={NavMenuSlot} canvas />
                </div>
              ) : null,
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

CraftNavigationMenu.craft = {
  displayName: "Navigation Menu",
  props: {
    items: "Getting Started,Components,Documentation",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
