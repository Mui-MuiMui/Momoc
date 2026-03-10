/**
 * CraftTooltip generator
 */

import { registerGenerator } from "../registry.js";

registerGenerator("CraftTooltip", {
  mapping: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
  defaultProps: { triggerText: "Hover", text: "Tooltip text" },
});
