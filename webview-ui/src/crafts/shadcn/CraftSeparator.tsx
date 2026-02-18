import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftSeparatorProps {
  orientation?: "horizontal" | "vertical";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftSeparator: UserComponent<CraftSeparatorProps> = ({
  orientation = "horizontal",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      role="separator"
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    />
  );
};

CraftSeparator.craft = {
  displayName: "Separator",
  props: {
    orientation: "horizontal",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
