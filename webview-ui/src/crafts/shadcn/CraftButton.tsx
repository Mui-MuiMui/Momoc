import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-pre-line rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const OVERLAY_LABELS: Record<string, string> = {
  dialog: "Dialog",
  "alert-dialog": "Alert",
  sheet: "Sheet",
  drawer: "Drawer",
  popover: "Popover",
  "dropdown-menu": "Menu",
};

interface CraftButtonProps {
  text?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  overlayType?: "none" | "dialog" | "alert-dialog" | "sheet" | "drawer" | "popover" | "dropdown-menu";
  linkedMocPath?: string;
  sheetSide?: "top" | "right" | "bottom" | "left";
  tooltipText?: string;
  toastText?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftButton: UserComponent<CraftButtonProps> = ({
  text = "Button",
  variant = "default",
  size = "default",
  disabled = false,
  overlayType = "none",
  linkedMocPath = "",
  sheetSide = "right",
  tooltipText = "",
  toastText = "",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const overlayLabel = overlayType !== "none" ? OVERLAY_LABELS[overlayType] : null;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className="relative inline-flex flex-col items-start"
    >
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled}
        type="button"
        style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
      >
        {text}
        {linkedMocPath && (
          <span className="ml-1 opacity-60" title={linkedMocPath}>
            &#128279;
          </span>
        )}
      </button>
      {overlayLabel && (
        <span className="absolute -right-1 -top-2 rounded bg-blue-600 px-1 py-0.5 text-[9px] leading-none text-white shadow">
          {overlayLabel}
        </span>
      )}
      {tooltipText && (
        <span className="mt-1 rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md border border-border">
          {tooltipText}
        </span>
      )}
    </div>
  );
};

CraftButton.craft = {
  displayName: "Button",
  props: {
    text: "Button",
    variant: "default",
    size: "default",
    disabled: false,
    overlayType: "none",
    linkedMocPath: "",
    sheetSide: "right",
    tooltipText: "",
    toastText: "",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
