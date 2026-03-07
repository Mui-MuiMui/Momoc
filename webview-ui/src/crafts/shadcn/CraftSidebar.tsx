import { useState } from "react";
import { Element, useNode, type UserComponent } from "@craftjs/core";
import * as LucideIcons from "lucide-react";
import { cn } from "../../utils/cn";
import type { ReactNode } from "react";

// --- Slot components ---

export const SidebarHeaderSlot: UserComponent<{ children?: ReactNode; className?: string }> = ({ children, className = "" }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn("min-h-[40px]", className)}
    >
      {children}
    </div>
  );
};

SidebarHeaderSlot.craft = {
  displayName: "SidebarHeaderSlot",
  custom: { noResize: true },
  props: { className: "" },
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

export const SidebarFooterSlot: UserComponent<{ children?: ReactNode; className?: string }> = ({ children, className = "" }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn("min-h-[40px]", className)}
    >
      {children}
    </div>
  );
};

SidebarFooterSlot.craft = {
  displayName: "SidebarFooterSlot",
  custom: { noResize: true },
  props: { className: "" },
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

export const SidebarInsetSlot: UserComponent<{ children?: ReactNode; className?: string }> = ({ children, className = "" }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn("flex-1", className)}
    >
      {children}
    </div>
  );
};

SidebarInsetSlot.craft = {
  displayName: "SidebarInsetSlot",
  custom: { noResize: true },
  props: { className: "" },
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

// --- Data types ---

export interface SidebarNavItem {
  key: number;
  type: "item" | "group-label" | "separator";
  label?: string;
  icon?: string;
  active?: boolean;
  badge?: string;
  badgeBgClass?: string;
  badgeTextClass?: string;
  children?: SidebarNavItem[];
  defaultOpen?: boolean;
}

export interface SidebarMeta {
  items: SidebarNavItem[];
  nextKey: number;
}

const DEFAULT_SIDEBAR_META: SidebarMeta = {
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
};

export const DEFAULT_SIDEBAR_DATA = JSON.stringify(DEFAULT_SIDEBAR_META);

function parseSidebarData(raw: string): SidebarMeta {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) return parsed as SidebarMeta;
    return DEFAULT_SIDEBAR_META;
  } catch {
    return DEFAULT_SIDEBAR_META;
  }
}

// --- Helpers ---

function collectDefaultOpenKeys(items: SidebarNavItem[]): number[] {
  const keys: number[] = [];
  for (const item of items) {
    if (item.type === "item" && item.defaultOpen && item.children?.length) {
      keys.push(item.key);
    }
    if (item.children) {
      keys.push(...collectDefaultOpenKeys(item.children));
    }
  }
  return keys;
}

// --- NavItemList ---

interface NavItemListProps {
  items: SidebarNavItem[];
  depth: number;
  collapsed: boolean;
  isIconMode: boolean;
  openKeys: Set<number>;
  onToggle: (key: number) => void;
  navActiveBgClass: string;
  navHoverBgClass: string;
  navTextClass: string;
  navIconClass: string;
}

function NavItemList({
  items,
  depth,
  collapsed,
  isIconMode,
  openKeys,
  onToggle,
  navActiveBgClass,
  navHoverBgClass,
  navTextClass,
  navIconClass,
}: NavItemListProps) {
  const ChevronRight = (LucideIcons as Record<string, any>)["ChevronRight"];
  const iconModeOnly = collapsed && isIconMode;

  return (
    <>
      {items.map((item) => {
        if (item.type === "separator") {
          return <div key={item.key} className="my-1 h-px bg-border mx-2" />;
        }
        if (item.type === "group-label") {
          return iconModeOnly ? null : (
            <div
              key={item.key}
              className={cn(
                "px-2 py-1 text-xs font-medium uppercase tracking-wide",
                navTextClass || "text-muted-foreground",
              )}
            >
              {item.label}
            </div>
          );
        }
        // item type
        const IconComp = item.icon && depth < 2 ? (LucideIcons as Record<string, any>)[item.icon] : null;
        const isActive = !!item.active;
        const hasChildren = !!(item.children && item.children.length > 0);
        const isOpen = openKeys.has(item.key);
        const indentClass = depth === 1 ? "pl-5" : depth >= 2 ? "pl-8" : "";

        const itemCls = cn(
          "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors w-full",
          indentClass,
          iconModeOnly ? "justify-center px-0" : "",
          isActive
            ? cn(navActiveBgClass || "bg-accent", navTextClass || "text-accent-foreground")
            : cn(
                navHoverBgClass ? `hover:${navHoverBgClass}` : "hover:bg-accent",
                navTextClass || "text-foreground",
              ),
        );

        return (
          <div key={item.key}>
            <button
              type="button"
              className={itemCls}
              onClick={hasChildren ? () => onToggle(item.key) : undefined}
            >
              {IconComp && <IconComp className={cn("mt-0.5 h-4 w-4 shrink-0", navIconClass)} />}
              {!iconModeOnly && (
                <span className="min-w-0 flex-1 break-words text-left">{item.label}</span>
              )}
              {!iconModeOnly && item.badge && (
                <span
                  className={cn(
                    "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    item.badgeBgClass || "bg-primary",
                    item.badgeTextClass || "text-primary-foreground",
                  )}
                >
                  {item.badge}
                </span>
              )}
              {!iconModeOnly && hasChildren && ChevronRight && (
                <ChevronRight
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0 transition-transform",
                    isOpen && "rotate-90",
                  )}
                />
              )}
            </button>
            {hasChildren && isOpen && !iconModeOnly && (
              <div className="flex flex-col gap-0.5">
                <NavItemList
                  items={item.children!}
                  depth={depth + 1}
                  collapsed={collapsed}
                  isIconMode={isIconMode}
                  openKeys={openKeys}
                  onToggle={onToggle}
                  navActiveBgClass={navActiveBgClass}
                  navHoverBgClass={navHoverBgClass}
                  navTextClass={navTextClass}
                  navIconClass={navIconClass}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// --- Props ---

interface CraftSidebarProps {
  sidebarData?: string;
  side?: "left" | "right";
  collapsible?: "icon" | "offcanvas" | "none";
  sidebarWidth?: string;
  width?: string;
  height?: string;
  headerCollapseMode?: "clip" | "hide";
  footerCollapseMode?: "clip" | "hide";
  sidebarBgClass?: string;
  sidebarBorderColor?: string;
  sidebarShadow?: string;
  headerBgClass?: string;
  headerBorderColor?: string;
  headerShadow?: string;
  navActiveBgClass?: string;
  navHoverBgClass?: string;
  navTextClass?: string;
  navIconClass?: string;
  footerBgClass?: string;
  footerBorderColor?: string;
  footerShadow?: string;
  insetBgClass?: string;
  insetBorderColor?: string;
  insetShadow?: string;
  className?: string;
}

export const CraftSidebar: UserComponent<CraftSidebarProps> = ({
  sidebarData = DEFAULT_SIDEBAR_DATA,
  side = "left",
  collapsible = "icon",
  sidebarWidth = "240px",
  width = "auto",
  height = "auto",
  headerCollapseMode = "clip",
  footerCollapseMode = "clip",
  sidebarBgClass = "",
  sidebarBorderColor = "",
  sidebarShadow = "",
  headerBgClass = "",
  headerBorderColor = "",
  headerShadow = "",
  navActiveBgClass = "",
  navHoverBgClass = "",
  navTextClass = "",
  navIconClass = "",
  footerBgClass = "",
  footerBorderColor = "",
  footerShadow = "",
  insetBgClass = "",
  insetBorderColor = "",
  insetShadow = "",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<Set<number>>(() => {
    const initial = parseSidebarData(sidebarData);
    return new Set(collectDefaultOpenKeys(initial.items));
  });

  const meta = parseSidebarData(sidebarData);

  function toggleKey(key: number) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isCollapsible = collapsible !== "none";
  const isIconMode = collapsible === "icon";
  const isOffcanvasMode = collapsible === "offcanvas";

  const effectiveWidth = collapsed
    ? isIconMode
      ? "48px"
      : "0px"
    : sidebarWidth || "240px";

  const sidebarHidden = collapsed && isOffcanvasMode;

  const sidebarPanel = (
    <div
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200",
        sidebarBgClass || "bg-sidebar",
        sidebarBorderColor,
        sidebarShadow,
        side === "left" ? "border-r" : "border-l",
        sidebarHidden ? "hidden" : "",
      )}
      style={{ width: effectiveWidth, minWidth: effectiveWidth, flexShrink: 0 }}
    >
      {/* Header */}
      {!(collapsed && headerCollapseMode === "hide") && (
        <div
          className={cn(
            "border-b px-2 py-3",
            headerBgClass,
            headerBorderColor,
            headerShadow,
            collapsed && isIconMode ? "overflow-hidden" : "",
          )}
        >
          <Element id="sidebar_header" is={SidebarHeaderSlot} canvas />
        </div>
      )}

      {/* Nav items */}
      <div className="flex flex-col flex-1 overflow-y-auto py-2 gap-0.5 px-2">
        <NavItemList
          items={meta.items}
          depth={0}
          collapsed={collapsed}
          isIconMode={isIconMode}
          openKeys={openKeys}
          onToggle={toggleKey}
          navActiveBgClass={navActiveBgClass}
          navHoverBgClass={navHoverBgClass}
          navTextClass={navTextClass}
          navIconClass={navIconClass}
        />
      </div>

      {/* Footer */}
      {!(collapsed && footerCollapseMode === "hide") && (
        <div
          className={cn(
            "border-t px-2 py-3",
            footerBgClass,
            footerBorderColor,
            footerShadow,
            collapsed && isIconMode ? "overflow-hidden" : "",
          )}
        >
          <Element id="sidebar_footer" is={SidebarFooterSlot} canvas />
        </div>
      )}
    </div>
  );

  const insetPanel = (
    <div
      className={cn(
        "flex flex-col flex-1",
        insetBgClass || "bg-background",
        insetBorderColor,
        insetShadow,
      )}
    >
      {/* Toggle button */}
      {isCollapsible && (
        <div className="flex items-center border-b px-2 py-1">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          >
            {side === "left" ? (collapsed ? "→" : "←") : collapsed ? "←" : "→"}
          </button>
        </div>
      )}
      <div className="flex flex-col flex-1 overflow-auto">
        <Element id="sidebar_inset" is={SidebarInsetSlot} canvas />
      </div>
    </div>
  );

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "flex overflow-hidden",
        side === "right" ? "flex-row-reverse" : "flex-row",
        className,
      )}
      style={{
        width: width && width !== "auto" ? width : undefined,
        height: height && height !== "auto" ? height : undefined,
      }}
    >
      {sidebarPanel}
      {insetPanel}
    </div>
  );
};

CraftSidebar.craft = {
  displayName: "Sidebar",
  props: {
    sidebarData: DEFAULT_SIDEBAR_DATA,
    side: "left",
    collapsible: "icon",
    sidebarWidth: "240px",
    width: "auto",
    height: "auto",
    headerCollapseMode: "clip",
    footerCollapseMode: "clip",
    sidebarBgClass: "",
    sidebarBorderColor: "",
    sidebarShadow: "",
    headerBgClass: "",
    headerBorderColor: "",
    headerShadow: "",
    navActiveBgClass: "",
    navHoverBgClass: "",
    navTextClass: "",
    navIconClass: "",
    footerBgClass: "",
    footerBorderColor: "",
    footerShadow: "",
    insetBgClass: "",
    insetBorderColor: "",
    insetShadow: "",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
