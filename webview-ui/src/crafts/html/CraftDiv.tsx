import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftDivProps {
  className?: string;
  children?: React.ReactNode;
}

export const CraftDiv: UserComponent<CraftDivProps> = ({
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
    >
      {children}
    </div>
  );
};

CraftDiv.craft = {
  displayName: "Div",
  props: {
    className: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};
