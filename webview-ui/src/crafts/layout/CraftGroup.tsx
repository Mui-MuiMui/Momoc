import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftGroupProps {
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftGroup: UserComponent<CraftGroupProps> = ({
  width = "200px",
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
      className={cn("relative", className)}
      style={{ width, height }}
    >
      {children}
    </div>
  );
};

CraftGroup.craft = {
  displayName: "Group",
  props: {
    width: "200px",
    height: "200px",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
};
