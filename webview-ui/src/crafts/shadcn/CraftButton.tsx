import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { cva } from "class-variance-authority";
import { renderKbd } from "../../utils/renderKbd";
import * as Icons from "lucide-react";

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
  buttonType?: "text" | "icon";
  text?: string;
  icon?: string;
  iconSize?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  overlayType?: "none" | "dialog" | "alert-dialog" | "sheet" | "drawer" | "popover" | "dropdown-menu";
  linkedMocPath?: string;
  sheetSide?: "top" | "right" | "bottom" | "left";
  alertDialogPattern?: "cancel-continue" | "continue-cancel" | "yes-no" | "no-yes" | "ok-cancel" | "cancel-ok";
  overlayWidth?: string;
  overlayHeight?: string;
  overlayClassName?: string;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  toastText?: string;
  toastPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftButton: UserComponent<CraftButtonProps> = ({
  buttonType = "text",
  text = "Button",
  icon = "",
  iconSize = "4",
  variant = "default",
  size = "default",
  disabled = false,
  overlayType = "none",
  linkedMocPath = "",
  sheetSide = "right",
  alertDialogPattern = "cancel-continue",
  overlayWidth = "",
  overlayHeight = "",
  overlayClassName = "",
  tooltipText = "",
  tooltipSide = "",
  toastText = "",
  toastPosition = "bottom-right",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const overlayLabel = overlayType !== "none" ? OVERLAY_LABELS[overlayType] : null;

  const IconComponent = icon
    ? (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon]
    : null;

  const classes = className ? className.split(" ").filter(Boolean) : [];
  const marginClasses = classes.filter((c) => /^-?m[trblxy]?-/.test(c));
  const nonMarginClasses = classes.filter((c) => !/^-?m[trblxy]?-/.test(c));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative inline-flex", marginClasses.join(" "))}
      style={{ width: width && width !== "auto" ? width : undefined, height: height && height !== "auto" ? height : undefined }}
    >
      <button
        className={cn(buttonVariants({ variant, size }), nonMarginClasses.join(" "), width !== "auto" && "w-full", height !== "auto" && "h-full")}
        disabled={disabled}
        type="button"
      >
        {buttonType === "icon" && IconComponent ? <IconComponent className={`h-${iconSize} w-${iconSize}`} /> : renderKbd(text)}
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

CraftButton.craft = {
  displayName: "Button",
  props: {
    buttonType: "text",
    text: "Button",
    icon: "",
    iconSize: "4",
    variant: "default",
    size: "default",
    disabled: false,
    overlayType: "none",
    alertDialogPattern: "cancel-continue",
    linkedMocPath: "",
    sheetSide: "right",
    overlayWidth: "",
    overlayHeight: "",
    overlayClassName: "",
    tooltipText: "",
    tooltipSide: "",
    toastText: "",
    toastPosition: "bottom-right",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
