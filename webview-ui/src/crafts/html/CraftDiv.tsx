import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftDivProps {
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftDiv: UserComponent<CraftDivProps> = ({
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
      className={cn("min-h-[40px] min-w-[40px] p-2", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {children}
    </div>
  );
};

CraftDiv.craft = {
  displayName: "Div",
  props: {
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
