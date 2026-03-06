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

export interface ButtonDef {
  text: string;
  disabled?: boolean;
  overlayType?: "none" | "dialog" | "alert-dialog" | "sheet" | "drawer" | "popover" | "dropdown-menu";
  linkedMocPath?: string;
  sheetSide?: "top" | "right" | "bottom" | "left";
  overlayWidth?: string;
  overlayHeight?: string;
  overlayClassName?: string;
  toastText?: string;
  toastPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export const DEFAULT_BUTTON_DATA: ButtonDef[] = [
  { text: "Button 1", overlayType: "none" },
  { text: "Button 2", overlayType: "none" },
  { text: "Button 3", overlayType: "none" },
];

function parseButtonData(raw: string): ButtonDef[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ButtonDef[];
    return DEFAULT_BUTTON_DATA;
  } catch {
    return DEFAULT_BUTTON_DATA;
  }
}

interface CraftButtonGroupProps {
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  buttonData?: string;
  width?: string;
  height?: string;
  className?: string;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  tooltipTrigger?: "hover" | "focus";
  hoverCardMocPath?: string;
  hoverCardSide?: "top" | "right" | "bottom" | "left";
  hoverCardTrigger?: "hover" | "focus";
  contextMenuMocPath?: string;
}

export const CraftButtonGroup: UserComponent<CraftButtonGroupProps> = ({
  orientation = "horizontal",
  variant = "outline",
  size = "default",
  buttonData = JSON.stringify(DEFAULT_BUTTON_DATA),
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const buttons = parseButtonData(buttonData);

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
      {buttons.map((btn, i) => {
        const overlayLabel = btn.overlayType && btn.overlayType !== "none" ? OVERLAY_LABELS[btn.overlayType] : null;
        return (
          <div key={i} className="relative inline-flex">
            <button
              className={buttonVariants({ variant: variant ?? "outline", size: size ?? "default" })}
              disabled={btn.disabled}
              type="button"
            >
              {renderKbd(btn.text)}
              {btn.linkedMocPath && (
                <span className="ml-1 opacity-60" title={btn.linkedMocPath}>
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
      })}
    </div>
  );
};

CraftButtonGroup.craft = {
  displayName: "ButtonGroup",
  props: {
    buttonData: JSON.stringify(DEFAULT_BUTTON_DATA),
    orientation: "horizontal",
    variant: "outline",
    size: "default",
    width: "auto",
    height: "auto",
    className: "",
    tooltipText: "",
    tooltipSide: "",
    tooltipTrigger: "hover",
    hoverCardMocPath: "",
    hoverCardSide: "bottom",
    hoverCardTrigger: "hover",
    contextMenuMocPath: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
