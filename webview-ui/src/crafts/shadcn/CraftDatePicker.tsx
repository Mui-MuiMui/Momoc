import { useState } from "react";
import { useNode, useEditor, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftDatePickerProps {
  mode?: "date" | "datetime";
  dateFormat?: string;
  placeholder?: string;
  editable?: boolean;
  disabled?: boolean;
  width?: string;
  height?: string;
  className?: string;
  calendarBorderClass?: string;
  calendarShadowClass?: string;
  todayBgClass?: string;
  todayTextClass?: string;
  todayBorderClass?: string;
  todayShadowClass?: string;
  selectedBgClass?: string;
  selectedTextClass?: string;
  selectedBorderClass?: string;
  selectedShadowClass?: string;
  buttonBgClass?: string;
  hoverBgClass?: string;
}

function formatDate(date: Date, fmt: string): string {
  const yyyy = String(date.getFullYear());
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return fmt
    .replace("yyyy", yyyy)
    .replace("MM", MM)
    .replace("dd", dd)
    .replace("HH", HH)
    .replace("mm", mm);
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const CraftDatePicker: UserComponent<CraftDatePickerProps> = ({
  mode = "date",
  dateFormat = "yyyy/MM/dd",
  placeholder = "日付を選択...",
  editable = false,
  disabled = false,
  width = "auto",
  height = "auto",
  className = "",
  calendarBorderClass = "",
  calendarShadowClass = "",
  todayBgClass = "",
  todayTextClass = "",
  todayBorderClass = "",
  todayShadowClass = "",
  selectedBgClass = "",
  selectedTextClass = "",
  selectedBorderClass = "",
  selectedShadowClass = "",
  buttonBgClass = "",
  hoverBgClass = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const today = new Date();

  const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1).getDay();
  const monthName = displayMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) =>
    d === today.getDate() &&
    displayMonth.getMonth() === today.getMonth() &&
    displayMonth.getFullYear() === today.getFullYear();

  const isSelected = (d: number) =>
    selectedDate !== null &&
    d === selectedDate.getDate() &&
    displayMonth.getMonth() === selectedDate.getMonth() &&
    displayMonth.getFullYear() === selectedDate.getFullYear();

  const handleDayClick = (d: number) => {
    const date = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d, hour, minute, 0);
    setSelectedDate(date);
    if (mode === "date") {
      setInputValue(formatDate(date, dateFormat));
      setOpen(false);
    }
  };

  const handleConfirm = () => {
    if (selectedDate) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, minute, 0);
      const fmt = dateFormat.includes("HH") ? dateFormat : dateFormat + " HH:mm";
      setInputValue(formatDate(date, fmt));
    }
    setOpen(false);
  };

  const prevMonth = () =>
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));

  const todayCls = cn(
    "border",
    todayBorderClass || "border-primary",
    todayBgClass || "bg-primary",
    todayTextClass || "text-primary-foreground",
    todayShadowClass,
  );

  const selectedCls = cn(
    "border",
    selectedBorderClass || "border-primary",
    selectedBgClass || "bg-primary",
    selectedTextClass || "text-primary-foreground",
    selectedShadowClass || "shadow-sm",
  );

  const getDayCls = (d: number) => {
    if (isSelected(d)) return cn("inline-flex items-center justify-center rounded-md text-sm h-8 w-8", selectedCls);
    if (isToday(d)) return cn("inline-flex items-center justify-center rounded-md text-sm h-8 w-8", todayCls);
    return cn(
      "inline-flex items-center justify-center rounded-md text-sm h-8 w-8",
      hoverBgClass
        ? hoveredDay === d ? hoverBgClass : ""
        : "hover:bg-accent hover:text-accent-foreground",
    );
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative", className)}
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
      }}
    >
      {/* Input row */}
      <div
        className={cn(
          "flex w-full rounded-md border border-input overflow-hidden",
          height !== "auto" ? "h-full" : "h-9",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <input
          type="text"
          value={inputValue}
          readOnly={!editable || enabled}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => editable && !enabled && setInputValue(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-3 py-1 placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
          style={{ pointerEvents: enabled ? "none" : undefined }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !enabled && !disabled && setOpen((v) => !v)}
          className={cn(
            "flex items-center justify-center px-2.5 border-l border-input hover:bg-accent transition-colors",
            buttonBgClass,
          )}
          style={{ pointerEvents: enabled ? "none" : undefined }}
        >
          {/* Calendar icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
        </button>
      </div>

      {/* Calendar popover */}
      {open && !enabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Calendar panel */}
          <div
            className={cn(
              "absolute left-0 top-full z-50 mt-1 min-w-[280px] rounded-md border bg-popover p-3",
              calendarBorderClass,
              calendarShadowClass || "shadow-md",
            )}
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 hover:bg-accent hover:text-accent-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
              <div className="text-sm font-medium">{monthName}</div>
              <button
                type="button"
                onClick={nextMonth}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 hover:bg-accent hover:text-accent-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground p-1 font-medium">{d}</div>
              ))}
              {cells.map((d, i) => (
                <div key={i} className="text-center p-0">
                  {d !== null ? (
                    <button
                      type="button"
                      className={getDayCls(d)}
                      onClick={() => handleDayClick(d)}
                      onMouseEnter={() => hoverBgClass && setHoveredDay(d)}
                      onMouseLeave={() => hoverBgClass && setHoveredDay(null)}
                    >
                      {d}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Time inputs for datetime mode */}
            {mode === "datetime" && (
              <div className="mt-3 border-t pt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">時刻:</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(Math.max(0, Math.min(23, Number(e.target.value))))}
                  className="w-14 rounded border border-input bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-sm font-medium">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minute}
                  onChange={(e) => setMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="w-14 rounded border border-input bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={cn(
                    "ml-auto rounded px-3 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90",
                    buttonBgClass && cn(buttonBgClass, "text-foreground"),
                  )}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

CraftDatePicker.craft = {
  displayName: "DatePicker",
  props: {
    mode: "date",
    dateFormat: "yyyy/MM/dd",
    placeholder: "日付を選択...",
    editable: false,
    disabled: false,
    width: "auto",
    height: "auto",
    className: "",
    calendarBorderClass: "",
    calendarShadowClass: "",
    todayBgClass: "",
    todayTextClass: "",
    todayBorderClass: "",
    todayShadowClass: "",
    selectedBgClass: "",
    selectedTextClass: "",
    selectedBorderClass: "",
    selectedShadowClass: "",
    buttonBgClass: "",
    hoverBgClass: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
