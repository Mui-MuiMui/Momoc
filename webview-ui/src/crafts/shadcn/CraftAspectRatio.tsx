import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftAspectRatioProps {
  ratio?: number;
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftAspectRatio: UserComponent<CraftAspectRatioProps> = ({
  ratio = 16 / 9,
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
      className={cn("relative w-full", className)}
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
        paddingBottom: height === "auto" ? `${(1 / ratio) * 100}%` : undefined,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center rounded-md bg-muted text-muted-foreground text-sm">
        {children || `${ratio.toFixed(2)} ratio`}
      </div>
    </div>
  );
};

CraftAspectRatio.craft = {
  displayName: "AspectRatio",
  props: {
    ratio: 1.78,
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
