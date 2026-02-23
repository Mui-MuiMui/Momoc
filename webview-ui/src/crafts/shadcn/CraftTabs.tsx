import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftTabsProps {
  items?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftTabs: UserComponent<CraftTabsProps> = ({
  items = "Tab 1,Tab 2,Tab 3",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const itemList = items.split(",").map((s) => s.trim());

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("w-full", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full">
        {itemList.map((item, i) => (
          <button
            key={i}
            type="button"
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              i === 0
                ? "bg-background text-foreground shadow"
                : "",
            )}
            style={{ flex: 1 }}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-2 rounded-md border p-4 text-sm">
        Content for {itemList[0]}
      </div>
    </div>
  );
};

CraftTabs.craft = {
  displayName: "Tabs",
  props: {
    items: "Tab 1,Tab 2,Tab 3",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
