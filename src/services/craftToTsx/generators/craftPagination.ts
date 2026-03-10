/**
 * CraftPagination generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftPagination", {
  mapping: {
    tag: "nav",
    propsMap: ["className"],
    isContainer: false,
  },
  defaultProps: { totalPages: 5, currentPage: 1 },
  collectImports: (_node: CraftNodeData, ctx: RenderContext): "stop" => {
    ctx.addImport("@/components/ui/pagination", "Pagination");
    ctx.addImport("@/components/ui/pagination", "PaginationContent");
    ctx.addImport("@/components/ui/pagination", "PaginationItem");
    ctx.addImport("@/components/ui/pagination", "PaginationLink");
    ctx.addImport("@/components/ui/pagination", "PaginationPrevious");
    ctx.addImport("@/components/ui/pagination", "PaginationNext");
    return "stop";
  },
  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext): string => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const className = (node.props?.className as string) || "";
    const styleAttr = ctx.buildStyleAttr(node.props);
    const totalPages = (node.props?.totalPages as number) || 5;
    const currentPage = (node.props?.currentPage as number) || 1;

    const hoverBgClass = (node.props?.hoverBgClass as string) || "";
    const hoverTextClass = (node.props?.hoverTextClass as string) || "";
    const activeBgClass = (node.props?.activeBgClass as string) || "";
    const activeTextClass = (node.props?.activeTextClass as string) || "";
    const activeBorderClass = (node.props?.activeBorderClass as string) || "";
    const activeBorderWidth = (node.props?.activeBorderWidth as string) || "";
    const activeShadowClass = (node.props?.activeShadowClass as string) || "";

    const activeBwClass = activeBorderWidth === "0" ? "border-0"
      : activeBorderWidth === "2" ? "border-2"
      : activeBorderWidth === "4" ? "border-4"
      : activeBorderWidth === "8" ? "border-8"
      : activeBorderWidth === "1" ? "border" : "border";

    const activeCls = [
      activeBwClass,
      activeBorderClass || "border-input",
      activeBgClass || "bg-background",
      activeShadowClass || "shadow-sm",
      activeTextClass,
    ].filter(Boolean).join(" ");

    const itemHoverCls = [
      hoverBgClass ? `hover:${hoverBgClass}` : "",
      hoverTextClass ? `hover:${hoverTextClass}` : "",
    ].filter(Boolean).join(" ") || "hover:bg-accent hover:text-accent-foreground";

    const navCls = ["flex w-full", className].filter(Boolean).join(" ");

    const lines: string[] = [];
    lines.push(`${pad}<Pagination className="${ctx.escapeAttr(navCls)}"${styleAttr}>`);
    lines.push(`${pad}  <PaginationContent>`);

    lines.push(`${pad}    <PaginationItem>`);
    lines.push(`${pad}      <PaginationPrevious href="#" className="${ctx.escapeAttr(itemHoverCls)}" />`);
    lines.push(`${pad}    </PaginationItem>`);

    for (let page = 1; page <= totalPages; page++) {
      if (page === currentPage) {
        lines.push(`${pad}    <PaginationItem>`);
        lines.push(`${pad}      <PaginationLink href="#" isActive className="${ctx.escapeAttr(activeCls)}">`);
        lines.push(`${pad}        ${page}`);
        lines.push(`${pad}      </PaginationLink>`);
        lines.push(`${pad}    </PaginationItem>`);
      } else {
        lines.push(`${pad}    <PaginationItem>`);
        lines.push(`${pad}      <PaginationLink href="#" className="${ctx.escapeAttr(itemHoverCls)}">`);
        lines.push(`${pad}        ${page}`);
        lines.push(`${pad}      </PaginationLink>`);
        lines.push(`${pad}    </PaginationItem>`);
      }
    }

    lines.push(`${pad}    <PaginationItem>`);
    lines.push(`${pad}      <PaginationNext href="#" className="${ctx.escapeAttr(itemHoverCls)}" />`);
    lines.push(`${pad}    </PaginationItem>`);

    lines.push(`${pad}  </PaginationContent>`);
    lines.push(`${pad}</Pagination>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
