import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftCollapsibleProps {
  open?: boolean;
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftCollapsible: UserComponent<CraftCollapsibleProps> = ({
  open = false,
  width = "auto",
  height = "auto",
  className = "",
  children,
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("w-full rounded-md border px-4 py-2", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="flex items-center justify-between space-x-4">
        <h4 className="text-sm font-semibold">Collapsible Section</h4>
        <button type="button" className="rounded-md border p-1 hover:bg-accent">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>
      {open && (
        <div className="mt-2 rounded-md border px-4 py-2 text-sm">
          {children || "Collapsible content goes here."}
        </div>
      )}
    </div>
  );
};

CraftCollapsible.craft = {
  displayName: "Collapsible",
  props: {
    open: false,
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};
