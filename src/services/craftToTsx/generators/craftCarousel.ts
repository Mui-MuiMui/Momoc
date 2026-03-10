/**
 * CraftCarousel generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("SlideContentSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

registerGenerator("CraftCarousel", {
  mapping: {
    tag: "Carousel",
    importFrom: "@/components/ui/carousel",
    importName: "Carousel",
    propsMap: ["className"],
    isContainer: false,
  },
  defaultProps: {
    slideMeta: '{"keys":[0,1,2],"nextKey":3,"labels":{"0":"Slide 1","1":"Slide 2","2":"Slide 3"}}',
    loop: false,
    showArrows: true,
  },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/carousel", "CarouselContent");
    ctx.addImport("@/components/ui/carousel", "CarouselItem");
    ctx.addImport("@/components/ui/carousel", "CarouselPrevious");
    ctx.addImport("@/components/ui/carousel", "CarouselNext");
    for (const linkedId of Object.values(node.linkedNodes || {})) {
      const linkedNode = ctx.craftState[linkedId];
      if (linkedNode) {
        for (const childId of linkedNode.nodes || []) {
          ctx.collectChildImports(childId);
        }
      }
    }
    return "stop";
  },
  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext) => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);

    // Parse slideMeta
    let keys: number[] = [0, 1, 2];
    try {
      const meta = JSON.parse((node.props?.slideMeta as string) || "{}");
      if (Array.isArray(meta.keys)) keys = meta.keys;
    } catch {
      // use defaults
    }

    const orientation = (node.props?.orientation as string) || "horizontal";
    const loop = !!(node.props?.loop);
    const showArrows = node.props?.showArrows !== false;
    const userClassName = (node.props?.className as string) || "";
    const styleAttr = ctx.buildStyleAttr(node.props);

    const optsAttr = `opts={{ loop: ${loop} }}`;
    const orientationAttr = orientation === "vertical" ? ` orientation="vertical"` : "";
    const classAttr = userClassName ? ` className="${ctx.escapeAttr(userClassName)}"` : "";

    const itemClassAttr = "";

    const lines: string[] = [];
    lines.push(`${pad}<Carousel ${optsAttr}${orientationAttr}${classAttr}${styleAttr}>`);
    lines.push(`${pad}  <CarouselContent>`);

    for (const key of keys) {
      const slotId = node.linkedNodes?.[`slide_${key}`];
      const slotNode = slotId ? ctx.craftState[slotId] : null;
      const slotClassName = (slotNode?.props?.className as string) || "";
      const slotChildren = slotNode
        ? (slotNode.nodes || []).map((childId) => ctx.renderNode(childId, indent + 5)).filter(Boolean)
        : [];

      if (slotChildren.length > 0) {
        const innerCls = ["h-full w-full", slotClassName].filter(Boolean).join(" ");
        lines.push(`${pad}    <CarouselItem${itemClassAttr}>`);
        lines.push(`${pad}      <div className="${ctx.escapeAttr(innerCls)}">`);
        for (const child of slotChildren) lines.push(child);
        lines.push(`${pad}      </div>`);
        lines.push(`${pad}    </CarouselItem>`);
      } else {
        lines.push(`${pad}    <CarouselItem${itemClassAttr} />`);
      }
    }

    lines.push(`${pad}  </CarouselContent>`);
    if (showArrows) {
      lines.push(`${pad}  <CarouselPrevious />`);
      lines.push(`${pad}  <CarouselNext />`);
    }
    lines.push(`${pad}</Carousel>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
