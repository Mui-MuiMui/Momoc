import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftContainerProps {
  display?: "flex" | "grid";
  flexDirection?: "row" | "column";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
  alignItems?: "start" | "center" | "end" | "stretch" | "baseline";
  gap?: string;
  gridCols?: number;
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

const justifyMap: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const alignMap: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

export const CraftContainer: UserComponent<CraftContainerProps> = ({
  display = "flex",
  flexDirection = "column",
  justifyContent = "start",
  alignItems = "stretch",
  gap = "4",
  gridCols = 3,
  width = "auto",
  height = "auto",
  className = "",
  children,
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const layoutClasses =
    display === "flex"
      ? cn(
          "flex",
          flexDirection === "row" ? "flex-row" : "flex-col",
          justifyMap[justifyContent],
          alignMap[alignItems],
          `gap-${gap}`,
        )
      : cn("grid", `grid-cols-${gridCols}`, `gap-${gap}`);

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("min-h-[60px] p-4", layoutClasses, className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {children}
    </div>
  );
};

CraftContainer.craft = {
  displayName: "Container",
  props: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "start",
    alignItems: "stretch",
    gap: "4",
    gridCols: 3,
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
