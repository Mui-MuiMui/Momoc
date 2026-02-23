import React from "react";
import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftSwitchProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  description?: string;
  invalid?: boolean;
  size?: "default" | "sm";
  variant?: "default" | "card";
  width?: string;
  height?: string;
  className?: string;
  checkedClassName?: string;
  uncheckedClassName?: string;
  cardBorderColor?: string;
  cardBgColor?: string;
  descriptionColor?: string;
  labelColor?: string;
  tooltipText?: string;
  tooltipSide?: "" | "top" | "right" | "bottom" | "left";
}

export const CraftSwitch: UserComponent<CraftSwitchProps> = ({
  label = "Toggle",
  checked = false,
  disabled = false,
  description = "",
  invalid = false,
  size = "default",
  variant = "default",
  width = "auto",
  height = "auto",
  className = "",
  checkedClassName = "",
  uncheckedClassName = "",
  cardBorderColor = "",
  cardBgColor = "",
  descriptionColor = "",
  labelColor = "",
  tooltipText = "",
  tooltipSide = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const cardStyle: React.CSSProperties = {};
  if (cardBorderColor) cardStyle.borderColor = cardBorderColor;
  if (cardBgColor) cardStyle.backgroundColor = cardBgColor;

  const descStyle: React.CSSProperties = { whiteSpace: "pre-line" };
  if (descriptionColor) descStyle.color = descriptionColor;

  const labelStyle: React.CSSProperties = { whiteSpace: "pre-line" };
  if (labelColor) labelStyle.color = labelColor;

  const isSm = size === "sm";
  const btnSize = isSm ? "h-4 w-7" : "h-5 w-9";
  const thumbSize = isSm ? "h-3 w-3" : "h-4 w-4";
  const thumbTranslate = isSm ? "translate-x-3" : "translate-x-4";

  const switchButton = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-invalid={invalid ? "true" : undefined}
      disabled={disabled}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        btnSize,
        checked ? "bg-primary" : "bg-input",
        invalid && "ring-2 ring-destructive",
        className,
        checked ? checkedClassName : uncheckedClassName,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
          thumbSize,
          checked ? thumbTranslate : "translate-x-0",
        )}
      />
    </button>
  );

  const labelContent = (label || description) && (
    <div className="flex flex-col">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" style={labelStyle}>
          {label}
        </label>
      )}
      {description && (
        <p className="text-[0.8rem] text-muted-foreground" style={descStyle}>{description}</p>
      )}
    </div>
  );

  const inner =
    variant === "card" ? (
      <div className="flex w-full items-center justify-between gap-4 rounded-lg border p-4" style={Object.keys(cardStyle).length > 0 ? cardStyle : undefined}>
        {labelContent}
        {switchButton}
      </div>
    ) : (
      <div className="flex items-center space-x-2">
        {switchButton}
        {labelContent}
      </div>
    );

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {inner}
    </div>
  );
};

CraftSwitch.craft = {
  displayName: "Switch",
  props: {
    label: "Toggle",
    checked: false,
    disabled: false,
    description: "",
    invalid: false,
    size: "default",
    variant: "default",
    width: "auto",
    height: "auto",
    className: "",
    checkedClassName: "",
    uncheckedClassName: "",
    cardBorderColor: "",
    cardBgColor: "",
    descriptionColor: "",
    labelColor: "",
    tooltipText: "",
    tooltipSide: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
