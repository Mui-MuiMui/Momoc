import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftLabelProps {
  text?: string;
  htmlFor?: string;
  className?: string;
}

export const CraftLabel: UserComponent<CraftLabelProps> = ({
  text = "Label",
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
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
