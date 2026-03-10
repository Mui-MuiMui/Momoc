/**
 * CraftSelect generator
 */

import { registerGenerator } from "../registry.js";
import { TOOLTIP_IMPORT } from "../utils.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftSelect", {
  mapping: {
    tag: "Select",
    importFrom: "@/components/ui/select",
    importName: "Select",
    propsMap: ["placeholder", "className"],
    isContainer: false,
  },
  defaultProps: { items: "Option 1,Option 2,Option 3", placeholder: "Select an option", tooltipText: "", tooltipSide: "", contentWidth: "" },
  collectImports: (_node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/select", "SelectTrigger");
    ctx.addImport("@/components/ui/select", "SelectContent");
    ctx.addImport("@/components/ui/select", "SelectItem");
    ctx.addImport("@/components/ui/select", "SelectValue");
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const props = node.props;

    const items = ((props?.items as string) || "Option 1,Option 2,Option 3").split(",").map((s) => s.trim());
    const placeholder = (props?.placeholder as string) || "Select an option";
    const tooltipText = props?.tooltipText as string | undefined;
    const tooltipSide = props?.tooltipSide as string | undefined;
    const sideAttr = tooltipSide ? ` side="${tooltipSide}"` : "";
    const contentWidth = (props?.contentWidth as string) || "";
    const contentStyleAttr = contentWidth ? ` style={{ width: "${ctx.escapeAttr(contentWidth)}" }}` : "";

    const w = ctx.normalizeCssSize(props?.width as string | undefined);
    const h = ctx.normalizeCssSize(props?.height as string | undefined);
    const wrapperStyleAttr = w && w !== "auto" ? ` style={{ width: "${ctx.escapeAttr(w)}" }}` : "";
    const triggerStyleAttr = h && h !== "auto" ? ` style={{ height: "${ctx.escapeAttr(h)}" }}` : "";

    const userClass = (props?.className as string) || "";
    const allClasses = userClass ? userClass.split(" ").filter(Boolean) : [];
    const marginCls = allClasses.filter((c) => /^-?m[trblxy]?-/.test(c));
    const nonMarginCls = allClasses.filter((c) => !/^-?m[trblxy]?-/.test(c));
    const wrapperClassAttr = marginCls.length ? ` className="${ctx.escapeAttr(marginCls.join(" "))}"` : "";
    const triggerClassAttr = nonMarginCls.length ? ` className="${ctx.escapeAttr(nonMarginCls.join(" "))}"` : "";

    const lines: string[] = [];
    lines.push(`${pad}<Select${wrapperClassAttr}${wrapperStyleAttr}>`);
    if (tooltipText) {
      lines.push(`${pad}  <TooltipProvider>`);
      lines.push(`${pad}    <Tooltip>`);
      lines.push(`${pad}      <TooltipTrigger asChild>`);
      lines.push(`${pad}        <SelectTrigger${triggerClassAttr}${triggerStyleAttr}>`);
      lines.push(`${pad}          <SelectValue placeholder="${ctx.escapeAttr(placeholder)}" />`);
      lines.push(`${pad}        </SelectTrigger>`);
      lines.push(`${pad}      </TooltipTrigger>`);
      lines.push(`${pad}      <TooltipContent${sideAttr}>`);
      lines.push(`${pad}        <p>${ctx.escapeJsx(tooltipText)}</p>`);
      lines.push(`${pad}      </TooltipContent>`);
      lines.push(`${pad}    </Tooltip>`);
      lines.push(`${pad}  </TooltipProvider>`);
    } else {
      lines.push(`${pad}  <SelectTrigger${triggerClassAttr}${triggerStyleAttr}>`);
      lines.push(`${pad}    <SelectValue placeholder="${ctx.escapeAttr(placeholder)}" />`);
      lines.push(`${pad}  </SelectTrigger>`);
    }
    lines.push(`${pad}  <SelectContent${contentStyleAttr}>`);
    for (const item of items) {
      lines.push(`${pad}    <SelectItem value="${ctx.escapeAttr(item)}">${ctx.escapeJsx(item)}</SelectItem>`);
    }
    lines.push(`${pad}  </SelectContent>`);
    lines.push(`${pad}</Select>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
