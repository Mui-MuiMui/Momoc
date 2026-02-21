import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftCardProps {
  title?: string;
  description?: string;
  contextMenuMocPath?: string;
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftCard: UserComponent<CraftCardProps> = ({
  title = "Card Title",
  description = "",
  contextMenuMocPath = "",
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
          {title && <h3 className="font-semibold leading-none tracking-tight" style={{ whiteSpace: "pre-line" }}>{title}</h3>}
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
