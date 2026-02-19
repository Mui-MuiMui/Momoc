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
  htmlFor = "",
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
      htmlFor={htmlFor || undefined}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      style={{
        whiteSpace: "pre-line",
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
        ...((width !== "auto" || height !== "auto") &&
          !/\b(flex|grid|block|inline-block|inline-flex)\b/.test(className)
          ? { display: "inline-block" }
          : {}),
      }}
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
