/**
 * CraftCombobox generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftCombobox", {
  mapping: {
    tag: "Popover",
    importFrom: "@/components/ui/popover",
    importName: "Popover",
    propsMap: ["className"],
    isContainer: false,
  },
  defaultProps: { placeholder: "Select an option...", items: "Apple,Banana,Cherry", linkedMocPath: "", tooltipText: "", tooltipSide: "", tooltipTrigger: "hover", contentWidth: "" },
  collectImports: (_node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/popover", "Popover");
    ctx.addImport("@/components/ui/popover", "PopoverContent");
    ctx.addImport("@/components/ui/popover", "PopoverTrigger");
    ctx.addImport("@/components/ui/button", "Button");
    ctx.addImport("@/components/ui/command", "Command");
    ctx.addImport("@/components/ui/command", "CommandEmpty");
    ctx.addImport("@/components/ui/command", "CommandGroup");
    ctx.addImport("@/components/ui/command", "CommandInput");
    ctx.addImport("@/components/ui/command", "CommandItem");
    ctx.addImport("@/components/ui/command", "CommandList");
    ctx.addImport("lucide-react", "Check");
    ctx.addImport("lucide-react", "ChevronsUpDown");
  },
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const props = node.props;

    const items = ((props?.items as string) || "Apple,Banana,Cherry").split(",").map((s) => s.trim());
    const placeholder = (props?.placeholder as string) || "Select an option...";
    const linkedMocPath = (props?.linkedMocPath as string) || "";
    const contentWidth = (props?.contentWidth as string) || "";
    const contentStyleAttr = contentWidth ? ` style={{ width: "${ctx.escapeAttr(contentWidth)}" }}` : "";
    const width = ctx.normalizeCssSize((props?.width as string) || "auto") || "auto";
    const height = ctx.normalizeCssSize((props?.height as string) || "auto") || "auto";

    const popoverStyleAttr = width !== "auto" ? ` style={{ width: "${ctx.escapeAttr(width)}" }}` : "";
    const buttonStyleAttr = height !== "auto" ? ` style={{ height: "${ctx.escapeAttr(height)}" }}` : "";

    const userClassName = (props?.className as string) || "";
    const allClasses = userClassName ? userClassName.split(" ").filter(Boolean) : [];
    const marginCls = allClasses.filter((c) => /^-?m[trblxy]?-/.test(c));
    const nonMarginCls = allClasses.filter((c) => !/^-?m[trblxy]?-/.test(c));
    const popoverClassAttr = marginCls.length ? ` className="${ctx.escapeAttr(marginCls.join(" "))}"` : "";
    const buttonClassName = ["w-full justify-between", ...nonMarginCls].filter(Boolean).join(" ");

    const lines: string[] = [];
    lines.push(`${pad}<Popover${popoverClassAttr}${popoverStyleAttr}>`);
    lines.push(`${pad}  <PopoverTrigger asChild>`);
    lines.push(`${pad}    <Button variant="outline" role="combobox" className="${buttonClassName}"${buttonStyleAttr}>`);
    lines.push(`${pad}      ${ctx.escapeJsx(placeholder)}`);
    lines.push(`${pad}      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />`);
    lines.push(`${pad}    </Button>`);
    lines.push(`${pad}  </PopoverTrigger>`);
    lines.push(`${pad}  <PopoverContent className="p-0"${contentStyleAttr}>`);
    lines.push(`${pad}    <Command>`);
    lines.push(`${pad}      <CommandInput placeholder="Search..." />`);
    lines.push(`${pad}      <CommandList>`);
    lines.push(`${pad}        <CommandEmpty>No results found.</CommandEmpty>`);
    lines.push(`${pad}        <CommandGroup>`);
    if (linkedMocPath) {
      lines.push(`${pad}          {/* linked: ${ctx.escapeJsx(linkedMocPath)} */}`);
    } else {
      for (const item of items) {
        lines.push(`${pad}          <CommandItem value="${ctx.escapeAttr(item)}">`);
        lines.push(`${pad}            <Check className="mr-2 h-4 w-4 opacity-0" />`);
        lines.push(`${pad}            ${ctx.escapeJsx(item)}`);
        lines.push(`${pad}          </CommandItem>`);
      }
    }
    lines.push(`${pad}        </CommandGroup>`);
    lines.push(`${pad}      </CommandList>`);
    lines.push(`${pad}    </Command>`);
    lines.push(`${pad}  </PopoverContent>`);
    lines.push(`${pad}</Popover>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
