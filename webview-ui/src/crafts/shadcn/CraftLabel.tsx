import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftLabelProps {
  text?: string;
  htmlFor?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftLabel: UserComponent<CraftLabelProps> = ({
  text = "Label",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <label
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined, display: width !== "auto" || height !== "auto" ? "inline-block" : undefined }}
    >
      {text}
    </label>
  );
};

CraftLabel.craft = {
  displayName: "Label",
  props: {
    text: "Label",
    htmlFor: "",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
