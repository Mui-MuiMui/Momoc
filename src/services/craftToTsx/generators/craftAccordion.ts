/**
 * CraftAccordion generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftAccordion", {
  mapping: {
    tag: "Accordion",
    importFrom: "@/components/ui/accordion",
    importName: "Accordion",
    propsMap: ["type", "className"],
    isContainer: false,
  },
  defaultProps: { items: "Item 1,Item 2,Item 3", type: "single", linkedMocPaths: "" },
  collectImports: (_node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/accordion", "AccordionItem");
    ctx.addImport("@/components/ui/accordion", "AccordionTrigger");
    ctx.addImport("@/components/ui/accordion", "AccordionContent");
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const tag = "Accordion";
    const mapping = { tag, importFrom: "@/components/ui/accordion", importName: "Accordion", propsMap: ["type", "className"], isContainer: false };
    const propsStr = ctx.buildPropsString("CraftAccordion", node.props, mapping);
    const userClassName = (node.props?.className as string) || "";
    const classNameAttr = userClassName ? ` className="${ctx.escapeAttr(userClassName)}"` : "";
    const styleAttr = ctx.buildStyleAttr(node.props);

    const items = ((node.props?.items as string) || "Item 1,Item 2,Item 3").split(",").map((s) => s.trim());
    const linkedMocPaths = ((node.props?.linkedMocPaths as string) || "").split(",").map((s) => s.trim());
    const type = (node.props?.type as string) || "single";
    const collapsibleAttr = type === "single" ? " collapsible" : "";

    const lines: string[] = [];
    lines.push(`${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}${collapsibleAttr}>`);

    for (let i = 0; i < items.length; i++) {
      const label = items[i];
      const mocPath = linkedMocPaths[i] || "";
      const value = `item-${i + 1}`;
      lines.push(`${pad}  <AccordionItem value="${value}">`);
      lines.push(`${pad}    <AccordionTrigger>${ctx.escapeJsx(label)}</AccordionTrigger>`);
      lines.push(`${pad}    <AccordionContent>`);
      if (mocPath) {
        lines.push(`${pad}      {/* linked: ${ctx.escapeJsx(mocPath)} */}`);
      } else {
        lines.push(`${pad}      <p>${ctx.escapeJsx(label)} content</p>`);
      }
      lines.push(`${pad}    </AccordionContent>`);
      lines.push(`${pad}  </AccordionItem>`);
    }

    lines.push(`${pad}</${tag}>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
