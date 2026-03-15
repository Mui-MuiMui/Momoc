/**
 * CraftRadioGroup generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftRadioGroup", {
  mapping: {
    tag: "RadioGroup",
    importFrom: "@/components/ui/radio-group",
    importName: "RadioGroup",
    propsMap: ["value", "className"],
    isContainer: false,
  },
  defaultProps: { items: "Option A,Option B,Option C", value: "Option A", orientation: "vertical", variant: "default", descriptions: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "", tooltipText: "", tooltipSide: "" },
  collectImports: (_node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/radio-group", "RadioGroupItem");
    ctx.addImport("@/components/ui/label", "Label");
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const props = node.props;
    const mapping = { tag: "RadioGroup", importFrom: "@/components/ui/radio-group", importName: "RadioGroup", propsMap: ["value", "className"], isContainer: false };
    const propsStr = ctx.buildPropsString("CraftRadioGroup", props, mapping);

    const items = ((props?.items as string) || "Option A,Option B,Option C").split(",").map((s) => s.trim());
    const orientation = (props?.orientation as string) || "vertical";
    const variant = (props?.variant as string) || "default";
    const descriptionsRaw = (props?.descriptions as string) || "";
    const descList = descriptionsRaw ? descriptionsRaw.split(",").map((s) => s.trim()) : [];
    const cardBorderColor = (props?.cardBorderColor as string) || "";
    const cardBgColor = (props?.cardBgColor as string) || "";
    const descriptionColor = (props?.descriptionColor as string) || "";
    const isCard = variant === "card";

    const cardStyleParts: string[] = [];
    if (cardBorderColor) cardStyleParts.push(`borderColor: "${cardBorderColor}"`);
    if (cardBgColor) cardStyleParts.push(`backgroundColor: "${cardBgColor}"`);
    const cardStyleAttr = cardStyleParts.length > 0 ? ` style={{ ${cardStyleParts.join(", ")} }}` : "";
    const descStyleAttr = descriptionColor ? ` style={{ color: "${descriptionColor}" }}` : "";

    const userClassName = (props?.className as string) || "";
    let classNameAttr: string;
    if (orientation === "horizontal") {
      const combined = userClassName ? `${userClassName} flex flex-row gap-4` : "flex flex-row gap-4";
      classNameAttr = ` className="${ctx.escapeAttr(combined)}"`;
    } else {
      classNameAttr = userClassName ? ` className="${ctx.escapeAttr(userClassName)}"` : "";
    }

    const styleAttr = ctx.buildStyleAttr(props);
    const lines: string[] = [];
    lines.push(`${pad}<RadioGroup${propsStr}${classNameAttr}${styleAttr}>`);
    for (let i = 0; i < items.length; i++) {
      const label = items[i];
      const id = `r-${i + 1}`;
      const desc = descList[i] || "";
      const hasDesc = desc !== "";

      if (isCard) {
        const cardCls = "flex items-center gap-4 rounded-lg border p-4 cursor-pointer [&:has([data-state=checked])]:border-primary";
        lines.push(`${pad}  <label htmlFor="${id}" className="${cardCls}"${cardStyleAttr}>`);
        lines.push(`${pad}    <RadioGroupItem value="${ctx.escapeAttr(label)}" id="${id}" />`);
        if (hasDesc) {
          lines.push(`${pad}    <div className="grid gap-1.5 leading-none">`);
          lines.push(`${pad}      <span className="font-medium">${ctx.escapeJsx(label)}</span>`);
          lines.push(`${pad}      <p className="text-sm text-muted-foreground"${descStyleAttr}>${ctx.escapeJsx(desc)}</p>`);
          lines.push(`${pad}    </div>`);
        } else {
          lines.push(`${pad}    <span className="font-medium">${ctx.escapeJsx(label)}</span>`);
        }
        lines.push(`${pad}  </label>`);
      } else if (hasDesc) {
        lines.push(`${pad}  <div className="flex items-start space-x-2">`);
        lines.push(`${pad}    <RadioGroupItem value="${ctx.escapeAttr(label)}" id="${id}" />`);
        lines.push(`${pad}    <div className="grid gap-1.5 leading-none">`);
        lines.push(`${pad}      <Label htmlFor="${id}">${ctx.escapeJsx(label)}</Label>`);
        lines.push(`${pad}      <p className="text-sm text-muted-foreground"${descStyleAttr}>${ctx.escapeJsx(desc)}</p>`);
        lines.push(`${pad}    </div>`);
        lines.push(`${pad}  </div>`);
      } else {
        lines.push(`${pad}  <div className="flex items-center space-x-2">`);
        lines.push(`${pad}    <RadioGroupItem value="${ctx.escapeAttr(label)}" id="${id}" />`);
        lines.push(`${pad}    <Label htmlFor="${id}">${ctx.escapeJsx(label)}</Label>`);
        lines.push(`${pad}  </div>`);
      }
    }
    lines.push(`${pad}</RadioGroup>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
