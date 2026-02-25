import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

const ChevronIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>
);
const PlusMinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
);
const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 opacity-50"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);

function TriggerIcon({ style }: { style: string }) {
  if (style === "plus-minus") return <PlusMinusIcon />;
  if (style === "arrow") return <ArrowIcon />;
  if (style === "chevron") return <ChevronIcon />;
  return null;
}

interface CraftCollapsibleProps {
  title?: string;
  open?: boolean;
  triggerStyle?: "chevron" | "plus-minus" | "arrow" | "none";
  linkedMocPath?: string;
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftCollapsible: UserComponent<CraftCollapsibleProps> = ({
  title = "Collapsible Section",
  open = false,
  triggerStyle = "chevron",
  linkedMocPath = "",
  width = "auto",
  height = "auto",
  className = "",
  children,
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const linkedFileName = linkedMocPath ? linkedMocPath.split("/").pop() : "";

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("w-full rounded-md border", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between space-x-4 px-4 py-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          {title}
          {linkedMocPath && <LinkIcon />}
        </h4>
        {triggerStyle !== "none" && (
          <button type="button" className="rounded-md border p-1 hover:bg-accent">
            <TriggerIcon style={triggerStyle} />
          </button>
        )}
      </div>
      {/* Content area */}
      {open && (
        <div className="border-t px-4 py-2 text-sm">
          {linkedMocPath ? (
            <div className="flex items-center gap-1.5 rounded border border-dashed border-muted-foreground/40 px-3 py-2 text-xs text-muted-foreground">
              <LinkIcon />
              {linkedFileName || linkedMocPath}
            </div>
          ) : (
            children || <p className="text-xs text-muted-foreground">Collapsible content goes here.</p>
          )}
        </div>
      )}
    </div>
  );
};

CraftCollapsible.craft = {
  displayName: "Collapsible",
  props: {
    title: "Collapsible Section",
    open: false,
    triggerStyle: "chevron",
    linkedMocPath: "",
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
