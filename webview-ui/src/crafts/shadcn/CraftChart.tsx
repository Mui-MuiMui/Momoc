import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftChartProps {
  chartType?: "bar" | "line" | "pie";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftChart: UserComponent<CraftChartProps> = ({
  chartType = "bar",
  width = "auto",
  height = "300px",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const barData = [40, 65, 45, 80, 55, 70];
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const maxVal = Math.max(...barData);

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("rounded-lg border p-4", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="text-sm font-medium mb-2">Chart ({chartType})</div>
      {chartType === "bar" && (
        <div className="flex items-end justify-around gap-2 h-[calc(100%-2rem)]">
          {barData.map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-full bg-primary rounded-t-sm"
                style={{ height: `${(val / maxVal) * 100}%`, minHeight: "4px" }}
              />
              <span className="text-xs text-muted-foreground">{labels[i]}</span>
            </div>
          ))}
        </div>
      )}
      {chartType === "line" && (
        <div className="flex items-end justify-around h-[calc(100%-2rem)]">
          <svg viewBox="0 0 240 100" className="w-full h-full" preserveAspectRatio="none">
            <polyline
              points={barData.map((v, i) => `${(i / (barData.length - 1)) * 240},${100 - v}`).join(" ")}
              fill="none"
              stroke="hsl(var(--primary, 0 0% 13%))"
              strokeWidth="2"
            />
            {barData.map((v, i) => (
              <circle key={i} cx={(i / (barData.length - 1)) * 240} cy={100 - v} r="3" fill="hsl(var(--primary, 0 0% 13%))" />
            ))}
          </svg>
        </div>
      )}
      {chartType === "pie" && (
        <div className="flex items-center justify-center h-[calc(100%-2rem)]">
          <svg viewBox="0 0 100 100" className="w-32 h-32">
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary, 0 0% 13%))" strokeWidth="20" strokeDasharray="75 176" strokeDashoffset="0" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--secondary, 0 0% 96%))" strokeWidth="20" strokeDasharray="50 201" strokeDashoffset="-75" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted, 0 0% 96%))" strokeWidth="20" strokeDasharray="126 125" strokeDashoffset="-125" />
          </svg>
        </div>
      )}
    </div>
  );
};

CraftChart.craft = {
  displayName: "Chart",
  props: {
    chartType: "bar",
    width: "auto",
    height: "300px",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
