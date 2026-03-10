/**
 * CraftTabs / TabContentSlot generators
 */

import { registerGenerator } from "../registry.js";
import { TOOLTIP_IMPORT } from "../utils.js";
import type { CraftNodeData, RenderContext } from "../types.js";

// ---------------------------------------------------------------------------
// TabContentSlot — simple container used as tab content slot
// ---------------------------------------------------------------------------

registerGenerator("TabContentSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

// ---------------------------------------------------------------------------
// CraftTabs — full tab component with TabsList, TabsTrigger, TabsContent
// ---------------------------------------------------------------------------

registerGenerator("CraftTabs", {
  mapping: {
    tag: "Tabs",
    importFrom: "@/components/ui/tabs",
    importName: "Tabs",
    propsMap: ["className"],
    isContainer: false,
  },
  defaultProps: { items: "Tab 1,Tab 2,Tab 3" },

  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    // Tab sub-component imports
    ctx.addImport("@/components/ui/tabs", "TabsList");
    ctx.addImport("@/components/ui/tabs", "TabsTrigger");
    ctx.addImport("@/components/ui/tabs", "TabsContent");

    try {
      const meta = JSON.parse((node.props?.tabMeta as string) || "{}");

      // Tooltip imports if any tab has a tooltip set
      const tabTooltips = meta.tooltips as Record<string, string> | undefined;
      if (tabTooltips && Object.values(tabTooltips).some((t) => !!t)) {
        for (const name of TOOLTIP_IMPORT.names) {
          ctx.addImport(TOOLTIP_IMPORT.from, name);
        }
      }

      // Icon imports from tabMeta
      if (typeof meta.icons === "object" && meta.icons !== null) {
        for (const icon of Object.values(meta.icons)) {
          if (icon && typeof icon === "string") ctx.addImport("lucide-react", icon);
        }
      }
    } catch {
      // ignore parse errors
    }

    // Traverse linkedNodes so child imports are collected
    for (const slotId of Object.values(node.linkedNodes || {})) {
      const slotNode = ctx.craftState[slotId];
      if (slotNode) {
        for (const childId of slotNode.nodes || []) {
          ctx.collectChildImports(childId);
        }
      }
    }

    return "stop";
  },

  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext) => {
    const pad = "  ".repeat(indent);

    // Parse tabMeta
    let keys: number[] = [0, 1, 2];
    let labels: Record<string, string> = { "0": "Tab 1", "1": "Tab 2", "2": "Tab 3" };
    let icons: Record<string, string> = {};
    let tooltips: Record<string, string> = {};
    try {
      const meta = JSON.parse((node.props?.tabMeta as string) || "{}");
      if (Array.isArray(meta.keys)) keys = meta.keys;
      if (typeof meta.labels === "object" && meta.labels !== null) labels = meta.labels;
      if (typeof meta.icons === "object" && meta.icons !== null) icons = meta.icons;
      if (typeof meta.tooltips === "object" && meta.tooltips !== null) tooltips = meta.tooltips;
    } catch {
      // use defaults
    }

    const orientation = (node.props?.orientation as string) || "horizontal";
    const isVertical = orientation === "vertical";
    const tabListBgClass = (node.props?.tabListBgClass as string) || "";
    const tabActiveBgClass = (node.props?.tabActiveBgClass as string) || "";
    const contentBgClass = (node.props?.contentBgClass as string) || "";
    const outerBorderColor = (node.props?.outerBorderColor as string) || "";
    const contentBorderColor = (node.props?.contentBorderColor as string) || "";
    const outerShadow = (node.props?.outerShadow as string) || "";
    const contentShadow = (node.props?.contentShadow as string) || "";
    const userClassName = (node.props?.className as string) || "";
    const tabButtonWidth = (node.props?.tabButtonWidth as string) || "";
    const tabListAlign = (node.props?.tabListAlign as string) || "start";

    const styleAttr = ctx.buildStyleAttr(node.props);

    const width = (node.props?.width as string) || "";
    const widthCls = width && width !== "auto" ? "block" : "w-fit";

    // Build outer wrapper className
    const outerCls = [widthCls, isVertical ? "flex flex-row" : "flex flex-col", outerBorderColor, outerShadow, userClassName]
      .filter(Boolean)
      .join(" ");
    const outerClassAttr = outerCls ? ` className="${ctx.escapeAttr(outerCls)}"` : "";

    // Build TabsList className
    const isFullWidth = tabButtonWidth === "100%";
    const hasFixedButtonWidth = tabButtonWidth && tabButtonWidth !== "auto" && tabButtonWidth !== "100%";
    const tabListBase = isVertical
      ? "flex flex-col items-stretch bg-muted p-1 rounded-md"
      : isFullWidth
        ? "flex w-full items-center bg-muted p-1 rounded-md"
        : "inline-flex items-center bg-muted p-1 rounded-md";
    const tabListCls = [tabListBase, tabListBgClass].filter(Boolean).join(" ");

    // Build TabsContent className
    const contentCls = [contentBgClass, contentBorderColor, contentShadow].filter(Boolean).join(" ");

    // Use first key as default active value
    const defaultValue = keys.length > 0 ? `tab-${keys[0]}` : "tab-0";

    const lines: string[] = [];
    const orientationAttr = isVertical ? ` orientation="vertical"` : "";
    lines.push(`${pad}<Tabs defaultValue="${defaultValue}"${orientationAttr}${outerClassAttr}${styleAttr}>`);
    lines.push(`${pad}  <TabsList className="${ctx.escapeAttr(tabListCls)}">`);

    for (const key of keys) {
      const label = labels[String(key)] ?? `Tab ${key}`;
      const icon = icons[String(key)] ?? "";
      const tooltip = tooltips[String(key)] ?? "";
      const iconJsx = icon ? `<${icon} className="h-4 w-4" /> ` : "";
      const triggerExtraClass = isFullWidth
        ? "w-full"
        : "";
      const triggerClassParts = [
        tabActiveBgClass ? `data-[state=active]:${tabActiveBgClass}` : "",
        triggerExtraClass,
      ].filter(Boolean).join(" ");
      const triggerClassAttr = triggerClassParts ? ` className="${ctx.escapeAttr(triggerClassParts)}"` : "";
      const triggerStyleAttr = hasFixedButtonWidth
        ? ` style={{ width: "${tabButtonWidth}" }}`
        : "";
      if (tooltip) {
        lines.push(`${pad}    <TooltipProvider>`);
        lines.push(`${pad}      <Tooltip>`);
        lines.push(`${pad}        <TooltipTrigger asChild>`);
        lines.push(`${pad}          <TabsTrigger value="tab-${key}"${triggerClassAttr}${triggerStyleAttr}>${iconJsx}${ctx.escapeJsx(label)}</TabsTrigger>`);
        lines.push(`${pad}        </TooltipTrigger>`);
        lines.push(`${pad}        <TooltipContent>`);
        lines.push(`${pad}          <p>${ctx.escapeJsx(tooltip)}</p>`);
        lines.push(`${pad}        </TooltipContent>`);
        lines.push(`${pad}      </Tooltip>`);
        lines.push(`${pad}    </TooltipProvider>`);
      } else {
        lines.push(`${pad}    <TabsTrigger value="tab-${key}"${triggerClassAttr}${triggerStyleAttr}>${iconJsx}${ctx.escapeJsx(label)}</TabsTrigger>`);
      }
    }

    lines.push(`${pad}  </TabsList>`);

    for (const key of keys) {
      const slotId = node.linkedNodes?.[`tab_${key}`];
      const slotNode = slotId ? ctx.craftState[slotId] : null;
      const slotChildren = slotNode
        ? (slotNode.nodes || []).map((childId) => ctx.renderNode(childId, indent + 3)).filter(Boolean)
        : [];

      const contentClassAttr = contentCls ? ` className="${ctx.escapeAttr(contentCls)}"` : "";
      if (slotChildren.length > 0) {
        lines.push(`${pad}  <TabsContent value="tab-${key}"${contentClassAttr}>`);
        for (const child of slotChildren) lines.push(child);
        lines.push(`${pad}  </TabsContent>`);
      } else {
        lines.push(`${pad}  <TabsContent value="tab-${key}"${contentClassAttr} />`);
      }
    }

    lines.push(`${pad}</Tabs>`);
    return lines.join("\n");
  },
});
