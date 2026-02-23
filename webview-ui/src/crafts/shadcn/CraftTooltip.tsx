import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftTooltipProps {
  triggerText?: string;
  text?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftTooltip: UserComponent<CraftTooltipProps> = ({
  triggerText = "Hover",
  text = "Tooltip text",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("inline-flex flex-col items-center gap-1", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
      >
        {triggerText}
      </button>
      <div className="z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95">
        {text}
      </div>
    </div>
  );
};

CraftTooltip.craft = {
  displayName: "Tooltip",
  props: {
    triggerText: "Hover",
    text: "Tooltip text",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
