import { useState } from "react";
import { Element, useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import type { ReactNode } from "react";

/** Internal canvas slot for each slide's content */
export const SlideContentSlot: UserComponent<{ children?: ReactNode }> = ({ children }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="min-h-[100px] h-full w-full"
    >
      {children}
    </div>
  );
};

SlideContentSlot.craft = {
  displayName: "SlideContentSlot",
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

export interface SlideMeta {
  keys: number[];
  nextKey: number;
  labels: Record<string, string>;
}

const DEFAULT_SLIDE_META: SlideMeta = {
  keys: [0, 1, 2],
  nextKey: 3,
  labels: { "0": "Slide 1", "1": "Slide 2", "2": "Slide 3" },
};

export const DEFAULT_SLIDE_META_JSON = JSON.stringify(DEFAULT_SLIDE_META);

interface CraftCarouselProps {
  slideMeta?: string;
  orientation?: "horizontal" | "vertical";
  loop?: boolean;

  showArrows?: boolean;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftCarousel: UserComponent<CraftCarouselProps> = ({
  slideMeta = DEFAULT_SLIDE_META_JSON,
  orientation = "horizontal",
  loop = false,

  showArrows = true,
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  let meta: SlideMeta = DEFAULT_SLIDE_META;
  try {
    const parsed = JSON.parse(slideMeta);
    meta = {
      keys: Array.isArray(parsed.keys) ? parsed.keys : DEFAULT_SLIDE_META.keys,
      nextKey: typeof parsed.nextKey === "number" ? parsed.nextKey : DEFAULT_SLIDE_META.nextKey,
      labels: typeof parsed.labels === "object" && parsed.labels !== null ? parsed.labels : DEFAULT_SLIDE_META.labels,
    };
  } catch {
    // use defaults
  }

  const [activeKey, setActiveKey] = useState<number>(meta.keys[0] ?? 0);

  const totalSlides = meta.keys.length;
  const activeIndex = meta.keys.indexOf(activeKey);

  function goPrev() {
    const idx = meta.keys.indexOf(activeKey);
    if (idx > 0) setActiveKey(meta.keys[idx - 1]);
    else if (loop) setActiveKey(meta.keys[meta.keys.length - 1]);
  }

  function goNext() {
    const idx = meta.keys.indexOf(activeKey);
    if (idx < meta.keys.length - 1) setActiveKey(meta.keys[idx + 1]);
    else if (loop) setActiveKey(meta.keys[0]);
  }

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "relative",
        width && width !== "auto" ? "block" : "inline-grid",
        className,
      )}
      style={{
        width: width && width !== "auto" ? width : undefined,
        height: height && height !== "auto" ? height : undefined,
      }}
    >
      {/* Slide content slots — all rendered, inactive hidden */}
      <div className="overflow-hidden">
        {meta.keys.map((key) => (
          <div key={key} style={{ display: key === activeKey ? undefined : "none" }}>
            <Element id={`slide_${key}`} is={SlideContentSlot} canvas />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {showArrows && (
        <>
          <button
            type="button"
            className={cn(
              "absolute inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent z-10",
              orientation === "vertical"
                ? "top-2 left-1/2 -translate-x-1/2"
                : "left-2 top-1/2 -translate-y-1/2",
            )}
            onClick={goPrev}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              {orientation === "vertical"
                ? <path d="m18 15-6-6-6 6" />
                : <path d="m15 18-6-6 6-6" />}
            </svg>
          </button>
          <button
            type="button"
            className={cn(
              "absolute inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent z-10",
              orientation === "vertical"
                ? "bottom-2 left-1/2 -translate-x-1/2"
                : "right-2 top-1/2 -translate-y-1/2",
            )}
            onClick={goNext}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              {orientation === "vertical"
                ? <path d="m6 9 6 6 6-6" />
                : <path d="m9 18 6-6-6-6" />}
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {meta.keys.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              className={cn("h-1.5 w-1.5 rounded-full transition-colors", i === activeIndex ? "bg-primary" : "bg-primary/30")}
            />
          ))}
        </div>
      )}
    </div>
  );
};

CraftCarousel.craft = {
  displayName: "Carousel",
  props: {
    slideMeta: DEFAULT_SLIDE_META_JSON,
    orientation: "horizontal",
    loop: false,

    showArrows: true,
    width: "320px",
    height: "200px",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
