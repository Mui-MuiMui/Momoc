import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftScrollAreaProps {
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftScrollArea: UserComponent<CraftScrollAreaProps> = ({
  width = "auto",
  height = "200px",
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
      className={cn("relative overflow-auto rounded-md border", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

CraftScrollArea.craft = {
  displayName: "ScrollArea",
  props: {
    width: "auto",
    height: "200px",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};
