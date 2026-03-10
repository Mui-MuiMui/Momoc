/**
 * CraftMenubar generator
 */

import { registerGenerator } from "../registry.js";
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

/** Default Menubar data (matches DEFAULT_MENUBAR_DATA in CraftMenubar.tsx) */
const DEFAULT_MENUBAR_DATA_STR = JSON.stringify([
  { label: "File", items: [{ type: "item", label: "New File", shortcut: "Ctrl+N" }, { type: "item", label: "Open...", shortcut: "Ctrl+O" }, { type: "separator" }, { type: "checkbox", label: "Auto Save", checked: false }, { type: "separator" }, { type: "item", label: "Exit" }] },
  { label: "Edit", items: [{ type: "item", label: "Undo", shortcut: "Ctrl+Z" }, { type: "item", label: "Redo", shortcut: "Ctrl+Y" }, { type: "separator" }, { type: "item", label: "Cut", shortcut: "Ctrl+X" }, { type: "item", label: "Copy", shortcut: "Ctrl+C" }, { type: "item", label: "Paste", shortcut: "Ctrl+V" }] },
  { label: "View", items: [{ type: "checkbox", label: "Word Wrap", checked: false }, { type: "separator" }, { type: "item", label: "Zoom In", shortcut: "Ctrl++" }, { type: "item", label: "Zoom Out", shortcut: "Ctrl+-" }] },
  { label: "Help", items: [{ type: "item", label: "Documentation" }, { type: "item", label: "About" }] },
]);

registerGenerator("CraftMenubar", {
  mapping: { tag: "div", propsMap: ["className"], isContainer: false },
  defaultProps: { menuData: DEFAULT_MENUBAR_DATA_STR },
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
    const barCls = ["flex h-9 items-center space-x-1 rounded-md border bg-background p-1", className]
      .filter(Boolean).join(" ");

    // Button styling
    const buttonBgClass = (props?.buttonBgClass as string) || "";
    const buttonTextClass = (props?.buttonTextClass as string) || "";
    const buttonBorderClass = (props?.buttonBorderClass as string) || "";
    const buttonBorderWidth = (props?.buttonBorderWidth as string) || "";
    const buttonShadowClass = (props?.buttonShadowClass as string) || "";
    const hoverBgClass = (props?.hoverBgClass as string) || "";
    const hoverTextClass = (props?.hoverTextClass as string) || "";
    const btnBwClass = buttonBorderWidth === "0" ? "border-0"
      : buttonBorderWidth === "2" ? "border-2"
      : buttonBorderWidth === "4" ? "border-4"
      : buttonBorderWidth === "8" ? "border-8"
      : buttonBorderWidth === "1" ? "border" : "";
    const btnCls = [
      "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none",
      buttonBgClass, buttonTextClass, btnBwClass, buttonBorderClass, buttonShadowClass,
      hoverBgClass ? `hover:${hoverBgClass}` : "hover:bg-accent",
      hoverTextClass ? `hover:${hoverTextClass}` : "hover:text-accent-foreground",
    ].filter(Boolean).join(" ");

    // Dropdown styling
    const dropdownBgClass = (props?.dropdownBgClass as string) || "";
    const dropdownTextClass = (props?.dropdownTextClass as string) || "";
    const dropdownBorderClass = (props?.dropdownBorderClass as string) || "";
    const dropdownBorderWidth = (props?.dropdownBorderWidth as string) || "";
    const dropdownShadowClass = (props?.dropdownShadowClass as string) || "";
    const shortcutTextClass = (props?.shortcutTextClass as string) || "";
    const dropBwClass = dropdownBorderWidth === "0" ? "border-0"
      : dropdownBorderWidth === "2" ? "border-2"
      : dropdownBorderWidth === "4" ? "border-4"
      : dropdownBorderWidth === "8" ? "border-8"
      : "border";
    const dropCls = [
      "hidden group-hover:block absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-md p-1",
      dropdownBgClass || "bg-popover",
      dropBwClass, dropdownBorderClass,
      dropdownShadowClass || "shadow-md",
      dropdownTextClass,
    ].filter(Boolean).join(" ");
    const shortcutCls = shortcutTextClass || "text-muted-foreground";
    const dropdownWidth = (props?.dropdownWidth as string) || "";
    const dropStyleAttr = dropdownWidth ? ` style={{ width: "${ctx.escapeAttr(dropdownWidth)}" }}` : "";

    const lines: string[] = [];
    if (mocComments) lines.push(mocComments);
    lines.push(`${pad}<div className="${ctx.escapeAttr(barCls)}"${styleAttr}>`);

    for (const menu of menus) {
      lines.push(`${pad}  <div className="relative group">`);
      lines.push(`${pad}    <button type="button" className="${ctx.escapeAttr(btnCls)}">`);
      lines.push(`${pad}      ${ctx.escapeJsx(menu.label || "")}`);
      lines.push(`${pad}    </button>`);
      const menuWidthAttr = (menu as { width?: string }).width
        ? ` style={{ width: "${ctx.escapeAttr((menu as { width?: string }).width!)}" }}`
        : dropStyleAttr;
      lines.push(`${pad}    <div className="${ctx.escapeAttr(dropCls)}"${menuWidthAttr}>`);
      for (const item of (menu.items || [])) {
        if (item.type === "separator") {
          lines.push(`${pad}      <div className="my-1 h-px bg-border" />`);
        } else if (item.type === "checkbox") {
          lines.push(`${pad}      <div className="flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent">`);
          lines.push(`${pad}        <span className="mr-2 w-4 text-center text-xs">${item.checked ? "\u2713" : ""}</span>`);
          lines.push(`${pad}        <span className="flex-1">${ctx.escapeJsx(item.label || "")}</span>`);
          if (item.shortcut) lines.push(`${pad}        <span className="ml-auto text-xs tracking-widest ${ctx.escapeAttr(shortcutCls)}">${ctx.escapeJsx(item.shortcut)}</span>`);
          lines.push(`${pad}      </div>`);
        } else {
          lines.push(`${pad}      <div className="flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent">`);
          lines.push(`${pad}        <span className="flex-1">${ctx.escapeJsx(item.label || "")}</span>`);
          if (item.shortcut) lines.push(`${pad}        <span className="ml-auto text-xs tracking-widest ${ctx.escapeAttr(shortcutCls)}">${ctx.escapeJsx(item.shortcut)}</span>`);
          lines.push(`${pad}      </div>`);
        }
      }
      lines.push(`${pad}    </div>`);
      lines.push(`${pad}  </div>`);
    }

    lines.push(`${pad}</div>`);
    return lines.join("\n");
  },
});
