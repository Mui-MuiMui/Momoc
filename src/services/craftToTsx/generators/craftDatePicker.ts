/**
 * CraftDatePicker generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftDatePicker", {
  mapping: {
    tag: "div",
    propsMap: ["className"],
    isContainer: false,
  },
  defaultProps: {
    mode: "date", dateFormat: "yyyy/MM/dd", placeholder: "日付を選択...", editable: false, disabled: false,
    calendarBorderClass: "", calendarShadowClass: "", todayBgClass: "", todayTextClass: "", todayBorderClass: "", todayShadowClass: "",
    selectedBgClass: "", selectedTextClass: "", selectedBorderClass: "", selectedShadowClass: "", buttonBgClass: "", hoverBgClass: "",
  },
  collectImports: (_node: CraftNodeData, ctx: RenderContext): "stop" => {
    ctx.addImport("@/components/ui/date-picker", "DatePicker");
    return "stop";
  },
  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext): string => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);

    const props: string[] = [];

    const mode = (node.props?.mode as string) || "date";
    if (mode !== "date") props.push(`mode="${ctx.escapeAttr(mode)}"`);

    const dateFormat = (node.props?.dateFormat as string) || "yyyy/MM/dd";
    if (dateFormat !== "yyyy/MM/dd") props.push(`dateFormat="${ctx.escapeAttr(dateFormat)}"`);

    const placeholder = (node.props?.placeholder as string) || "";
    if (placeholder) props.push(`placeholder="${ctx.escapeAttr(placeholder)}"`);

    if (node.props?.editable) props.push(`editable`);
    if (node.props?.disabled) props.push(`disabled`);

    // width/height を style ではなく explicit prop として渡す（fallback が style を除外するため）
    const w = ctx.normalizeCssSize(node.props?.width as string | undefined);
    if (w && w !== "auto") props.push(`width="${ctx.escapeAttr(w)}"`);

    const h = ctx.normalizeCssSize(node.props?.height as string | undefined);
    if (h && h !== "auto") props.push(`height="${ctx.escapeAttr(h)}"`);

    const className = (node.props?.className as string) || "";
    if (className) props.push(`className="${ctx.escapeAttr(className)}"`);

    const stylingProps = [
      "calendarBorderClass", "calendarShadowClass",
      "todayBgClass", "todayTextClass", "todayBorderClass", "todayShadowClass",
      "selectedBgClass", "selectedTextClass", "selectedBorderClass", "selectedShadowClass",
      "buttonBgClass", "hoverBgClass",
    ];
    for (const key of stylingProps) {
      const val = (node.props?.[key] as string) || "";
      if (val) props.push(`${key}="${ctx.escapeAttr(val)}"`);
    }

    const propsStr = props.length > 0 ? " " + props.join(" ") : "";
    return `${mocComments}\n${pad}<DatePicker${propsStr} />`;
  },
});
