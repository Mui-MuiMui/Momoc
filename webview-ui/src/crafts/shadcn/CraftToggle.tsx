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

interface CraftToggleProps {
  text?: string;
  variant?: "default" | "outline";
  pressed?: boolean;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftToggle: UserComponent<CraftToggleProps> = ({
  text = "Toggle",
  variant = "default",
  pressed = false,
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <button
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      className={cn(
        toggleVariants({ variant }),
        pressed ? "bg-accent text-accent-foreground" : "bg-transparent",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {text}
    </button>
  );
};

CraftToggle.craft = {
  displayName: "Toggle",
  props: {
    text: "Toggle",
    variant: "default",
    pressed: false,
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
