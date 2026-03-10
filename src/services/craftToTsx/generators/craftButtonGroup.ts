/**
 * CraftButtonGroup generator (overlay/toast support per button)
 */

import { registerGenerator } from "../registry.js";
import { OVERLAY_IMPORTS } from "../utils.js";
import type { CraftNodeData, RenderContext } from "../types.js";

registerGenerator("CraftButtonGroup", {
  mapping: {
    tag: "ButtonGroup",
    importFrom: "@/components/ui/button-group",
    importName: "ButtonGroup",
    propsMap: ["orientation", "variant", "size", "className"],
    isContainer: false,
  },
  defaultProps: {
    orientation: "horizontal", variant: "outline", size: "default",
    tooltipText: "", tooltipSide: "", tooltipTrigger: "hover",
    hoverCardMocPath: "", hoverCardSide: "bottom", hoverCardTrigger: "hover",
    contextMenuMocPath: "",
  },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    ctx.addImport("@/components/ui/button", "Button");
    try {
      const btns = JSON.parse((node.props?.buttonData as string) || "[]") as Array<Record<string, unknown>>;
      for (const btn of btns) {
        const ot = btn.overlayType as string | undefined;
        if (ot && ot !== "none") {
          const oi = OVERLAY_IMPORTS[ot];
          if (oi) for (const n of oi.names) ctx.addImport(oi.from, n);
        }
        if (btn.toastText) ctx.addImport("sonner", "toast");
      }
    } catch { /* ignore */ }
  },
  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext): string => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);
    const mapping = {
      tag: "ButtonGroup",
      importFrom: "@/components/ui/button-group",
      importName: "ButtonGroup",
      propsMap: ["orientation", "variant", "size", "className"],
      isContainer: false,
    };
    const propsStr = ctx.buildPropsString("CraftButtonGroup", node.props, mapping);
    const styleAttr = ctx.buildStyleAttr(node.props);

    interface ButtonDef {
      text: string;
      variant?: string;
      size?: string;
      disabled?: boolean;
      overlayType?: string;
      linkedMocPath?: string;
      sheetSide?: string;
      overlayWidth?: string;
      overlayHeight?: string;
      overlayClassName?: string;
      toastText?: string;
      toastPosition?: string;
    }

    let btns: ButtonDef[] = [];
    try {
      btns = JSON.parse((node.props?.buttonData as string) || "[]") as ButtonDef[];
    } catch { /* ignore */ }

    const lines: string[] = [];
    lines.push(`${pad}<ButtonGroup${propsStr}${styleAttr}>`);

    const groupVariant = (node.props?.variant as string) || "outline";
    const groupSize = (node.props?.size as string) || "default";

    for (const btn of btns) {
      const variantAttr = groupVariant !== "default" ? ` variant="${ctx.escapeAttr(groupVariant)}"` : "";
      const sizeAttr = groupSize !== "default" ? ` size="${ctx.escapeAttr(groupSize)}"` : "";
      const disabledAttr = btn.disabled ? " disabled" : "";
      const pos = btn.toastPosition || "bottom-right";
      const toastOnClick = btn.toastText && (!btn.overlayType || btn.overlayType === "none")
        ? ` onClick={() => toast("${ctx.escapeAttr(btn.toastText)}", { position: "${pos}" })}`
        : "";
      const btnRendered = `${pad}  <Button${variantAttr}${sizeAttr}${disabledAttr}${toastOnClick}>${ctx.escapeJsx(btn.text)}</Button>`;

      if (btn.overlayType && btn.overlayType !== "none") {
        const wrapped = ctx.wrapWithOverlay(btnRendered, btn as Record<string, unknown>, `${pad}  `);
        lines.push(wrapped);
      } else {
        lines.push(btnRendered);
      }
    }

    lines.push(`${pad}</ButtonGroup>`);
    return `${mocComments}\n${lines.join("\n")}`;
  },
});
