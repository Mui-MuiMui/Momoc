import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftInputProps {
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CraftInput: UserComponent<CraftInputProps> = ({
  type = "text",
  placeholder = "Enter text...",
  disabled = false,
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <input
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
};

CraftInput.craft = {
  displayName: "Input",
  props: {
    type: "text",
    placeholder: "Enter text...",
    disabled: false,
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
