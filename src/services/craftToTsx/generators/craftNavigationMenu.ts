/**
 * CraftNavigationMenu / NavMenuSlot generators
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

// ---------------------------------------------------------------------------
// NavMenuSlot — simple container slot for each menu dropdown
// ---------------------------------------------------------------------------

registerGenerator("NavMenuSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

// ---------------------------------------------------------------------------
// CraftNavigationMenu — navigation bar with dropdown panels
// ---------------------------------------------------------------------------

registerGenerator("CraftNavigationMenu", {
  mapping: {
    tag: "nav",
    propsMap: ["className"],
    isContainer: true,
  },
  defaultProps: {},
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    // Traverse linkedNodes so child imports are collected
    for (const slotId of Object.values(node.linkedNodes || {})) {
      const slotNode = ctx.craftState[slotId];
      if (slotNode) {
        for (const childId of slotNode.nodes || []) {
          ctx.collectChildImports(childId);
        }
      }
    }

    return "stop";
  },
  render: (_nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const items = ((node.props?.items as string) || "Getting Started,Components,Documentation")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const className = (node.props?.className as string) || "";
    const styleAttr = ctx.buildStyleAttr(node.props);
    const navCls = ["relative flex items-center", className].filter(Boolean).join(" ");

    const buttonBgClass = (node.props?.buttonBgClass as string) || "";
    const hoverBgClass = (node.props?.hoverBgClass as string) || "";
    const hoverTextClass = (node.props?.hoverTextClass as string) || "";
    const buttonBorderClass = (node.props?.buttonBorderClass as string) || "";
    const buttonBorderWidth = (node.props?.buttonBorderWidth as string) || "";
    const buttonShadowClass = (node.props?.buttonShadowClass as string) || "";
    const btnBwClass = buttonBorderWidth === "0" ? "border-0"
      : buttonBorderWidth === "2" ? "border-2"
      : buttonBorderWidth === "4" ? "border-4"
      : buttonBorderWidth === "8" ? "border-8"
      : buttonBorderWidth === "1" ? "border"
      : "";

    const btnCls = [
      "inline-flex h-9 w-max items-center justify-center gap-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none",
      buttonBgClass || "bg-background",
      btnBwClass,
      buttonBorderClass,
      buttonShadowClass,
      hoverBgClass ? `hover:${hoverBgClass}` : "hover:bg-accent",
      hoverTextClass ? `hover:${hoverTextClass}` : "hover:text-accent-foreground",
    ].filter(Boolean).join(" ");

    const lines: string[] = [];
    lines.push(`${pad}<nav className="${ctx.escapeAttr(navCls)}"${styleAttr}>`);
    lines.push(`${pad}  <ul className="flex list-none items-center gap-1">`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const slotId = node.linkedNodes?.[`menu_${i}`];
      const slotNode = slotId ? ctx.craftState[slotId] : null;
      const slotChildren = slotNode
        ? (slotNode.nodes || []).map((childId) => ctx.renderNode(childId, indent + 5)).filter(Boolean)
        : [];

      lines.push(`${pad}    <li className="relative group">`);
      lines.push(`${pad}      <button className="${ctx.escapeAttr(btnCls)}">`);
      lines.push(`${pad}        ${ctx.escapeJsx(item)}`);
      lines.push(`${pad}        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 h-3 w-3 opacity-50"><path d="m6 9 6 6 6-6" /></svg>`);
      lines.push(`${pad}      </button>`);
      if (slotChildren.length > 0) {
        lines.push(`${pad}      <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2">`);
        for (const child of slotChildren) lines.push(child);
        lines.push(`${pad}      </div>`);
      } else {
        lines.push(`${pad}      <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2 min-w-[160px] min-h-[60px]" />`);
      }
      lines.push(`${pad}    </li>`);
    }

    lines.push(`${pad}  </ul>`);
    lines.push(`${pad}</nav>`);

    return lines.join("\n");
  },
});
