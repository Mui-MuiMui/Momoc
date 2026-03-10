/**
 * CraftCard generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftCard", {
  mapping: {
    tag: "Card",
    importFrom: "@/components/ui/card",
    importName: "Card",
    propsMap: ["className"],
    isContainer: true,
  },
  defaultProps: { title: "Card Title", description: "", contextMenuMocPath: "", linkedMocPath: "" },
  collectImports: (node: CraftNodeData) => {
    if (node.props?.linkedMocPath as string) {
      return "stop";
    }
    return undefined;
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const tag = "Card";
    const propsStr = ctx.buildPropsString("CraftCard", node.props, { tag, importFrom: "@/components/ui/card", importName: "Card", propsMap: ["className"], isContainer: true });
    const userClassName = (node.props?.className as string) || "";
    const classNameAttr = userClassName ? ` className="${userClassName}"` : "";
    const styleAttr = ctx.buildStyleAttr(node.props);

    const title = (node.props?.title as string) || "";
    const desc = (node.props?.description as string) || "";
    const linkedMocPath = (node.props?.linkedMocPath as string) || "";
    const children = node.nodes || [];
    const innerChildren = children.map((id) => ctx.renderNode(id, indent + 2)).filter(Boolean);
    const cardBody: string[] = [];
    if (title) {
      const escapedTitle = title.includes("<kbd>") ? ctx.kbdTextToJsx(title) : title.includes("\n") ? `{"${ctx.escapeJsString(title)}"}` : ctx.escapeJsx(title);
      const escapedDesc = desc.includes("<kbd>") ? ctx.kbdTextToJsx(desc) : desc.includes("\n") ? `{"${ctx.escapeJsString(desc)}"}` : ctx.escapeJsx(desc);
      cardBody.push(`${pad}    <div className="p-6">`);
      cardBody.push(`${pad}      <h3 className="text-lg font-semibold whitespace-pre-line">${escapedTitle}</h3>`);
      if (desc) {
        cardBody.push(`${pad}      <p className="text-sm text-muted-foreground whitespace-pre-line">${escapedDesc}</p>`);
      }
      cardBody.push(`${pad}    </div>`);
    }
    if (linkedMocPath) {
      cardBody.push(`${pad}    <div className="p-6 pt-0">`);
      cardBody.push(`${pad}      {/* linked: ${ctx.escapeJsx(linkedMocPath)} */}`);
      cardBody.push(`${pad}    </div>`);
    } else if (innerChildren.length > 0) {
      cardBody.push(`${pad}    <div className="p-6 pt-0">`);
      cardBody.push(...innerChildren.map((c) => `  ${c}`));
      cardBody.push(`${pad}    </div>`);
    }
    if (cardBody.length > 0) {
      return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${cardBody.join("\n")}\n${pad}</${tag}>`;
    } else {
      return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    }
  },
});
