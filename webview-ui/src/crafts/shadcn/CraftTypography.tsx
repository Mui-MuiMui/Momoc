import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

type TypographyVariant = "h1" | "h2" | "h3" | "h4" | "p" | "blockquote" | "ul" | "ol" | "code" | "lead" | "large" | "small" | "muted";
type TypographyTag = "h1" | "h2" | "h3" | "h4" | "p" | "blockquote" | "ul" | "ol" | "code" | "div" | "small";

const VARIANT_CONFIG: Record<TypographyVariant, { tag: TypographyTag; className: string }> = {
  h1:         { tag: "h1",         className: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl" },
  h2:         { tag: "h2",         className: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0" },
  h3:         { tag: "h3",         className: "scroll-m-20 text-2xl font-semibold tracking-tight" },
  h4:         { tag: "h4",         className: "scroll-m-20 text-xl font-semibold tracking-tight" },
  p:          { tag: "p",          className: "leading-7 [&:not(:first-child)]:mt-6" },
  blockquote: { tag: "blockquote", className: "mt-6 border-l-4 pl-6 italic" },
  ul:         { tag: "ul",         className: "list-disc [&>li]:mt-2" },
  ol:         { tag: "ol",         className: "list-decimal [&>li]:mt-2" },
  code:       { tag: "code",       className: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold" },
  lead:       { tag: "p",          className: "text-xl text-muted-foreground" },
  large:      { tag: "div",        className: "text-lg font-semibold" },
  small:      { tag: "small",      className: "text-sm font-medium leading-none" },
  muted:      { tag: "p",          className: "text-sm text-muted-foreground" },
};

interface CraftTypographyProps {
  variant?: TypographyVariant;
  text?: string;
  items?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftTypography: UserComponent<CraftTypographyProps> = ({
  variant = "h1",
  text = "Heading 1",
  items = "List item 1,List item 2,List item 3",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.h1;
  const Tag = config.tag;
  const style = {
    width: width && width !== "auto" ? width : undefined,
    height: height && height !== "auto" ? height : undefined,
  };

  const isList = variant === "ul" || variant === "ol";

  return (
    <Tag
      ref={(ref: HTMLElement | null) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(config.className, className)}
      style={style}
    >
      {isList
        ? items.split(",").map((item, i) => (
            <li key={i}>{item.trim()}</li>
          ))
        : text}
    </Tag>
  );
};

CraftTypography.craft = {
  displayName: "Typography",
  props: {
    variant: "h1",
    text: "Heading 1",
    items: "List item 1,List item 2,List item 3",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
