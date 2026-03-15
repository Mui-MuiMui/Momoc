/**
 * Container components: CraftContainer, CraftFreeCanvas, CraftGroup, CraftDiv
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

// CraftContainer
registerGenerator("CraftContainer", {
  mapping: { tag: "div", propsMap: ["className"], isContainer: true },
  defaultProps: {
    display: "flex", flexDirection: "column", gap: "4", gridCols: 3, contextMenuMocPath: "", linkedMocPath: "",
  },
  collectImports: (node: CraftNodeData) => {
    // Children are not rendered when linkedMocPath is set
    if (node.props?.linkedMocPath as string) {
      return "stop";
    }
    return undefined;
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const containerClass = ctx.buildContainerClasses(node.props);
    const userClassName = (node.props?.className as string) || "";
    const combinedClassName = ctx.mergeContainerClasses(containerClass, userClassName);
    const classNameAttr = combinedClassName ? ` className="${ctx.escapeAttr(combinedClassName)}"` : "";
    const styleAttr = ctx.buildStyleAttr(node.props);

    const linkedMocPath = (node.props?.linkedMocPath as string) || "";
    if (linkedMocPath) {
      return `${mocComments}\n${pad}<div${classNameAttr}${styleAttr}>\n${pad}  {/* linked: ${ctx.escapeJsx(linkedMocPath)} */}\n${pad}</div>`;
    }

    const children = node.nodes || [];
    if (children.length > 0) {
      const renderedChildren = children
        .map((id) => ctx.renderNode(id, indent + 1))
        .filter(Boolean);
      return `${mocComments}\n${pad}<div${classNameAttr}${styleAttr}>\n${renderedChildren.join("\n")}\n${pad}</div>`;
    }
    return `${mocComments}\n${pad}<div${classNameAttr}${styleAttr} />`;
  },
});

// CraftFreeCanvas
registerGenerator("CraftFreeCanvas", {
  mapping: { tag: "div", propsMap: ["className"], isContainer: true },
});

// CraftGroup
registerGenerator("CraftGroup", {
  mapping: { tag: "div", propsMap: ["className"], isContainer: true },
  defaultProps: { className: "", width: "200px", height: "200px" },
});

// CraftDiv
registerGenerator("CraftDiv", {
  mapping: { tag: "div", propsMap: ["className"], isContainer: true },
  defaultProps: { contextMenuMocPath: "" },
});
