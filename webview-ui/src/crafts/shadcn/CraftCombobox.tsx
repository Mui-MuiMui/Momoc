import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftComboboxProps {
  items?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  linkedMocPath?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftCombobox: UserComponent<CraftComboboxProps> = ({
  placeholder = "Select an option...",
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
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <span className="text-muted-foreground">{placeholder}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
    </button>
  );
};

CraftCombobox.craft = {
  displayName: "Combobox",
  props: {
    items: "Apple,Banana,Cherry",
    placeholder: "Select an option...",
    searchPlaceholder: "Search...",
    linkedMocPath: "",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
