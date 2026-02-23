import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftResizableProps {
  direction?: "horizontal" | "vertical";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftResizable: UserComponent<CraftResizableProps> = ({
  direction = "horizontal",
  width = "auto",
  height = "200px",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const isHorizontal = direction === "horizontal";

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "flex rounded-lg border",
        isHorizontal ? "flex-row" : "flex-col",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Panel 1
      </div>
      <div className={cn(
        "relative flex items-center justify-center bg-border",
        isHorizontal ? "w-px" : "h-px",
      )}>
        <div className={cn(
          "z-10 flex items-center justify-center rounded-sm border bg-border",
          isHorizontal ? "h-8 w-3" : "h-3 w-8",
        )}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Panel 2
      </div>
    </div>
  );
};

CraftResizable.craft = {
  displayName: "Resizable",
  props: {
    direction: "horizontal",
    width: "auto",
    height: "200px",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
