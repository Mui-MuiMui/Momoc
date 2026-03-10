/**
 * CraftTypography generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

const VARIANT_CONFIG: Record<string, { tag: string; className: string }> = {
  h1:         { tag: "h1",         className: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl" },
  h2:         { tag: "h2",         className: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0" },
  h3:         { tag: "h3",         className: "scroll-m-20 text-2xl font-semibold tracking-tight" },
  h4:         { tag: "h4",         className: "scroll-m-20 text-xl font-semibold tracking-tight" },
  p:          { tag: "p",          className: "leading-7 [&:not(:first-child)]:mt-6" },
  blockquote: { tag: "blockquote", className: "border-l-4 pl-6 italic bg-transparent" },
  ul:         { tag: "ul",         className: "list-disc [&>li]:mt-2" },
  ol:         { tag: "ol",         className: "list-decimal [&>li]:mt-2" },
  code:       { tag: "code",       className: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold" },
  lead:       { tag: "p",          className: "text-xl text-muted-foreground" },
  large:      { tag: "div",        className: "text-lg font-semibold" },
  small:      { tag: "small",      className: "text-sm font-medium leading-none" },
  muted:      { tag: "p",          className: "text-sm text-muted-foreground" },
};

registerGenerator("CraftTypography", {
  mapping: { tag: "p", propsMap: [], isContainer: false },
  defaultProps: { variant: "h1", text: "Heading 1", items: "List item 1,List item 2,List item 3" },
  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext): string => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const props = node.props;

    const variant = (props?.variant as string) || "h1";
    const text = (props?.text as string) || "";
    const items = (props?.items as string) || "";

    const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.h1;
    const { tag, className } = config;
    const isList = variant === "ul" || variant === "ol";

    const styleAttr = ctx.buildStyleAttr(props);
    const userClassName = (props?.className as string) || "";

    // Merge variant className with user className
    const mergedClass = userClassName ? `${className} ${userClassName}` : className;
    const classNameAttr = ` className="${mergedClass}"`;

    const lines: string[] = [];
    if (mocComments) {
      lines.push(mocComments);
    }
    if (isList) {
      const listItems = items.split(",").map((s) => s.trim()).filter(Boolean);
      lines.push(`${pad}<${tag}${classNameAttr}${styleAttr}>`);
      for (const item of listItems) {
        lines.push(`${pad}  <li>${ctx.escapeJsx(item)}</li>`);
      }
      lines.push(`${pad}</${tag}>`);
    } else {
      lines.push(`${pad}<${tag}${classNameAttr}${styleAttr}>${ctx.escapeJsx(text)}</${tag}>`);
    }

    return lines.join("\n");
  },
});
