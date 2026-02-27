import { useState } from "react";
import { Element, useNode, type UserComponent } from "@craftjs/core";
import * as LucideIcons from "lucide-react";
import { cn } from "../../utils/cn";
import type { ReactNode } from "react";

/** Internal canvas slot for each tab's content */
export const TabContentSlot: UserComponent<{ children?: ReactNode }> = ({ children }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="min-h-[40px]"
    >
      {children}
    </div>
  );
};

TabContentSlot.craft = {
  displayName: "TabContentSlot",
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

export interface TabMeta {
  keys: number[];
  nextKey: number;
  labels: Record<string, string>;
  icons: Record<string, string>;
  tooltips: Record<string, string>;
}

const DEFAULT_TAB_META: TabMeta = {
  keys: [0, 1, 2],
  nextKey: 3,
  labels: { "0": "Tab 1", "1": "Tab 2", "2": "Tab 3" },
  icons: { "0": "", "1": "", "2": "" },
  tooltips: { "0": "", "1": "", "2": "" },
};

export const DEFAULT_TAB_META_JSON = JSON.stringify(DEFAULT_TAB_META);

interface CraftTabsProps {
  tabMeta?: string;
  orientation?: "horizontal" | "vertical";
  width?: string;
  height?: string;
  className?: string;
  tabListBgClass?: string;
  tabActiveBgClass?: string;
  contentBgClass?: string;
  outerBorderColor?: string;
  contentBorderColor?: string;
  outerShadow?: string;
  contentShadow?: string;
}

export const CraftTabs: UserComponent<CraftTabsProps> = ({
  tabMeta = DEFAULT_TAB_META_JSON,
  orientation = "horizontal",
  width = "auto",
  height = "auto",
  className = "",
  tabListBgClass = "",
  tabActiveBgClass = "",
  contentBgClass = "",
  outerBorderColor = "",
  contentBorderColor = "",
  outerShadow = "",
  contentShadow = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  let meta: TabMeta = DEFAULT_TAB_META;
  try {
    const parsed = JSON.parse(tabMeta);
    meta = {
      keys: Array.isArray(parsed.keys) ? parsed.keys : DEFAULT_TAB_META.keys,
      nextKey: typeof parsed.nextKey === "number" ? parsed.nextKey : DEFAULT_TAB_META.nextKey,
      labels: typeof parsed.labels === "object" && parsed.labels !== null ? parsed.labels : DEFAULT_TAB_META.labels,
      icons: typeof parsed.icons === "object" && parsed.icons !== null ? parsed.icons : DEFAULT_TAB_META.icons,
      tooltips: typeof parsed.tooltips === "object" && parsed.tooltips !== null ? parsed.tooltips : DEFAULT_TAB_META.tooltips,
    };
  } catch {
    // use defaults
  }

  const [activeKey, setActiveKey] = useState<number>(meta.keys[0] ?? 0);

  const isVertical = orientation === "vertical";

  const tabListCls = cn(
    isVertical
      ? "flex flex-col items-stretch bg-muted p-1 rounded-md"
      : "inline-flex items-center bg-muted p-1 rounded-md w-full",
    tabListBgClass,
  );

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(isVertical ? "flex flex-row" : "flex flex-col", outerBorderColor, outerShadow, className)}
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
      }}
    >
      {/* Tab list */}
      <div className={tabListCls}>
        {meta.keys.map((key) => {
          const label = meta.labels[String(key)] ?? `Tab ${key}`;
          const iconName = meta.icons[String(key)];
          const tooltip = meta.tooltips[String(key)] || "";
          const IconComp = iconName ? (LucideIcons as Record<string, any>)[iconName] : null;
          const isActive = key === activeKey;
          return (
            <div
              key={key}
              className={cn("relative group", isVertical ? "" : "flex-1")}
            >
              <button
                type="button"
                onClick={() => setActiveKey(key)}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isVertical ? "text-left" : "",
                  isActive
                    ? cn("bg-background text-foreground shadow", tabActiveBgClass)
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {IconComp && <IconComp className="h-4 w-4" />}
                {label}
              </button>
              {tooltip && (
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 z-50 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {tooltip}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tab content slots — all rendered, inactive hidden */}
      <div className={cn("flex-1", isVertical ? "" : "mt-2")}>
        {meta.keys.map((key) => (
          <div key={key} style={{ display: key === activeKey ? undefined : "none" }}>
            <div className={cn("rounded-md p-2", contentBgClass, contentBorderColor, contentShadow)}>
              <Element id={`tab_${key}`} is={TabContentSlot} canvas />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

CraftTabs.craft = {
  displayName: "Tabs",
  props: {
    tabMeta: DEFAULT_TAB_META_JSON,
    orientation: "horizontal",
    width: "auto",
    height: "auto",
    className: "",
    tabListBgClass: "",
    tabActiveBgClass: "",
    contentBgClass: "",
    outerBorderColor: "",
    contentBorderColor: "",
    outerShadow: "",
    contentShadow: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
