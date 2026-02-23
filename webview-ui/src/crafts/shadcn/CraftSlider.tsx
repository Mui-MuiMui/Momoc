import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftSliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  width?: string;
  height?: string;
  className?: string;
  fillClassName?: string;
  trackClassName?: string;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
}

export const CraftSlider: UserComponent<CraftSliderProps> = ({
  value = 50,
  min = 0,
  max = 100,
  step = 1,
  width = "auto",
  height = "auto",
  className = "",
  fillClassName = "",
  trackClassName = "",
  tooltipText = "",
  tooltipSide = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className={cn("relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20", trackClassName)}>
        <div className={cn("absolute h-full bg-primary", fillClassName)} style={{ width: `${percentage}%` }} />
      </div>
      <div
        className="absolute block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
};

CraftSlider.craft = {
  displayName: "Slider",
  props: {
    value: 50,
    min: 0,
    max: 100,
    step: 1,
    width: "auto",
    height: "auto",
    className: "",
    fillClassName: "",
    trackClassName: "",
    tooltipText: "",
    tooltipSide: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
