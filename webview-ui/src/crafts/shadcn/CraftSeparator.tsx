import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftSeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export const CraftSeparator: UserComponent<CraftSeparatorProps> = ({
  orientation = "horizontal",
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
    />
  );
};

CraftSeparator.craft = {
  displayName: "Separator",
  props: {
    orientation: "horizontal",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
