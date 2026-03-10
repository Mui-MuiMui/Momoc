/**
 * CraftCommand generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

type CommandItemDefLocal =
  | { type: "item"; label: string; icon?: string; shortcut?: string }
  | { type: "separator" }
  | { type: "group"; label: string; items: CommandItemDefLocal[] };

function renderCommandItems(
  defs: CommandItemDefLocal[],
  pad: string,
  itemCls: string,
  iconCls: string,
  shortcutCls: string,
  groupHeadingCls: string,
  separatorCls: string,
  escapeJsx: (s: string) => string,
  escapeAttr: (s: string) => string,
): string[] {
  const lines: string[] = [];
  for (const def of defs) {
    if (def.type === "separator") {
      lines.push(`${pad}<CommandSeparator className="${escapeAttr(separatorCls)}" />`);
    } else if (def.type === "group") {
      lines.push(`${pad}<CommandGroup heading="${escapeAttr(def.label)}">`);
      lines.push(...renderCommandItems(def.items, pad + "  ", itemCls, iconCls, shortcutCls, groupHeadingCls, separatorCls, escapeJsx, escapeAttr));
      lines.push(`${pad}</CommandGroup>`);
    } else {
      lines.push(`${pad}<CommandItem value="${escapeAttr(def.label)}" className="${escapeAttr(itemCls)}">`);
      if (def.icon) {
        lines.push(`${pad}  <${escapeAttr(def.icon)} className="${escapeAttr(iconCls)}" />`);
      } else {
        lines.push(`${pad}  <span className="h-4 w-4 shrink-0" />`);
      }
      lines.push(`${pad}  <span className="flex-1">${escapeJsx(def.label)}</span>`);
      if (def.shortcut) {
        lines.push(`${pad}  <span className="${escapeAttr(shortcutCls)}">${escapeJsx(def.shortcut)}</span>`);
      }
      lines.push(`${pad}</CommandItem>`);
    }
  }
  return lines;
}

registerGenerator("CraftCommand", {
  mapping: { tag: "div", propsMap: ["className"], isContainer: false },
  defaultProps: { placeholder: "Type a command or search...", items: "Calendar,Search,Settings", linkedMocPath: "" },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/command", "Command");
    ctx.addImport("@/components/ui/command", "CommandEmpty");
    ctx.addImport("@/components/ui/command", "CommandGroup");
    ctx.addImport("@/components/ui/command", "CommandInput");
    ctx.addImport("@/components/ui/command", "CommandItem");
    ctx.addImport("@/components/ui/command", "CommandList");
    ctx.addImport("@/components/ui/command", "CommandSeparator");
    ctx.addImport("lucide-react", "Search");
    try {
      const defs = JSON.parse((node.props?.commandData as string) || "[]");
      function collectIcons(arr: unknown[]): void {
        for (const def of arr) {
          const d = def as Record<string, unknown>;
          if (d.type === "item" && typeof d.icon === "string" && d.icon) {
            ctx.addImport("lucide-react", d.icon);
          }
          if (d.type === "group" && Array.isArray(d.items)) {
            collectIcons(d.items as unknown[]);
          }
        }
      }
      if (Array.isArray(defs)) collectIcons(defs);
    } catch { /* ignore */ }
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const props = node.props;
    const userClassName = (props?.className as string) || "";
    const classNameAttr = userClassName ? ` className="${userClassName}"` : "";
    const styleAttr = ctx.buildStyleAttr(props);

    const placeholder = (props?.placeholder as string) || "Type a command or search...";

    const itemBgClass = (props?.itemBgClass as string) || "";
    const itemTextClass = (props?.itemTextClass as string) || "";
    const itemBorderClass = (props?.itemBorderClass as string) || "";
    const itemBorderWidth = (props?.itemBorderWidth as string) || "";
    const itemShadowClass = (props?.itemShadowClass as string) || "";
    const hoverBgClass = (props?.hoverBgClass as string) || "";
    const hoverTextClass = (props?.hoverTextClass as string) || "";
    const iconClass = (props?.iconClass as string) || "";
    const shortcutTextClass = (props?.shortcutTextClass as string) || "";
    const groupHeadingClass = (props?.groupHeadingClass as string) || "";

    const itemBwClass = itemBorderWidth === "0" ? "border-0" : itemBorderWidth === "2" ? "border-2" : itemBorderWidth === "4" ? "border-4" : itemBorderWidth === "8" ? "border-8" : itemBorderWidth === "1" ? "border" : "";

    const itemCls = [
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
      itemBgClass, itemTextClass, itemBwClass, itemBorderClass, itemShadowClass,
      hoverBgClass ? `hover:${hoverBgClass}` : "hover:bg-accent",
      hoverTextClass ? `hover:${hoverTextClass}` : "hover:text-accent-foreground",
    ].filter(Boolean).join(" ");

    const iconCls = ["h-4 w-4 shrink-0", iconClass || "opacity-60"].filter(Boolean).join(" ");
    const shortcutCls = ["ml-auto text-xs tracking-widest", shortcutTextClass || "text-muted-foreground"].filter(Boolean).join(" ");
    const groupHeadingCls = groupHeadingClass || "text-muted-foreground";

    const inputBorderClass = (props?.inputBorderClass as string) || "";
    const inputBorderWidth = (props?.inputBorderWidth as string) || "";
    const inputBwClass = inputBorderWidth === "0" ? "border-0" : inputBorderWidth === "2" ? "border-2" : inputBorderWidth === "4" ? "border-4" : inputBorderWidth === "8" ? "border-8" : inputBorderWidth === "1" ? "border" : "";
    const inputRoundedClass = (props?.inputRoundedClass as string) || "";
    const inputCls = ["flex items-center border-b px-3", inputBorderClass, inputBwClass, inputRoundedClass].filter(Boolean).join(" ");

    const separatorClass = (props?.separatorClass as string) || "";
    const separatorShadowClass = (props?.separatorShadowClass as string) || "";
    const separatorBorderClass = (props?.separatorBorderClass as string) || "";
    const separatorBorderWidth = (props?.separatorBorderWidth as string) || "";
    const sepBwClass = separatorBorderWidth === "0" ? "border-0" : separatorBorderWidth === "2" ? "border-2" : separatorBorderWidth === "4" ? "border-4" : separatorBorderWidth === "8" ? "border-8" : separatorBorderWidth === "1" ? "border" : "";
    const separatorCls = ["-mx-1 h-px", separatorClass || "bg-border", separatorShadowClass, sepBwClass, separatorBorderClass].filter(Boolean).join(" ");

    let defs: CommandItemDefLocal[] = [];
    try {
      const parsed = JSON.parse((props?.commandData as string) || "[]");
      if (Array.isArray(parsed)) defs = parsed as CommandItemDefLocal[];
    } catch { defs = []; }

    const lines: string[] = [];
    lines.push(`${pad}<Command${classNameAttr}${styleAttr}>`);
    lines.push(`${pad}  <CommandInput placeholder="${ctx.escapeAttr(placeholder)}" className="${ctx.escapeAttr(inputCls)}" />`);
    lines.push(`${pad}  <CommandList>`);
    lines.push(`${pad}    <CommandEmpty>No results found.</CommandEmpty>`);
    lines.push(...renderCommandItems(defs, pad + "    ", itemCls, iconCls, shortcutCls, groupHeadingCls, separatorCls, ctx.escapeJsx, ctx.escapeAttr));
    lines.push(`${pad}  </CommandList>`);
    lines.push(`${pad}</Command>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
