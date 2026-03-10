/**
 * CraftButton generator (overlay/toast/icon mode)
 */

import { registerGenerator } from "../registry.js";
import { OVERLAY_IMPORTS } from "../utils.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftButton", {
  mapping: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["variant", "size", "disabled", "className"],
    textProp: "text",
    isContainer: false,
  },
  defaultProps: {
    buttonType: "text", icon: "", iconSize: "4", variant: "default", size: "default", disabled: false, text: "Button",
    overlayType: "none", linkedMocPath: "", sheetSide: "right", alertDialogPattern: "cancel-continue", overlayWidth: "", overlayHeight: "", overlayClassName: "", tooltipText: "", tooltipSide: "", toastText: "", toastPosition: "bottom-right",
  },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    // Overlay imports
    const overlayType = node.props?.overlayType as string | undefined;
    if (overlayType && overlayType !== "none") {
      const overlayImport = OVERLAY_IMPORTS[overlayType];
      if (overlayImport) {
        for (const name of overlayImport.names) {
          ctx.addImport(overlayImport.from, name);
        }
      }
    }
    // Toast import
    const toastText = node.props?.toastText as string | undefined;
    if (toastText) {
      ctx.addImport("sonner", "toast");
    }
    // Icon import
    const buttonType = node.props?.buttonType as string | undefined;
    const icon = node.props?.icon as string | undefined;
    if (buttonType === "icon" && icon) {
      ctx.addImport("lucide-react", icon);
    }
  },
});
