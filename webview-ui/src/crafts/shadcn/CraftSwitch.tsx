import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftSwitchProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  width?: string;
  height?: string;
  className?: string;
  checkedClassName?: string;
  uncheckedClassName?: string;
}

export const CraftSwitch: UserComponent<CraftSwitchProps> = ({
  label = "Toggle",
  checked = false,
  disabled = false,
  width = "auto",
  height = "auto",
  className = "",
  checkedClassName = "",
  uncheckedClassName = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className="flex items-center space-x-2"
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-input",
          className,
          checked ? checkedClassName : uncheckedClassName,
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
    </div>
  );
};

CraftSwitch.craft = {
  displayName: "Switch",
  props: {
    label: "Toggle",
    checked: false,
    disabled: false,
    width: "auto",
    height: "auto",
    className: "",
    checkedClassName: "",
    uncheckedClassName: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
