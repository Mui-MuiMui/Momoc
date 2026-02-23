import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { cva } from "class-variance-authority";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-3 min-w-9",
        sm: "h-8 px-2 min-w-8",
        lg: "h-10 px-3 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const gapMap: Record<string, string> = {
  "0": "gap-0", "1": "gap-1", "2": "gap-2", "3": "gap-3",
  "4": "gap-4", "6": "gap-6", "8": "gap-8",
};

interface CraftToggleGroupProps {
  items?: string;
  type?: "single" | "multiple";
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  gap?: string;
  orientation?: "horizontal" | "vertical";
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftToggleGroup: UserComponent<CraftToggleGroupProps> = ({
  items = "Bold,Italic,Underline",
  type = "single",
  variant = "default",
  size = "default",
  disabled = false,
  gap = "1",
  orientation = "horizontal",
  tooltipText = "",
  tooltipSide = "",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const itemList = items.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      role="group"
      data-disabled={disabled || undefined}
      className={cn(
        "flex items-center justify-center",
        orientation === "vertical" ? "flex-col" : "flex-row",
        gapMap[gap] || "gap-1",
        disabled ? "opacity-50 pointer-events-none" : "",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {itemList.map((item, i) => (
        <button
          key={i}
          type="button"
          aria-pressed={i === 0}
          data-state={i === 0 ? "on" : "off"}
          className={cn(
            toggleVariants({ variant, size }),
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
    variant: "default",
    size: "default",
    disabled: false,
    gap: "1",
    orientation: "horizontal",
    tooltipText: "",
    tooltipSide: "",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
