/**
 * CraftCollapsible + CollapsibleSlot generators
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

// ---------------------------------------------------------------------------
// CollapsibleSlot — simple container slot
// ---------------------------------------------------------------------------

registerGenerator("CollapsibleSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

// ---------------------------------------------------------------------------
// CraftCollapsible — full collapsible with header/content slots
// ---------------------------------------------------------------------------

const TRIGGER_SVGS: Record<string, string> = {
  chevron: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>`,
  "plus-minus": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  arrow: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>`,
};

registerGenerator("CraftCollapsible", {
  mapping: {
    tag: "Collapsible",
    importFrom: "@/components/ui/collapsible",
    importName: "Collapsible",
    propsMap: ["open", "className"],
    isContainer: true,
  },
  defaultProps: { open: false, triggerStyle: "chevron", linkedMocPath: "" },

  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/collapsible", "CollapsibleTrigger");
    ctx.addImport("@/components/ui/collapsible", "CollapsibleContent");

    // Always traverse header slot
    const headerSlotId = node.linkedNodes?.header;
    if (headerSlotId) ctx.collectChildImports(headerSlotId);

    // Content slot only when no linkedMocPath
    const hasLinkedMoc = !!(node.props?.linkedMocPath as string);
    if (!hasLinkedMoc) {
      const contentSlotId = node.linkedNodes?.content;
      if (contentSlotId) ctx.collectChildImports(contentSlotId);
    }

    return "stop";
  },

  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const styleAttr = ctx.buildStyleAttr(node.props);

    const open = !!(node.props?.open);
    const triggerStyle = (node.props?.triggerStyle as string) || "chevron";
    const linkedMocPath = (node.props?.linkedMocPath as string) || "";
    const outerBorderColor = (node.props?.outerBorderColor as string) || "";
    const dividerBorderColor = (node.props?.dividerBorderColor as string) || "";
    const triggerBorderColor = (node.props?.triggerBorderColor as string) || "";
    const outerShadow = (node.props?.outerShadow as string) || "";
    const contentShadow = (node.props?.contentShadow as string) || "";
    const triggerShadow = (node.props?.triggerShadow as string) || "";

    // Resolve header children from linkedNodes
    const headerSlotId = node.linkedNodes?.header;
    const headerSlotNode = headerSlotId ? ctx.craftState[headerSlotId] : null;
    const headerChildren = (headerSlotNode?.nodes || []).map((id) => ctx.renderNode(id, indent + 2)).filter(Boolean);

    // Resolve content children from linkedNodes
    const contentSlotId = node.linkedNodes?.content;
    const contentSlotNode = contentSlotId ? ctx.craftState[contentSlotId] : null;
    const contentChildren = (contentSlotNode?.nodes || []).map((id) => ctx.renderNode(id, indent + 4)).filter(Boolean);

    // Build outer className: always include "rounded-md border" so outerBorderColor is visible
    const userClassName = (node.props?.className as string) || "";
    const outerCls = ["rounded-md border", outerBorderColor, outerShadow, userClassName].filter(Boolean).join(" ");
    const outerClassAttr = ` className="${ctx.escapeAttr(outerCls)}"`;

    // Build trigger className
    const triggerCls = ["rounded-md border p-1 hover:bg-accent", triggerBorderColor, triggerShadow].filter(Boolean).join(" ");

    // Build divider className
    const dividerCls = ["border-t px-4 py-2 text-sm", dividerBorderColor, contentShadow].filter(Boolean).join(" ");

    const lines: string[] = [];
    lines.push(`${pad}<Collapsible defaultOpen={${open}}${outerClassAttr}${styleAttr}>`);
    lines.push(`${pad}  <div className="flex items-center justify-between space-x-4 px-4 py-2">`);
    if (headerChildren.length > 0) {
      lines.push(...headerChildren);
    }
    if (triggerStyle !== "none") {
      const svg = TRIGGER_SVGS[triggerStyle] || TRIGGER_SVGS.chevron;
      lines.push(`${pad}    <CollapsibleTrigger className="${ctx.escapeAttr(triggerCls)}" data-variant="${triggerStyle}">`);
      lines.push(`${pad}      ${svg}`);
      lines.push(`${pad}    </CollapsibleTrigger>`);
    }
    lines.push(`${pad}  </div>`);
    lines.push(`${pad}  <CollapsibleContent>`);
    lines.push(`${pad}    <div className="${ctx.escapeAttr(dividerCls)}">`);
    if (linkedMocPath) {
      lines.push(`${pad}      {/* linked: ${ctx.escapeJsx(linkedMocPath)} */}`);
    } else if (contentChildren.length > 0) {
      lines.push(...contentChildren);
    } else {
      lines.push(`${pad}      <p>Collapsible content.</p>`);
    }
    lines.push(`${pad}    </div>`);
    lines.push(`${pad}  </CollapsibleContent>`);
    lines.push(`${pad}</Collapsible>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
