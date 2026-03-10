/**
 * CraftResizable / ResizablePanelSlot generators
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

// ---------------------------------------------------------------------------
// ResizablePanelSlot — simple container slot for each panel
// ---------------------------------------------------------------------------

registerGenerator("ResizablePanelSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

// ---------------------------------------------------------------------------
// CraftResizable — full resizable panel group
// ---------------------------------------------------------------------------

registerGenerator("CraftResizable", {
  mapping: {
    tag: "ResizablePanelGroup",
    importFrom: "@/components/ui/resizable",
    importName: "ResizablePanelGroup",
    propsMap: ["className"],
    isContainer: false,
  },
  defaultProps: {
    panelMeta:
      '{"direction":"horizontal","nextKey":2,"panels":[{"key":0,"size":50},{"key":1,"size":50}]}',
    withHandle: true,
  },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/resizable", "ResizablePanelGroup");
    ctx.addImport("@/components/ui/resizable", "ResizablePanel");
    ctx.addImport("@/components/ui/resizable", "ResizableHandle");

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
  render: (nodeId, node, indent, ctx) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);

    // Parse panelMeta
    let direction: "horizontal" | "vertical" = "horizontal";
    let panels: Array<{ key: number; size: number | string }> = [
      { key: 0, size: 50 },
      { key: 1, size: 50 },
    ];
    try {
      const meta = JSON.parse((node.props?.panelMeta as string) || "{}");
      if (meta.direction === "vertical") direction = "vertical";
      if (Array.isArray(meta.panels)) panels = meta.panels;
    } catch {
      // use defaults
    }

    const withHandle = node.props?.withHandle !== false;
    const userClassName = (node.props?.className as string) || "";
    const borderColor = (node.props?.borderColor as string) || "";
    const separatorColor = (node.props?.separatorColor as string) || "";
    const separatorSize = (node.props?.separatorSize as string) || "4";
    const borderRadius = (node.props?.borderRadius as string) || "rounded-lg";
    const shadow = (node.props?.shadow as string) || "";

    // Outer wrapper: owns border/color/size/shadow
    const outerClasses = [
      "flex border overflow-hidden",
      borderRadius,
      borderColor,
      shadow,
      userClassName,
    ]
      .filter(Boolean)
      .join(" ");
    const styleAttr = ctx.buildStyleAttr(node.props);

    const dirAttr =
      direction === "vertical"
        ? ' direction="vertical"'
        : ' direction="horizontal"';
    const handleClassAttr = separatorColor
      ? ` className="${ctx.escapeAttr(separatorColor)}"`
      : "";
    const handleSizeStyleVal =
      direction === "vertical"
        ? `{{ height: '${separatorSize}px' }}`
        : `{{ width: '${separatorSize}px' }}`;
    const handleStyleAttr = ` style=${handleSizeStyleVal}`;

    const lines: string[] = [];
    if (mocComments) {
      lines.push(mocComments);
    }
    lines.push(
      `${pad}<div className="${ctx.escapeAttr(outerClasses)}"${styleAttr}>`,
    );
    lines.push(`${pad}  <ResizablePanelGroup${dirAttr} className="flex-1">`);

    panels.forEach((panel, idx) => {
      const slotId = node.linkedNodes?.[`panel_${panel.key}`];
      const slotNode = slotId ? ctx.craftState[slotId] : null;
      const slotChildren = slotNode
        ? (slotNode.nodes || [])
            .map((childId) => ctx.renderNode(childId, indent + 3))
            .filter(Boolean)
        : [];

      // Determine panel size rendering: absolute unit → style flex, numeric/% → defaultSize
      const isAbsolute =
        typeof panel.size === "string" &&
        /\d+(px|rem|em|vw|vh)$/.test(panel.size.trim());
      const panelSizeAttr = isAbsolute
        ? ` style={{ flex: "0 0 ${panel.size}" }}`
        : ` defaultSize={${typeof panel.size === "string" ? parseFloat(panel.size) : panel.size}}`;

      if (slotChildren.length > 0) {
        lines.push(`${pad}    <ResizablePanel${panelSizeAttr}>`);
        for (const child of slotChildren) lines.push(child);
        lines.push(`${pad}    </ResizablePanel>`);
      } else {
        lines.push(`${pad}    <ResizablePanel${panelSizeAttr} />`);
      }

      if (idx < panels.length - 1) {
        lines.push(
          `${pad}    <ResizableHandle${withHandle ? " withHandle" : ""}${handleClassAttr}${handleStyleAttr} />`,
        );
      }
    });

    lines.push(`${pad}  </ResizablePanelGroup>`);
    lines.push(`${pad}</div>`);
    return lines.join("\n");
  },
});
