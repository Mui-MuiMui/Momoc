import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftTextProps {
  text: string;
  tag?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
}

export const CraftText: UserComponent<CraftTextProps> = ({
  text = "Text",
  tag = "p",
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
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
