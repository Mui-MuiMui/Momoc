import { useNode, useEditor, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftInputProps {
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  placeholder?: string;
  disabled?: boolean;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  tooltipTrigger?: "hover" | "focus";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftInput: UserComponent<CraftInputProps> = ({
  type = "text",
  placeholder = "Enter text...",
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
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      style={{ width: width !== "auto" ? width : undefined }}
    >
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        style={{ height: height !== "auto" ? height : undefined, pointerEvents: enabled ? "none" : undefined }}
      />
    </div>
  );
};

CraftInput.craft = {
  displayName: "Input",
  props: {
    type: "text",
    placeholder: "Enter text...",
    disabled: false,
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
