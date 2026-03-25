/**
 * CraftIcon generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftIcon", {
  mapping: { tag: "span", propsMap: [], isContainer: false },
  defaultProps: { icon: "Heart", iconSize: "6", clickThrough: false },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    const icon = (node.props?.icon as string) || "Heart";
    ctx.addImport("lucide-react", icon);
  },
});
