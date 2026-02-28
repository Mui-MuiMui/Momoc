import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftContainerProps {
  display?: "flex" | "grid";
  flexDirection?: "row" | "column";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
  alignItems?: "start" | "center" | "end" | "stretch" | "baseline";
  gap?: string;
  gridCols?: number;
  linkedMocPath?: string;
  contextMenuMocPath?: string;
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

const gapMap: Record<string, string> = {
  "0": "gap-0",
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-5",
  "6": "gap-6",
  "8": "gap-8",
  "10": "gap-10",
  "12": "gap-12",
  "16": "gap-16",
  "20": "gap-20",
  "24": "gap-24",
};

const gridColsMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12",
};

export const CraftContainer: UserComponent<CraftContainerProps> = ({
  display = "flex",
  flexDirection = "column",
  justifyContent = "start",
  alignItems = "stretch",
  gap = "4",
  gridCols = 3,
  linkedMocPath = "",
  contextMenuMocPath = "",
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
          gapMap[gap],
        )
      : cn("grid", gridColsMap[gridCols], gapMap[gap]);

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "relative min-h-[60px] p-4",
        layoutClasses,
        (linkedMocPath || contextMenuMocPath) && "ring-1 ring-dashed ring-muted-foreground/30",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {linkedMocPath && (
        <div className="absolute top-1 right-1 opacity-40 pointer-events-none flex items-center gap-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span className="text-[10px] italic">リンク済み</span>
        </div>
      )}
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
    linkedMocPath: "",
    contextMenuMocPath: "",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: (_nodes: unknown, selfNode: any) => !selfNode?.data?.props?.linkedMocPath,
    canMoveOut: () => true,
  },
};
