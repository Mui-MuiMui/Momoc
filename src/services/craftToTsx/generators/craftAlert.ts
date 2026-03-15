/**
 * CraftAlert generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftAlert", {
  mapping: {
    tag: "Alert",
    importFrom: "@/components/ui/alert",
    importName: "Alert",
    propsMap: ["variant", "className"],
    isContainer: false,
  },
  defaultProps: { title: "Alert", description: "This is an alert message.", variant: "default", icon: "AlertCircle" },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    const icon = (node.props?.icon as string) || "AlertCircle";
    ctx.addImport("lucide-react", icon);
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const tag = "Alert";
    const mapping = { tag, importFrom: "@/components/ui/alert", importName: "Alert", propsMap: ["variant", "className"], isContainer: false };
    const propsStr = ctx.buildPropsString("CraftAlert", node.props, mapping);
    const userClassName = (node.props?.className as string) || "";
    const classNameAttr = userClassName ? ` className="${ctx.escapeAttr(userClassName)}"` : "";
    const styleAttr = ctx.buildStyleAttr(node.props);

    const title = (node.props?.title as string) || "";
    const desc = (node.props?.description as string) || "";
    const icon = (node.props?.icon as string) || "AlertCircle";
    const alertBody: string[] = [];
    alertBody.push(`${pad}  <${icon} className="h-4 w-4" />`);
    if (title) {
      const escapedTitle = title.includes("<kbd>") ? ctx.kbdTextToJsx(title) : title.includes("\n") ? `{"${ctx.escapeJsString(title)}"}` : ctx.escapeJsx(title);
      alertBody.push(`${pad}  <h5 className="mb-1 font-medium leading-none tracking-tight whitespace-pre-line">${escapedTitle}</h5>`);
    }
    if (desc) {
      const escapedDesc = desc.includes("<kbd>") ? ctx.kbdTextToJsx(desc) : desc.includes("\n") ? `{"${ctx.escapeJsString(desc)}"}` : ctx.escapeJsx(desc);
      alertBody.push(`${pad}  <div className="text-sm [&_p]:leading-relaxed whitespace-pre-line">${escapedDesc}</div>`);
    }
    return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${alertBody.join("\n")}\n${pad}</${tag}>`;
  },
});
