/**
 * CraftContextMenu generator
 */

import { registerGenerator } from "../registry.js";
import { CONTEXT_MENU_IMPORT } from "../utils.js";
import type { CraftNodeData, RenderContext } from "../types.js";

interface MenuItemDef {
  type: "item" | "checkbox" | "separator";
  label?: string;
  shortcut?: string;
  checked?: boolean;
}

interface TopLevelMenuDef {
  label: string;
  items: MenuItemDef[];
}

const DEFAULT_CONTEXTMENU_DATA_STR = JSON.stringify([
  { label: "", items: [{ type: "item", label: "Open", shortcut: "Ctrl+O" }, { type: "item", label: "Edit" }, { type: "separator" }, { type: "checkbox", label: "Show Details", checked: false }, { type: "separator" }, { type: "item", label: "Delete" }] },
]);

registerGenerator("CraftContextMenu", {
  mapping: { tag: "div", propsMap: ["className"], isContainer: false },
  skipCommonWrappers: true,
  defaultProps: { menuData: DEFAULT_CONTEXTMENU_DATA_STR },
  collectImports: (_node: CraftNodeData, ctx: RenderContext) => {
    for (const name of ["ContextMenuContent", "ContextMenuItem", "ContextMenuCheckboxItem", "ContextMenuSeparator", "ContextMenuLabel"]) {
      ctx.addImport(CONTEXT_MENU_IMPORT.from, name);
    }
    return "stop";
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const props = node.props;

    let menus: TopLevelMenuDef[] = [];
    try {
      const parsed = JSON.parse((props?.menuData as string) || "[]");
      if (Array.isArray(parsed)) menus = parsed as TopLevelMenuDef[];
    } catch { menus = []; }

    const className = (props?.className as string) || "";
    const styleAttr = ctx.buildStyleAttr(props);

    // Panel styling
    const panelBgClass = (props?.panelBgClass as string) || "";
    const panelTextClass = (props?.panelTextClass as string) || "";
    const panelBorderClass = (props?.panelBorderClass as string) || "";
    const panelBorderWidth = (props?.panelBorderWidth as string) || "";
    const panelShadowClass = (props?.panelShadowClass as string) || "";
    const hoverBgClass = (props?.hoverBgClass as string) || "";
    const hoverTextClass = (props?.hoverTextClass as string) || "";
    const shortcutTextClass = (props?.shortcutTextClass as string) || "";
    const shortcutCls = shortcutTextClass || "text-muted-foreground";
    const checkTextClass = (props?.checkTextClass as string) || "";

    // Item hover className: use custom classes if set, otherwise rely on shadcn/ui defaults
    const itemHoverCls = [
      hoverBgClass ? `hover:${hoverBgClass}` : "",
      hoverTextClass ? `hover:${hoverTextClass}` : "",
    ].filter(Boolean).join(" ");
    const itemClassAttr = itemHoverCls ? ` className="${ctx.escapeAttr(itemHoverCls)}"` : "";

    const panelBwClass = panelBorderWidth === "0" ? "border-0"
      : panelBorderWidth === "2" ? "border-2"
      : panelBorderWidth === "4" ? "border-4"
      : panelBorderWidth === "8" ? "border-8"
      : panelBorderWidth === "1" ? "border" : "border";

    const panelCls = [
      "rounded-md p-1",
      panelBgClass || "bg-popover",
      panelBwClass,
      panelBorderClass,
      panelShadowClass || "shadow-md",
      panelTextClass,
      className,
    ].filter(Boolean).join(" ");

    // CraftContextMenu renders as <ContextMenuContent> so that:
    //   - standalone preview: fallback renders as a static panel (no parent Ctx)
    //   - contextMenuMocPath usage: the linked .moc IS the <ContextMenuContent>
    //     (wrapWithContextMenu places the linked placeholder directly at ContextMenu level)
    const lines: string[] = [];
    lines.push(`${pad}<ContextMenuContent className="${ctx.escapeAttr(panelCls)}"${styleAttr}>`);

    for (let sectionIdx = 0; sectionIdx < menus.length; sectionIdx++) {
      const menu = menus[sectionIdx];
      if (sectionIdx > 0) {
        lines.push(`${pad}  <ContextMenuSeparator />`);
      }
      if (menu.label) {
        lines.push(`${pad}  <ContextMenuLabel>${ctx.escapeJsx(menu.label)}</ContextMenuLabel>`);
      }
      for (const item of (menu.items || [])) {
        if (item.type === "separator") {
          lines.push(`${pad}  <ContextMenuSeparator />`);
        } else if (item.type === "checkbox") {
          const checkedAttr = item.checked ? " checked" : "";
          const checkTextAttr = checkTextClass ? ` checkTextClass="${ctx.escapeAttr(checkTextClass)}"` : "";
          lines.push(`${pad}  <ContextMenuCheckboxItem${checkedAttr}${itemClassAttr}${checkTextAttr}>`);
          lines.push(`${pad}    ${ctx.escapeJsx(item.label || "")}`);
          if (item.shortcut) lines.push(`${pad}    <span className="ml-auto text-xs tracking-widest ${ctx.escapeAttr(shortcutCls)}">${ctx.escapeJsx(item.shortcut)}</span>`);
          lines.push(`${pad}  </ContextMenuCheckboxItem>`);
        } else {
          lines.push(`${pad}  <ContextMenuItem${itemClassAttr}>`);
          lines.push(`${pad}    ${ctx.escapeJsx(item.label || "")}`);
          if (item.shortcut) lines.push(`${pad}    <span className="ml-auto text-xs tracking-widest ${ctx.escapeAttr(shortcutCls)}">${ctx.escapeJsx(item.shortcut)}</span>`);
          lines.push(`${pad}  </ContextMenuItem>`);
        }
      }
    }

    lines.push(`${pad}</ContextMenuContent>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
