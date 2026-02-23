import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftCommandProps {
  placeholder?: string;
  items?: string;
  linkedMocPath?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftCommand: UserComponent<CraftCommandProps> = ({
  placeholder = "Type a command or search...",
  items = "Calendar,Search,Settings",
  linkedMocPath = "",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const itemList = items.split(",").map((s) => s.trim());

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("flex flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="flex items-center border-b px-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 shrink-0 opacity-50"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          type="text"
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="max-h-[200px] overflow-y-auto p-1">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Suggestions</div>
        {itemList.map((item, i) => (
          <div key={i} className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

CraftCommand.craft = {
  displayName: "Command",
  props: {
    placeholder: "Type a command or search...",
    items: "Calendar,Search,Settings",
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
