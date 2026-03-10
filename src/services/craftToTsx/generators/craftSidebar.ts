/**
 * CraftSidebar / SidebarHeaderSlot / SidebarFooterSlot / SidebarInsetSlot generators
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

// ---------------------------------------------------------------------------
// SidebarNavItemDef interface
// ---------------------------------------------------------------------------

interface SidebarNavItemDef {
  key: number;
  type: "item" | "group-label" | "separator";
  label?: string;
  icon?: string;
  active?: boolean;
  badge?: string;
  badgeBgClass?: string;
  badgeTextClass?: string;
  children?: SidebarNavItemDef[];
  defaultOpen?: boolean;
}

// ---------------------------------------------------------------------------
// renderNavItemsHtml — recursive helper for nav item rendering
// ---------------------------------------------------------------------------

function renderNavItemsHtml(
  items: SidebarNavItemDef[],
  pad: string,
  depth: number,
  navActiveBgClass: string,
  navHoverBgClass: string,
  navTextClass: string,
  navIconClass: string,
  escapeJsx: (text: string) => string,
  escapeAttr: (text: string) => string,
): string[] {
  const lines: string[] = [];
  const innerPad = pad + "  ";

  for (const item of items) {
    if (item.type === "separator") {
      lines.push(`${pad}<hr className="my-1 border-t border-border mx-2" />`);
    } else if (item.type === "group-label") {
      const groupCls = ["px-2 py-1 text-xs font-medium uppercase tracking-wide", navTextClass || "text-muted-foreground"].filter(Boolean).join(" ");
      lines.push(`${pad}<div data-sb-label className="${escapeAttr(groupCls)}">${escapeJsx(item.label || "")}</div>`);
    } else {
      const isActive = !!item.active;
      const indentClass = depth === 1 ? "pl-5" : depth >= 2 ? "pl-8" : "";
      const itemCls = [
        "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors w-full text-left",
        indentClass,
        isActive
          ? [navActiveBgClass, navTextClass || "text-accent-foreground"].filter(Boolean).join(" ")
          : [navHoverBgClass ? `hover:${navHoverBgClass}` : "hover:bg-accent", navTextClass || "text-foreground"].filter(Boolean).join(" "),
      ].filter(Boolean).join(" ");

      const hasChildren = !!(item.children && item.children.length > 0);

      if (hasChildren) {
        const detailsAttr = item.defaultOpen ? " open" : "";
        lines.push(`${pad}<details${detailsAttr}>`);
        lines.push(`${innerPad}<summary className="${escapeAttr(itemCls)}">`);
        if (item.icon && depth < 2) {
          const iconCls = ["mt-0.5 h-4 w-4 shrink-0", navIconClass].filter(Boolean).join(" ");
          lines.push(`${innerPad}  <${escapeJsx(item.icon)} className="${escapeAttr(iconCls)}" />`);
        }
        lines.push(`${innerPad}  <span data-sb-label className="min-w-0 flex-1 break-words">${escapeJsx(item.label || "")}</span>`);
        lines.push(`${innerPad}</summary>`);
        lines.push(`${innerPad}<div data-sb-label className="flex flex-col gap-0.5">`);
        lines.push(...renderNavItemsHtml(item.children!, innerPad + "  ", depth + 1, navActiveBgClass, navHoverBgClass, navTextClass, navIconClass, escapeJsx, escapeAttr));
        lines.push(`${innerPad}</div>`);
        lines.push(`${pad}</details>`);
      } else {
        lines.push(`${pad}<button type="button" className="${escapeAttr(itemCls)}">`);
        if (item.icon && depth < 2) {
          const iconCls = ["mt-0.5 h-4 w-4 shrink-0", navIconClass].filter(Boolean).join(" ");
          lines.push(`${innerPad}<${escapeJsx(item.icon)} className="${escapeAttr(iconCls)}" />`);
        }
        lines.push(`${innerPad}<span data-sb-label className="min-w-0 flex-1 break-words">${escapeJsx(item.label || "")}</span>`);
        if (item.badge) {
          const badgeCls = [
            "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            item.badgeBgClass || "bg-primary",
            item.badgeTextClass || "text-primary-foreground",
          ].filter(Boolean).join(" ");
          lines.push(`${innerPad}<span data-sb-label className="${escapeAttr(badgeCls)}">${escapeJsx(item.badge)}</span>`);
        }
        lines.push(`${pad}</button>`);
      }
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Slot generators
// ---------------------------------------------------------------------------

registerGenerator("SidebarHeaderSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

registerGenerator("SidebarFooterSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

registerGenerator("SidebarInsetSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

// ---------------------------------------------------------------------------
// CraftSidebar
// ---------------------------------------------------------------------------

registerGenerator("CraftSidebar", {
  mapping: {
    tag: "nav",
    propsMap: [],
    isContainer: false,
  },
  defaultProps: {
    sidebarData: JSON.stringify({
      items: [
        { key: 0, type: "group-label", label: "Main" },
        { key: 1, type: "item", label: "Dashboard", icon: "LayoutDashboard", active: true },
        { key: 2, type: "item", label: "Inbox", icon: "Inbox", badge: "5", badgeBgClass: "bg-primary", badgeTextClass: "text-primary-foreground" },
        { key: 3, type: "item", label: "Settings", icon: "Settings" },
        { key: 4, type: "separator" },
        { key: 5, type: "group-label", label: "Other" },
        { key: 6, type: "item", label: "Help", icon: "HelpCircle" },
      ],
      nextKey: 7,
    }),
    side: "left",
    collapsible: "icon",
    sidebarWidth: "240px",
  },
  collectImports: (node: CraftNodeData, ctx: RenderContext) => {
    // Collect icon imports from sidebarData items
    try {
      const meta = JSON.parse((node.props?.sidebarData as string) || "{}");
      if (Array.isArray(meta.items)) {
        function collectSidebarIcons(items: SidebarNavItemDef[]) {
          for (const item of items) {
            if (item.type === "item" && typeof item.icon === "string" && item.icon) {
              ctx.addImport("lucide-react", item.icon);
            }
            if (item.children) collectSidebarIcons(item.children);
          }
        }
        collectSidebarIcons(meta.items as SidebarNavItemDef[]);
      }
    } catch {
      // ignore parse errors
    }

    // Collect toggle icon imports
    const toggleOpenIcon = node.props?.toggleOpenIcon as string;
    const toggleCloseIcon = node.props?.toggleCloseIcon as string;
    if (toggleOpenIcon) ctx.addImport("lucide-react", toggleOpenIcon);
    if (toggleCloseIcon) ctx.addImport("lucide-react", toggleCloseIcon);

    // Traverse linkedNodes so child imports are collected
    for (const linkedId of Object.values(node.linkedNodes || {})) {
      const slotNode = ctx.craftState[linkedId];
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

    let items: SidebarNavItemDef[] = [];
    try {
      const meta = JSON.parse((node.props?.sidebarData as string) || "{}");
      if (Array.isArray(meta.items)) items = meta.items as SidebarNavItemDef[];
    } catch {
      // use defaults
    }

    const side = (node.props?.side as string) || "left";
    const sidebarWidth = (node.props?.sidebarWidth as string) || "240px";
    const className = (node.props?.className as string) || "";
    const styleAttr = ctx.buildStyleAttr(node.props);

    const sidebarBgClass = (node.props?.sidebarBgClass as string) || "bg-muted/50";
    const sidebarBorderColor = (node.props?.sidebarBorderColor as string) || "";
    const sidebarShadow = (node.props?.sidebarShadow as string) || "";
    const headerBgClass = (node.props?.headerBgClass as string) || "";
    const headerBorderColor = (node.props?.headerBorderColor as string) || "";
    const headerShadow = (node.props?.headerShadow as string) || "";
    const navActiveBgClass = (node.props?.navActiveBgClass as string) || "bg-accent";
    const navHoverBgClass = (node.props?.navHoverBgClass as string) || "";
    const navTextClass = (node.props?.navTextClass as string) || "";
    const navIconClass = (node.props?.navIconClass as string) || "";
    const footerBgClass = (node.props?.footerBgClass as string) || "";
    const footerBorderColor = (node.props?.footerBorderColor as string) || "";
    const footerShadow = (node.props?.footerShadow as string) || "";
    const insetBgClass = (node.props?.insetBgClass as string) || "bg-background";
    const insetBorderColor = (node.props?.insetBorderColor as string) || "";
    const insetShadow = (node.props?.insetShadow as string) || "";

    const outerCls = ["flex overflow-hidden", side === "right" ? "flex-row-reverse" : "flex-row", className].filter(Boolean).join(" ");

    const sidebarCls = [
      "flex flex-col overflow-hidden",
      sidebarBgClass,
      sidebarBorderColor,
      sidebarShadow,
      side === "left" ? "border-r" : "border-l",
    ].filter(Boolean).join(" ");

    const headerCls = [
      "border-b px-2 py-3",
      headerBgClass,
      headerBorderColor,
      headerShadow,
    ].filter(Boolean).join(" ");

    const footerCls = [
      "border-t px-2 py-3",
      footerBgClass,
      footerBorderColor,
      footerShadow,
    ].filter(Boolean).join(" ");

    const insetCls = [
      "flex flex-col flex-1 overflow-hidden",
      insetBgClass,
      insetBorderColor,
      insetShadow,
    ].filter(Boolean).join(" ");

    // Resolve slot children and slot className
    function getSlotNode(slotKey: string) {
      const slotId = node.linkedNodes?.[slotKey];
      if (!slotId) return undefined;
      return ctx.craftState[slotId];
    }
    function renderSlot(slotKey: string, slotIndent: number): string {
      const slotNode = getSlotNode(slotKey);
      if (!slotNode) return "";
      return (slotNode.nodes || []).map((childId) => ctx.renderNode(childId, slotIndent)).filter(Boolean).join("\n");
    }
    function slotClassName(slotKey: string): string {
      return (getSlotNode(slotKey)?.props?.className as string) || "";
    }

    const headerChildren = renderSlot("sidebar_header", indent + 4);
    const footerChildren = renderSlot("sidebar_footer", indent + 4);
    const insetChildren = renderSlot("sidebar_inset", indent + 3);

    const collapsible = (node.props?.collapsible as string) || "icon";
    const isCollapsible = collapsible !== "none";
    const isIconMode = collapsible === "icon";
    const headerCollapseMode = (node.props?.headerCollapseMode as string) || "clip";
    const footerCollapseMode = (node.props?.footerCollapseMode as string) || "clip";

    const defaultCollapsed = !!(node.props?.defaultCollapsed);

    // ref callback for preview toggle (DOM manipulation, no React state needed)
    // apply() function handles all state-dependent DOM updates (called on mount for initial state and on click)
    let refAttr = "";
    if (isCollapsible) {
      const initC = defaultCollapsed ? "true" : "false";
      if (isIconMode) {
        const hdrHide = headerCollapseMode === "hide" ? " const hdr = aside.querySelector('[data-sb-header]'); if (hdr) hdr.style.display = c ? 'none' : '';" : "";
        const ftrHide = footerCollapseMode === "hide" ? " const ftr = aside.querySelector('[data-sb-footer]'); if (ftr) ftr.style.display = c ? 'none' : '';" : "";
        refAttr = ` ref={(el: any) => { if (!el || el.__sbInit) return; el.__sbInit = true; const aside = el.querySelector('[data-sb-aside]'); const toggles = el.querySelectorAll('[data-sb-toggle]'); if (!aside || !toggles.length) return; const fw = '${ctx.escapeAttr(sidebarWidth)}'; let c = ${initC}; const apply = () => { const w = c ? '48px' : fw; aside.style.width = w; aside.style.minWidth = w; aside.querySelectorAll('[data-sb-label]').forEach((n: any) => { n.style.display = c ? 'none' : ''; });${hdrHide}${ftrHide} toggles.forEach((b: any) => { b.querySelectorAll('[data-sb-open-icon]').forEach((i: any) => { i.style.display = c ? '' : 'none'; }); b.querySelectorAll('[data-sb-close-icon]').forEach((i: any) => { i.style.display = c ? 'none' : ''; }); }); }; apply(); toggles.forEach((b: any) => b.addEventListener('click', () => { c = !c; apply(); })); }}`;
      } else {
        // offcanvas: hide the aside entirely
        refAttr = ` ref={(el: any) => { if (!el || el.__sbInit) return; el.__sbInit = true; const aside = el.querySelector('[data-sb-aside]'); const toggles = el.querySelectorAll('[data-sb-toggle]'); if (!aside || !toggles.length) return; let c = ${initC}; const apply = () => { aside.style.display = c ? 'none' : ''; toggles.forEach((b: any) => { b.querySelectorAll('[data-sb-open-icon]').forEach((i: any) => { i.style.display = c ? '' : 'none'; }); b.querySelectorAll('[data-sb-close-icon]').forEach((i: any) => { i.style.display = c ? 'none' : ''; }); }); }; apply(); toggles.forEach((b: any) => b.addEventListener('click', () => { c = !c; apply(); })); }}`;
      }
    }

    const lines: string[] = [];
    lines.push(`${pad}<div className="${ctx.escapeAttr(outerCls)}"${styleAttr}${refAttr}>`);

    // Sidebar panel
    lines.push(`${pad}  <aside data-sb-aside className="${ctx.escapeAttr(sidebarCls)}" style={{ width: "${ctx.escapeAttr(sidebarWidth)}", minWidth: "${ctx.escapeAttr(sidebarWidth)}", flexShrink: 0 }}>`);

    // Header slot
    const headerInnerCls = ["min-h-[40px]", slotClassName("sidebar_header")].filter(Boolean).join(" ");
    lines.push(`${pad}    <div data-sb-header className="${ctx.escapeAttr(headerCls)}">`);
    lines.push(`${pad}      <div className="${ctx.escapeAttr(headerInnerCls)}">`);
    if (headerChildren) lines.push(headerChildren);
    lines.push(`${pad}      </div>`);
    lines.push(`${pad}    </div>`);

    // Nav items
    lines.push(`${pad}    <nav className="flex flex-col flex-1 overflow-y-auto py-2 gap-0.5 px-2">`);
    lines.push(...renderNavItemsHtml(items, `${pad}      `, 0, navActiveBgClass, navHoverBgClass, navTextClass, navIconClass, ctx.escapeJsx, ctx.escapeAttr));
    lines.push(`${pad}    </nav>`);

    // Footer slot
    const footerInnerCls = ["min-h-[40px]", slotClassName("sidebar_footer")].filter(Boolean).join(" ");
    lines.push(`${pad}    <div data-sb-footer className="${ctx.escapeAttr(footerCls)}">`);
    lines.push(`${pad}      <div className="${ctx.escapeAttr(footerInnerCls)}">`);
    if (footerChildren) lines.push(footerChildren);
    lines.push(`${pad}      </div>`);
    lines.push(`${pad}    </div>`);

    lines.push(`${pad}  </aside>`);

    // Inset panel
    lines.push(`${pad}  <main className="${ctx.escapeAttr(insetCls)}">`);
    if (isCollapsible) {
      const iconSize = (node.props?.toggleIconSize as string) || "4";
      const openIconName = (node.props?.toggleOpenIcon as string) || "";
      const closeIconName = (node.props?.toggleCloseIcon as string) || "";
      const hasIcons = openIconName || closeIconName;
      let buttonContent: string;
      if (hasIcons) {
        const openArrow = side === "left" ? "\u2192" : "\u2190";
        const closeArrow = side === "left" ? "\u2190" : "\u2192";
        const openPart = openIconName
          ? `<${openIconName} data-sb-open-icon className="h-${iconSize} w-${iconSize}" style={{ display: 'none' }} />`
          : `<span data-sb-open-icon style={{ display: 'none' }}>${openArrow}</span>`;
        const closePart = closeIconName
          ? `<${closeIconName} data-sb-close-icon className="h-${iconSize} w-${iconSize}" />`
          : `<span data-sb-close-icon>${closeArrow}</span>`;
        buttonContent = openPart + closePart;
      } else {
        buttonContent = side === "left" ? "\u2190" : "\u2192";
      }
      lines.push(`${pad}    <div className="flex items-center border-b px-2 py-1">`);
      lines.push(`${pad}      <button data-sb-toggle type="button" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground">${buttonContent}</button>`);
      lines.push(`${pad}    </div>`);
    }
    const insetContentCls = ["flex-1 overflow-auto", slotClassName("sidebar_inset")].filter(Boolean).join(" ");
    lines.push(`${pad}    <div className="${ctx.escapeAttr(insetContentCls)}">`);
    if (insetChildren) lines.push(insetChildren);
    lines.push(`${pad}    </div>`);
    lines.push(`${pad}  </main>`);

    lines.push(`${pad}</div>`);

    const rendered = lines.join("\n");
    return ctx.applyCommonWrappers(`${mocComments}\n${rendered}`, node.props, pad);
  },
});
