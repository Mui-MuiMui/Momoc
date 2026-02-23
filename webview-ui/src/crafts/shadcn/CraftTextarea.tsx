import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftTextareaProps {
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  tooltipTrigger?: "hover" | "focus";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftTextarea: UserComponent<CraftTextareaProps> = ({
  placeholder = "Type your message here.",
  rows = 3,
  disabled = false,
  tooltipText = "",
  tooltipSide = "",
  tooltipTrigger = "hover",
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
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <textarea
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          height !== "auto" && "h-full",
          className,
        )}
      />
    </div>
  );
};

CraftTextarea.craft = {
  displayName: "Textarea",
  props: {
    placeholder: "Type your message here.",
    rows: 3,
    disabled: false,
    tooltipText: "",
    tooltipSide: "",
    tooltipTrigger: "hover",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
