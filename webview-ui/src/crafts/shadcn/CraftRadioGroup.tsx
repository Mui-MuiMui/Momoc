import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftRadioGroupProps {
  items?: string;
  value?: string;
  orientation?: "vertical" | "horizontal";
  variant?: "default" | "card";
  descriptions?: string;
  cardClassName?: string;
  descriptionClassName?: string;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftRadioGroup: UserComponent<CraftRadioGroupProps> = ({
  items = "Option A,Option B,Option C",
  value = "Option A",
  orientation = "vertical",
  variant = "default",
  descriptions = "",
  cardClassName = "",
  descriptionClassName = "",
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
  const descList = descriptions ? descriptions.split(",").map((s) => s.trim()) : [];
  const isHorizontal = orientation === "horizontal";
  const isCard = variant === "card";

  const groupClassName = cn(
    isHorizontal ? "flex flex-row gap-4" : "grid gap-2",
    className,
  );

  const renderRadioButton = (item: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={item === value}
      className={cn(
        "aspect-square h-4 w-4 shrink-0 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        item === value && "bg-primary",
      )}
    >
      {item === value && (
        <span className="flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-primary-foreground" />
        </span>
      )}
    </button>
  );

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      role="radiogroup"
      className={groupClassName}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {itemList.map((item, i) => {
        const desc = descList[i] || "";
        const hasDesc = desc !== "";

        if (isCard) {
          return (
            <label
              key={item}
              className={cn(
                "flex items-center gap-4 rounded-lg border p-4 cursor-pointer",
                cardClassName,
                item === value && "border-primary",
              )}
            >
              {renderRadioButton(item)}
              <div className="grid gap-1.5 leading-none">
                <span className="font-medium">{item}</span>
                {hasDesc && (
                  <p className={cn("text-sm text-muted-foreground", descriptionClassName)}>{desc}</p>
                )}
              </div>
            </label>
          );
        }

        if (hasDesc) {
          return (
            <div key={item} className="flex items-start space-x-2">
              {renderRadioButton(item)}
              <div className="grid gap-1.5 leading-none">
                <label className="text-sm font-medium leading-none">{item}</label>
                <p className={cn("text-sm text-muted-foreground", descriptionClassName)}>{desc}</p>
              </div>
            </div>
          );
        }

        return (
          <div key={item} className="flex items-center space-x-2">
            {renderRadioButton(item)}
            <label className="text-sm font-medium leading-none">{item}</label>
          </div>
        );
      })}
    </div>
  );
};

CraftRadioGroup.craft = {
  displayName: "RadioGroup",
  props: {
    items: "Option A,Option B,Option C",
    value: "Option A",
    orientation: "vertical",
    variant: "default",
    descriptions: "",
    cardClassName: "",
    descriptionClassName: "",
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
