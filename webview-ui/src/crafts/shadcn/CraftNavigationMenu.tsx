import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftNavigationMenuProps {
  items?: string;
  linkedMocPath?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftNavigationMenu: UserComponent<CraftNavigationMenuProps> = ({
  items = "Home,About,Services,Contact",
  linkedMocPath = "",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const itemList = items.split(",").map((s) => s.trim());

  return (
    <nav
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <ul className="group flex flex-1 list-none items-center justify-center space-x-1">
        {itemList.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
            >
              {item}
              {i === 0 && linkedMocPath && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 h-3 w-3 opacity-50"><path d="m6 9 6 6 6-6"/></svg>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

CraftNavigationMenu.craft = {
  displayName: "NavigationMenu",
  props: {
    items: "Home,About,Services,Contact",
    linkedMocPath: "",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
