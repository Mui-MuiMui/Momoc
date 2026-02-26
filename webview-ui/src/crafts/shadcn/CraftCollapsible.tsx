import { Element, useNode, type UserComponent } from "@craftjs/core";
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

/** Internal canvas slot used by CraftCollapsible for header/content drop zones */
export const CollapsibleSlot: UserComponent<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn("min-h-[20px]", className)}
    >
      {children}
    </div>
  );
};

CollapsibleSlot.craft = {
  displayName: "CollapsibleSlot",
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

interface CraftCollapsibleProps {
  open?: boolean;
  triggerStyle?: "chevron" | "plus-minus" | "arrow" | "none";
  linkedMocPath?: string;
  width?: string;
  height?: string;
  className?: string;
  outerBorderColor?: string;
  dividerBorderColor?: string;
  triggerBorderColor?: string;
  outerShadow?: string;
  contentShadow?: string;
  triggerShadow?: string;
}

export const CraftCollapsible: UserComponent<CraftCollapsibleProps> = ({
  open = false,
  triggerStyle = "chevron",
  linkedMocPath = "",
  width = "auto",
  height = "auto",
  className = "",
  outerBorderColor = "",
  dividerBorderColor = "",
  triggerBorderColor = "",
  outerShadow = "",
  contentShadow = "",
  triggerShadow = "",
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
      className={cn("w-full rounded-md border", outerBorderColor, outerShadow, className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {/* Header zone - always visible, drop zone for any components */}
      <div className="flex items-center justify-between space-x-4 px-4 py-2">
        <div className="flex-1">
          <Element id="header" is={CollapsibleSlot} canvas className="flex min-h-[24px] items-center gap-2" />
        </div>
        {triggerStyle !== "none" && (
          <button type="button" className={cn("rounded-md border p-1 hover:bg-accent", triggerBorderColor, triggerShadow)}>
            <TriggerIcon style={triggerStyle} />
          </button>
        )}
      </div>
      {/* Content zone */}
      <div className={cn("border-t px-4 py-2 text-sm", dividerBorderColor, contentShadow)}>
        {linkedMocPath ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LinkIcon />
            <span>{linkedFileName || linkedMocPath}</span>
          </div>
        ) : (
          <Element id="content" is={CollapsibleSlot} canvas className="min-h-[40px]" />
        )}
      </div>
    </div>
  );
};

CraftCollapsible.craft = {
  displayName: "Collapsible",
  props: {
    open: false,
    triggerStyle: "chevron",
    linkedMocPath: "",
    width: "auto",
    height: "auto",
    className: "",
    outerBorderColor: "",
    dividerBorderColor: "",
    triggerBorderColor: "",
    outerShadow: "",
    contentShadow: "",
    triggerShadow: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
};
