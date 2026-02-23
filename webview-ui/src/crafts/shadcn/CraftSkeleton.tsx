import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftSkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export const CraftSkeleton: UserComponent<CraftSkeletonProps> = ({
  width = "100%",
  height = "20px",
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
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    />
  );
};

CraftSkeleton.craft = {
  displayName: "Skeleton",
  props: {
    width: "100%",
    height: "20px",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
