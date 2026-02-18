import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftFreeCanvasProps {
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftFreeCanvas: UserComponent<CraftFreeCanvasProps> = ({
  width = "100%",
  height = "100vh",
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

CraftFreeCanvas.craft = {
  displayName: "Free Canvas",
  props: {
    width: "100%",
    height: "100vh",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};
