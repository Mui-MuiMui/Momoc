import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftToggleGroupProps {
  items?: string;
  type?: "single" | "multiple";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftToggleGroup: UserComponent<CraftToggleGroupProps> = ({
  items = "Bold,Italic,Underline",
  type = "single",
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
      role="group"
      className={cn("flex items-center justify-center gap-1", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {itemList.map((item, i) => (
        <button
          key={i}
          type="button"
          aria-pressed={i === 0}
          data-state={i === 0 ? "on" : "off"}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 px-3 min-w-9",
            i === 0 && "bg-accent text-accent-foreground",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
};

CraftToggleGroup.craft = {
  displayName: "ToggleGroup",
  props: {
    items: "Bold,Italic,Underline",
    type: "single",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
