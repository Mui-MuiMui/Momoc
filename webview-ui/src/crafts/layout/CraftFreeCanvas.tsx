import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { useEditorStore } from "../../stores/editorStore";

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
  const layoutMode = useEditorStore((s) => s.layoutMode);

  // 自由配置モードでは常に 100% × 100% に強制
  const effectiveWidth = layoutMode === "absolute" ? "100%" : width;
  const effectiveHeight = layoutMode === "absolute" ? "100%" : height;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative", className)}
      style={{ width: effectiveWidth, height: effectiveHeight }}
      {...(layoutMode === "absolute" ? { "data-momoc-absolute-canvas": "" } : {})}
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
