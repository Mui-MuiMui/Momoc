/**
 * CraftDropdownMenu generator
 */

import { registerGenerator } from "../registry.js";
import { OVERLAY_IMPORTS } from "../utils.js";
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
  width?: string;
}

const DEFAULT_DROPDOWN_DATA_STR = JSON.stringify([
  { label: "", items: [{ type: "item", label: "Profile" }, { type: "item", label: "Settings" }, { type: "separator" }, { type: "checkbox", label: "Notifications", checked: false }, { type: "separator" }, { type: "item", label: "Log out" }] },
]);

registerGenerator("CraftDropdownMenu", {
  mapping: { tag: "div", propsMap: [], isContainer: false },
  defaultProps: { triggerText: "Open Menu", menuData: DEFAULT_DROPDOWN_DATA_STR },
  collectImports: (_node: CraftNodeData, ctx: RenderContext) => {
    for (const name of OVERLAY_IMPORTS["dropdown-menu"].names) {
      ctx.addImport(OVERLAY_IMPORTS["dropdown-menu"].from, name);
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

    const triggerText = (props?.triggerText as string) || "Open Menu";
    const className = (props?.className as string) || "";
    const styleAttr = ctx.buildStyleAttr(props);

    const triggerBgClass = (props?.triggerBgClass as string) || "";
    const triggerTextClass = (props?.triggerTextClass as string) || "";
    const triggerBorderClass = (props?.triggerBorderClass as string) || "";
    const triggerBorderWidth = (props?.triggerBorderWidth as string) || "";
    const triggerShadowClass = (props?.triggerShadowClass as string) || "";
    const triggerBwClass = triggerBorderWidth === "0" ? "border-0" : triggerBorderWidth === "2" ? "border-2" : triggerBorderWidth === "4" ? "border-4" : triggerBorderWidth === "8" ? "border-8" : triggerBorderWidth === "1" ? "border" : "";
    const triggerCls = [
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2",
      triggerBgClass || "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
      triggerTextClass, triggerBwClass, triggerBorderClass, triggerShadowClass,
      className,
    ].filter(Boolean).join(" ");

    const dropdownBgClass = (props?.dropdownBgClass as string) || "";
    const dropdownTextClass = (props?.dropdownTextClass as string) || "";
    const dropdownBorderClass = (props?.dropdownBorderClass as string) || "";
    const dropdownBorderWidth = (props?.dropdownBorderWidth as string) || "";
    const dropdownShadowClass = (props?.dropdownShadowClass as string) || "";
    const shortcutTextClass = (props?.shortcutTextClass as string) || "";
    const checkTextClass = (props?.checkTextClass as string) || "";
    const hoverBgClass = (props?.hoverBgClass as string) || "";
    const hoverTextClass = (props?.hoverTextClass as string) || "";
    const dropBwClass = dropdownBorderWidth === "0" ? "border-0" : dropdownBorderWidth === "2" ? "border-2" : dropdownBorderWidth === "4" ? "border-4" : dropdownBorderWidth === "8" ? "border-8" : "border";
    const dropCls = [
      "min-w-[8rem] rounded-md p-1",
      dropdownBgClass || "bg-popover",
      dropBwClass, dropdownBorderClass,
      dropdownShadowClass || "shadow-md",
      dropdownTextClass,
    ].filter(Boolean).join(" ");
    const shortcutCls = shortcutTextClass || "text-muted-foreground";

    const itemHoverCls = [
      hoverBgClass ? `hover:${hoverBgClass}` : "",
      hoverTextClass ? `hover:${hoverTextClass}` : "",
    ].filter(Boolean).join(" ");
    const itemClassAttr = itemHoverCls ? ` className="${ctx.escapeAttr(itemHoverCls)}"` : "";
    const dropdownWidth = (props?.dropdownWidth as string) || "";
    const effectiveDropWidth = (menus[0] as TopLevelMenuDef)?.width || dropdownWidth;
    const dropStyleAttr = effectiveDropWidth ? ` style={{ width: "${ctx.escapeAttr(effectiveDropWidth)}" }}` : "";

    const lines: string[] = [];
    lines.push(`${pad}<DropdownMenu${styleAttr}>`);
    lines.push(`${pad}  <DropdownMenuTrigger className="${ctx.escapeAttr(triggerCls)}">`);
    lines.push(`${pad}    ${ctx.escapeJsx(triggerText)}`);
    lines.push(`${pad}    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>`);
    lines.push(`${pad}  </DropdownMenuTrigger>`);
    lines.push(`${pad}  <DropdownMenuContent className="${ctx.escapeAttr(dropCls)}"${dropStyleAttr}>`);

    for (let sectionIdx = 0; sectionIdx < menus.length; sectionIdx++) {
      const menu = menus[sectionIdx];
      if (sectionIdx > 0) {
        lines.push(`${pad}    <DropdownMenuSeparator />`);
      }
      if (menu.label) {
        lines.push(`${pad}    <DropdownMenuLabel>${ctx.escapeJsx(menu.label)}</DropdownMenuLabel>`);
      }
      for (const item of (menu.items || [])) {
        if (item.type === "separator") {
          lines.push(`${pad}    <DropdownMenuSeparator />`);
        } else if (item.type === "checkbox") {
          const checkedAttr = item.checked ? " checked" : "";
          const checkTextAttr = checkTextClass ? ` checkTextClass="${ctx.escapeAttr(checkTextClass)}"` : "";
          lines.push(`${pad}    <DropdownMenuCheckboxItem${checkedAttr}${itemClassAttr}${checkTextAttr}>`);
          lines.push(`${pad}      <span className="flex-1">${ctx.escapeJsx(item.label || "")}</span>`);
          if (item.shortcut) lines.push(`${pad}      <DropdownMenuShortcut className="${ctx.escapeAttr(shortcutCls)}">${ctx.escapeJsx(item.shortcut)}</DropdownMenuShortcut>`);
          lines.push(`${pad}    </DropdownMenuCheckboxItem>`);
        } else {
          lines.push(`${pad}    <DropdownMenuItem${itemClassAttr}>`);
          lines.push(`${pad}      <span className="flex-1">${ctx.escapeJsx(item.label || "")}</span>`);
          if (item.shortcut) lines.push(`${pad}      <DropdownMenuShortcut className="${ctx.escapeAttr(shortcutCls)}">${ctx.escapeJsx(item.shortcut)}</DropdownMenuShortcut>`);
          lines.push(`${pad}    </DropdownMenuItem>`);
        }
      }
    }

    lines.push(`${pad}  </DropdownMenuContent>`);
    lines.push(`${pad}</DropdownMenu>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
