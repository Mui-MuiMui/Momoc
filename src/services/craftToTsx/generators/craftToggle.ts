/**
 * CraftToggle generator
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftToggle", {
  mapping: {
    tag: "Toggle",
    importFrom: "@/components/ui/toggle",
    importName: "Toggle",
    propsMap: ["variant", "pressed", "size", "disabled", "className"],
    textProp: "text",
    isContainer: false,
  },
  defaultProps: { text: "Toggle", variant: "default", pressed: false, size: "default", disabled: false, icon: "", tooltipText: "", tooltipSide: "" },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    const icon = node.props?.icon as string | undefined;
    if (icon) ctx.addImport("lucide-react", icon);
  },
});
