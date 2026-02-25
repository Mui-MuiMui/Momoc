import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftCardProps {
  title?: string;
  description?: string;
  contextMenuMocPath?: string;
  linkedMocPath?: string;
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftCard: UserComponent<CraftCardProps> = ({
  title = "Card Title",
  description = "",
  contextMenuMocPath = "",
  linkedMocPath = "",
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
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow",
        contextMenuMocPath && "ring-1 ring-dashed ring-muted-foreground/30",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {(title || description) && (
        <div className="flex flex-col space-y-1.5 p-6">
          {title && (
            <h3 className="font-semibold leading-none tracking-tight flex items-center gap-1.5" style={{ whiteSpace: "pre-line" }}>
              {title}
              {linkedMocPath && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 opacity-50"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              )}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground" style={{ whiteSpace: "pre-line" }}>{description}</p>
          )}
        </div>
      )}
      <div className="p-6 pt-0">{children}</div>
    </div>
  );
};

CraftCard.craft = {
  displayName: "Card",
  props: {
    title: "Card Title",
    description: "",
    contextMenuMocPath: "",
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
