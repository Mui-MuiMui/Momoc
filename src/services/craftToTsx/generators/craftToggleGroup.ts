/**
 * CraftToggleGroup generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftToggleGroup", {
  mapping: {
    tag: "ToggleGroup",
    importFrom: "@/components/ui/toggle-group",
    importName: "ToggleGroup",
    propsMap: ["type", "variant", "size", "disabled", "orientation", "className"],
    isContainer: false,
  },
  defaultProps: { items: "Bold,Italic,Underline", type: "single", variant: "default", size: "default", disabled: false, gap: "1", orientation: "horizontal", tooltipText: "", tooltipSide: "", descriptions: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "" },
  collectImports: (_node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/toggle-group", "ToggleGroupItem");
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const props = node.props;
    const mapping = { tag: "ToggleGroup", importFrom: "@/components/ui/toggle-group", importName: "ToggleGroup", propsMap: ["type", "variant", "size", "disabled", "orientation", "className"], isContainer: false };
    const propsStr = ctx.buildPropsString("CraftToggleGroup", props, mapping);
    const styleAttr = ctx.buildStyleAttr(props);

    const items = ((props?.items as string) || "Bold,Italic,Underline")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const descriptionsRaw = (props?.descriptions as string) || "";
    const descList = descriptionsRaw ? descriptionsRaw.split(",").map((s) => s.trim()) : [];
    const cardBorderColor = (props?.cardBorderColor as string) || "";
    const cardBgColor = (props?.cardBgColor as string) || "";
    const descriptionColor = (props?.descriptionColor as string) || "";

    const gap = (props?.gap as string) || "1";
    const userClassName = (props?.className as string) || "";
    const gapClass = gap ? `gap-${gap}` : "";
    const combinedCls = [gapClass, userClassName].filter(Boolean).join(" ");
    const tgClassAttr = combinedCls ? ` className="${ctx.escapeAttr(combinedCls)}"` : "";

    const itemStyleParts: string[] = [];
    if (cardBorderColor) itemStyleParts.push(`borderColor: "${cardBorderColor}"`);
    if (cardBgColor) itemStyleParts.push(`backgroundColor: "${cardBgColor}"`);
    const itemStyleAttr = itemStyleParts.length > 0 ? ` style={{ ${itemStyleParts.join(", ")} }}` : "";
    const descStyleAttr = descriptionColor ? ` style={{ color: "${descriptionColor}" }}` : "";

    const lines: string[] = [];
    lines.push(`${pad}<ToggleGroup${propsStr}${tgClassAttr}${styleAttr}>`);

    for (let i = 0; i < items.length; i++) {
      const label = items[i];
      const desc = descList[i] || "";

      if (desc) {
        lines.push(`${pad}  <ToggleGroupItem value="${ctx.escapeAttr(label)}"${itemStyleAttr}>`);
        lines.push(`${pad}    <div className="flex flex-col items-center gap-0.5">`);
        lines.push(`${pad}      <span>${ctx.escapeJsx(label)}</span>`);
        lines.push(`${pad}      <span className="text-xs text-muted-foreground"${descStyleAttr}>${ctx.escapeJsx(desc)}</span>`);
        lines.push(`${pad}    </div>`);
        lines.push(`${pad}  </ToggleGroupItem>`);
      } else if (itemStyleAttr) {
        lines.push(`${pad}  <ToggleGroupItem value="${ctx.escapeAttr(label)}"${itemStyleAttr}>${ctx.escapeJsx(label)}</ToggleGroupItem>`);
      } else {
        lines.push(`${pad}  <ToggleGroupItem value="${ctx.escapeAttr(label)}">${ctx.escapeJsx(label)}</ToggleGroupItem>`);
      }
    }

    lines.push(`${pad}</ToggleGroup>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
