import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftCalendarProps {
  width?: string;
  height?: string;
  className?: string;
  todayBgClass?: string;
}

export const CraftCalendar: UserComponent<CraftCalendarProps> = ({
  width = "auto",
  height = "auto",
  className = "",
  todayBgClass = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const monthName = today.toLocaleString("default", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("p-3 rounded-md border", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 hover:bg-accent hover:text-accent-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-sm font-medium">{monthName}</div>
        <button type="button" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 hover:bg-accent hover:text-accent-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {days.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground p-1 font-medium">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className="text-center p-0">
            {d !== null ? (
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm h-8 w-8",
                  d === currentDay
                    ? cn(todayBgClass || "bg-primary", "text-primary-foreground")
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {d}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

CraftCalendar.craft = {
  displayName: "Calendar",
  props: {
    width: "auto",
    height: "auto",
    className: "",
    todayBgClass: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
