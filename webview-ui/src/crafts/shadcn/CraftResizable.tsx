import { Element, useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import type { ReactNode } from "react";
import { CraftContainer } from "../layout/CraftContainer";

/** Internal canvas slot for each resizable panel */
export const ResizablePanelSlot: UserComponent<{ children?: ReactNode }> = ({ children }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(r) => {
        if (r) connect(r);
      }}
      className="min-h-[40px] h-full w-full overflow-auto"
    >
      {children}
    </div>
  );
};

ResizablePanelSlot.craft = {
  displayName: "ResizablePanelSlot",
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

export function getPanelFlex(size: number | string): string {
  if (typeof size === "string") {
    const s = size.trim();
    if (/^\d+(\.\d+)?%$/.test(s)) { const pct = parseFloat(s); return `${pct} ${pct} 0%`; }
    if (/\d+(px|rem|em|vw|vh)$/.test(s)) return `0 0 ${s}`;
    const n = parseFloat(s); if (!isNaN(n)) return `${n} ${n} 0%`;
  }
  const n = typeof size === "number" ? size : parseFloat(String(size));
  return `${n} ${n} 0%`;
}

export interface ResizableMeta {
  direction: "horizontal" | "vertical";
  nextKey: number;
  panels: Array<{ key: number; size: number | string }>;
}

const DEFAULT_PANEL_META: ResizableMeta = {
  direction: "horizontal",
  nextKey: 2,
  panels: [
    { key: 0, size: 50 },
    { key: 1, size: 50 },
  ],
};

export const DEFAULT_PANEL_META_JSON = JSON.stringify(DEFAULT_PANEL_META);

export function parseResizableMeta(raw: string | undefined): ResizableMeta {
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      direction: parsed.direction === "vertical" ? "vertical" : "horizontal",
      nextKey: typeof parsed.nextKey === "number" ? parsed.nextKey : DEFAULT_PANEL_META.nextKey,
      panels: Array.isArray(parsed.panels) ? parsed.panels : DEFAULT_PANEL_META.panels,
    };
  } catch {
    return DEFAULT_PANEL_META;
  }
}

interface CraftResizableProps {
  panelMeta?: string;
  withHandle?: boolean;
  borderColor?: string;
  separatorColor?: string;
  borderRadius?: string;
  shadow?: string;
  className?: string;
  width?: string;
  height?: string;
}

export const CraftResizable: UserComponent<CraftResizableProps> = ({
  panelMeta = DEFAULT_PANEL_META_JSON,
  withHandle = true,
  borderColor = "",
  separatorColor = "",
  borderRadius = "rounded-lg",
  shadow = "",
  className = "",
  width = "auto",
  height = "200px",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const meta = parseResizableMeta(panelMeta);
  const isVertical = meta.direction === "vertical";

  return (
    <div
      className={cn(
        "flex border overflow-hidden",
        isVertical ? "flex-col" : "flex-row",
        borderRadius,
        borderColor,
        shadow,
        className,
      )}
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
      }}
    >
      {/* Drag handle strip — hovering reveals it; clicking selects Resizable */}
      <div
        ref={(r) => { if (r) connect(drag(r)); }}
        className={cn(
          "flex-shrink-0 cursor-move select-none bg-muted/20 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100",
          isVertical ? "h-4 w-full" : "w-4 h-full",
        )}
      >
        <span className="text-[9px] text-muted-foreground">⠿</span>
      </div>
      {meta.panels.map((panel, idx) => (
        <div
          key={panel.key}
          className="flex"
          style={{
            flexDirection: isVertical ? "column" : "row",
            flex: getPanelFlex(panel.size),
            minWidth: isVertical ? undefined : 0,
            minHeight: isVertical ? 0 : undefined,
            overflow: "hidden",
          }}
        >
          <div className="flex-1 overflow-auto">
            <Element id={`panel_${panel.key}`} is={ResizablePanelSlot} canvas>
              <Element is={CraftContainer} canvas />
            </Element>
          </div>
          {/* Visual handle between panels */}
          {idx < meta.panels.length - 1 && (
            <div
              className={cn(
                "flex-shrink-0 flex items-center justify-center",
                separatorColor || "bg-border",
                isVertical ? "h-[4px] w-full" : "w-[4px] h-full",
              )}
            >
              {withHandle && (
                <div
                  className={cn(
                    "rounded-sm bg-border border border-border/60 flex items-center justify-center",
                    isVertical ? "h-[12px] w-[32px]" : "h-[32px] w-[12px]",
                  )}
                >
                  {isVertical ? (
                    /* vertical direction → horizontal separator → GripHorizontal (3col×2row) */
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
                      <circle cx="5" cy="9" r="1.2"/><circle cx="12" cy="9" r="1.2"/><circle cx="19" cy="9" r="1.2"/>
                      <circle cx="5" cy="15" r="1.2"/><circle cx="12" cy="15" r="1.2"/><circle cx="19" cy="15" r="1.2"/>
                    </svg>
                  ) : (
                    /* horizontal direction → vertical separator → GripVertical (2col×3row) */
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
                      <circle cx="9" cy="5" r="1.2"/><circle cx="15" cy="5" r="1.2"/>
                      <circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/>
                      <circle cx="9" cy="19" r="1.2"/><circle cx="15" cy="19" r="1.2"/>
                    </svg>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

CraftResizable.craft = {
  displayName: "Resizable",
  props: {
    panelMeta: DEFAULT_PANEL_META_JSON,
    withHandle: true,
    borderColor: "",
    separatorColor: "",
    borderRadius: "rounded-lg",
    shadow: "",
    className: "",
    width: "auto",
    height: "200px",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
