import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftRadioGroupProps {
  items?: string;
  value?: string;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftRadioGroup: UserComponent<CraftRadioGroupProps> = ({
  items = "Option A,Option B,Option C",
  value = "Option A",
  tooltipText = "",
  tooltipSide = "",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const itemList = items.split(",").map((s) => s.trim());

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      role="radiogroup"
      className={cn("grid gap-2", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {itemList.map((item) => (
        <div key={item} className="flex items-center space-x-2">
          <button
            type="button"
            role="radio"
            aria-checked={item === value}
            className={cn(
              "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              item === value && "bg-primary",
            )}
          >
            {item === value && (
              <span className="flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-primary-foreground" />
              </span>
            )}
          </button>
          <label className="text-sm font-medium leading-none">{item}</label>
        </div>
      ))}
    </div>
  );
};

CraftRadioGroup.craft = {
  displayName: "RadioGroup",
  props: {
    items: "Option A,Option B,Option C",
    value: "Option A",
    tooltipText: "",
    tooltipSide: "",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
