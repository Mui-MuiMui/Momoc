/**
 * CraftText generator
 */

import { registerGenerator } from "../registry.js";

registerGenerator("CraftText", {
  mapping: { tag: "p", propsMap: ["className"], textProp: "text", isContainer: false },
  defaultProps: { tag: "p", text: "Text" },
});
