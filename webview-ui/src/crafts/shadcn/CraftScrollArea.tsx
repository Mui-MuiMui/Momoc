import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

function borderWidthToClass(bw?: string): string {
  if (bw === "0") return "border-0";
  if (bw === "2") return "border-2";
  if (bw === "4") return "border-4";
  if (bw === "8") return "border-8";
  return "border";
}

interface CraftScrollAreaProps {
  width?: string;
  height?: string;
  borderWidth?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CraftScrollArea: UserComponent<CraftScrollAreaProps> = ({
  width = "auto",
  height = "200px",
  borderWidth = "1",
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
      className={cn("relative overflow-auto rounded-md", borderWidthToClass(borderWidth), className)}
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
    borderWidth: "1",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};
