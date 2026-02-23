import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { cva } from "class-variance-authority";
import * as Icons from "lucide-react";

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
  size?: "default" | "sm" | "lg";
  pressed?: boolean;
  disabled?: boolean;
  icon?: string;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftToggle: UserComponent<CraftToggleProps> = ({
  text = "Toggle",
  variant = "default",
  size = "default",
  pressed = false,
  disabled = false,
  icon = "",
  tooltipText = "",
  tooltipSide = "",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const IconComponent = icon
    ? (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon]
    : null;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      style={{ display: "inline-flex", width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <button
        type="button"
        aria-pressed={pressed}
        data-state={pressed ? "on" : "off"}
        disabled={disabled}
        className={cn(
          toggleVariants({ variant, size }),
          pressed ? "bg-accent text-accent-foreground" : "bg-transparent",
          className,
        )}
        style={{ width: "100%", height: "100%" }}
      >
        {IconComponent && <IconComponent className="h-4 w-4" />}
        {text}
      </button>
    </div>
  );
};

CraftToggle.craft = {
  displayName: "Toggle",
  props: {
    text: "Toggle",
    variant: "default",
    size: "default",
    pressed: false,
    disabled: false,
    icon: "",
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
