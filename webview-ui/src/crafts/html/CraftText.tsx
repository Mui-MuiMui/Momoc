import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftTextProps {
  text: string;
  tag?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  width?: string;
  height?: string;
  className?: string;
}

export const CraftText: UserComponent<CraftTextProps> = ({
  text = "Text",
  tag = "p",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const Tag = tag;

  return (
    <Tag
      ref={(ref: HTMLElement | null) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {text}
    </Tag>
  );
};

CraftText.craft = {
  displayName: "Text",
  props: {
    text: "Text",
    tag: "p",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
