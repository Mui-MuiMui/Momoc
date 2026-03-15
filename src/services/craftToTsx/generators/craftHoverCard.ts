/**
 * CraftHoverCard generator
 */

import { registerGenerator } from "../registry.js";
import { defaultRender } from "../defaultRenderer.js";
import { OVERLAY_IMPORTS } from "../utils.js";
import type { CraftNodeData, RenderContext } from "../types.js";

const MAPPING = {
  tag: "span",
  propsMap: ["className"],
  textProp: "triggerText",
  isContainer: false,
} as const;

registerGenerator("CraftHoverCard", {
  mapping: MAPPING,
  defaultProps: { triggerText: "Hover me", linkedMocPath: "", cardBorderRadius: "rounded-md" },
  collectImports: (node: CraftNodeData, ctx: RenderContext): "stop" | undefined => {
    const linkedMocPath = node.props?.linkedMocPath as string | undefined;
    if (linkedMocPath) {
      const hcImport = OVERLAY_IMPORTS["hover-card"];
      for (const name of hcImport.names) {
        ctx.addImport(hcImport.from, name);
      }
      return "stop";
    }
    return undefined;
  },
  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext): string => {
    const linkedMocPath = node.props?.linkedMocPath as string | undefined;
    if (!linkedMocPath) {
      // Fall back to default rendering
      return defaultRender(nodeId, node, indent, ctx, MAPPING, "CraftHoverCard");
    }

    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const styleAttr = ctx.buildStyleAttr(node.props);
    const triggerText = (node.props?.triggerText as string) || "Hover me";
    const side = (node.props?.hoverCardSide as string) || "bottom";
    const userCls = (node.props?.className as string) || "";
    const triggerCls = ["text-sm font-medium underline underline-offset-4 cursor-pointer", userCls].filter(Boolean).join(" ");
    const triggerSpan = `${pad}  <span className="${ctx.escapeAttr(triggerCls)}"${styleAttr}>${ctx.escapeJsx(triggerText)}</span>`;
    const contentComment = `{/* linked: ${ctx.escapeJsx(linkedMocPath)} */}`;
    const hoverCardTsx = [
      `${pad}<HoverCard>`,
      `${pad}  <HoverCardTrigger asChild>`,
      triggerSpan,
      `${pad}  </HoverCardTrigger>`,
      `${pad}  <HoverCardContent side="${side}">`,
      `${pad}    ${contentComment}`,
      `${pad}  </HoverCardContent>`,
      `${pad}</HoverCard>`,
    ].join("\n");
    return `${mocComments}\n${hoverCardTsx}`;
  },
});
