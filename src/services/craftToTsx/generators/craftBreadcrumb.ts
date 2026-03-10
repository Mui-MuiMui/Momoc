/**
 * CraftBreadcrumb generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftBreadcrumb", {
  mapping: {
    tag: "Breadcrumb",
    importFrom: "@/components/ui/breadcrumb",
    importName: "Breadcrumb",
    propsMap: ["className"],
    isContainer: false,
  },
  defaultProps: { items: "Home,Products,Current", maxVisible: "0" },
  collectImports: (_node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/breadcrumb", "BreadcrumbList");
    ctx.addImport("@/components/ui/breadcrumb", "BreadcrumbItem");
    ctx.addImport("@/components/ui/breadcrumb", "BreadcrumbLink");
    ctx.addImport("@/components/ui/breadcrumb", "BreadcrumbPage");
    ctx.addImport("@/components/ui/breadcrumb", "BreadcrumbSeparator");
    ctx.addImport("@/components/ui/breadcrumb", "BreadcrumbEllipsis");
    ctx.addImport("@/components/ui/dropdown-menu", "DropdownMenu");
    ctx.addImport("@/components/ui/dropdown-menu", "DropdownMenuTrigger");
    ctx.addImport("@/components/ui/dropdown-menu", "DropdownMenuContent");
    ctx.addImport("@/components/ui/dropdown-menu", "DropdownMenuItem");
  },
  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext): string => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const userClassName = (node.props?.className as string) || "";
    const classNameAttr = userClassName ? ` className="${ctx.escapeAttr(userClassName)}"` : "";
    const styleAttr = ctx.buildStyleAttr(node.props);

    const itemList = ((node.props?.items as string) || "Home,Products,Current")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const maxV = parseInt((node.props?.maxVisible as string) || "0", 10);
    const shouldCollapse = maxV > 0 && itemList.length > maxV;

    const visibleTail = shouldCollapse ? itemList.slice(-(maxV - 1)) : itemList.slice(1);
    const collapsed = shouldCollapse ? itemList.slice(1, -(maxV - 1)) : [];

    const lines: string[] = [];
    lines.push(`${pad}<Breadcrumb${classNameAttr}${styleAttr}>`);
    lines.push(`${pad}  <BreadcrumbList>`);

    // First item
    lines.push(`${pad}    <BreadcrumbItem>`);
    if (itemList.length === 1) {
      lines.push(`${pad}      <BreadcrumbPage>${ctx.escapeJsx(itemList[0])}</BreadcrumbPage>`);
    } else {
      lines.push(`${pad}      <BreadcrumbLink href="#">${ctx.escapeJsx(itemList[0])}</BreadcrumbLink>`);
    }
    lines.push(`${pad}    </BreadcrumbItem>`);

    // Ellipsis with dropdown for collapsed items
    if (shouldCollapse) {
      lines.push(`${pad}    <BreadcrumbSeparator />`);
      lines.push(`${pad}    <BreadcrumbItem>`);
      lines.push(`${pad}      <DropdownMenu>`);
      lines.push(`${pad}        <DropdownMenuTrigger className="flex items-center gap-1">`);
      lines.push(`${pad}          <BreadcrumbEllipsis className="h-4 w-4" />`);
      lines.push(`${pad}          <span className="sr-only">Toggle menu</span>`);
      lines.push(`${pad}        </DropdownMenuTrigger>`);
      lines.push(`${pad}        <DropdownMenuContent align="start">`);
      for (const label of collapsed) {
        lines.push(`${pad}          <DropdownMenuItem>${ctx.escapeJsx(label)}</DropdownMenuItem>`);
      }
      lines.push(`${pad}        </DropdownMenuContent>`);
      lines.push(`${pad}      </DropdownMenu>`);
      lines.push(`${pad}    </BreadcrumbItem>`);
    }

    // Tail items
    for (let i = 0; i < visibleTail.length; i++) {
      const label = visibleTail[i];
      const globalIndex = shouldCollapse
        ? itemList.length - visibleTail.length + i
        : i + 1;
      const isLast = globalIndex === itemList.length - 1;
      lines.push(`${pad}    <BreadcrumbSeparator />`);
      lines.push(`${pad}    <BreadcrumbItem>`);
      if (isLast) {
        lines.push(`${pad}      <BreadcrumbPage>${ctx.escapeJsx(label)}</BreadcrumbPage>`);
      } else {
        lines.push(`${pad}      <BreadcrumbLink href="#">${ctx.escapeJsx(label)}</BreadcrumbLink>`);
      }
      lines.push(`${pad}    </BreadcrumbItem>`);
    }

    lines.push(`${pad}  </BreadcrumbList>`);
    lines.push(`${pad}</Breadcrumb>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
