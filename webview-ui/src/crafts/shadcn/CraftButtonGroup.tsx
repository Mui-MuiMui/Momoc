import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { cva } from "class-variance-authority";
import { renderKbd } from "../../utils/renderKbd";

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

// --- CraftButtonGroup (container) ---

interface CraftButtonGroupProps {
  orientation?: "horizontal" | "vertical";
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftButtonGroup: UserComponent<CraftButtonGroupProps> = ({
  orientation = "horizontal",
  width = "auto",
  height = "auto",
  className = "",
  children,
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const groupCls =
    orientation === "vertical"
      ? "flex flex-col w-fit [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none"
      : "flex w-fit [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none";

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      role="group"
      className={cn(groupCls, className)}
      style={{ width: width && width !== "auto" ? width : undefined, height: height && height !== "auto" ? height : undefined }}
    >
      {children ?? (
        <div className="min-h-[36px] min-w-[160px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md px-3">
          Drop Button Group Items here
        </div>
      )}
    </div>
  );
};

CraftButtonGroup.craft = {
  displayName: "ButtonGroup",
  props: {
    orientation: "horizontal",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: (nodes) => nodes.every((n) => n.data.displayName === "ButtonGroupItem"),
  },
};

// --- CraftButtonGroupItem (button item) ---

interface CraftButtonGroupItemProps {
  text?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  overlayType?: "none" | "dialog" | "alert-dialog" | "sheet" | "drawer" | "popover" | "dropdown-menu";
  linkedMocPath?: string;
  sheetSide?: "top" | "right" | "bottom" | "left";
  overlayWidth?: string;
  overlayHeight?: string;
  overlayClassName?: string;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  toastText?: string;
  toastPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
}

export const CraftButtonGroupItem: UserComponent<CraftButtonGroupItemProps> = ({
  text = "Button",
  variant = "outline",
  size = "default",
  disabled = false,
  overlayType = "none",
  linkedMocPath = "",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const overlayLabel = overlayType !== "none" ? OVERLAY_LABELS[overlayType] : null;

  const classes = className ? className.split(" ").filter(Boolean) : [];
  const marginClasses = classes.filter((c) => /^-?m[trblxy]?-/.test(c));
  const nonMarginClasses = classes.filter((c) => !/^-?m[trblxy]?-/.test(c));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative inline-flex", marginClasses.join(" "))}
    >
      <button
        className={cn(buttonVariants({ variant, size }), nonMarginClasses.join(" "))}
        disabled={disabled}
        type="button"
      >
        {renderKbd(text)}
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
    </div>
  );
};

CraftButtonGroupItem.craft = {
  displayName: "ButtonGroupItem",
  props: {
    text: "Button",
    variant: "outline",
    size: "default",
    disabled: false,
    overlayType: "none",
    linkedMocPath: "",
    sheetSide: "right",
    overlayWidth: "",
    overlayHeight: "",
    overlayClassName: "",
    tooltipText: "",
    tooltipSide: "",
    toastText: "",
    toastPosition: "bottom-right",
    className: "",
  },
  rules: {
    canDrag: () => false,
    canMoveOut: () => false,
    canMoveIn: () => false,
  },
};
