import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftCarouselProps {
  items?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftCarousel: UserComponent<CraftCarouselProps> = ({
  items = "Slide 1,Slide 2,Slide 3",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const itemList = items.split(",").map((s) => s.trim());

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative w-full", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="overflow-hidden rounded-lg">
        <div className="flex">
          <div className="min-w-0 shrink-0 grow-0 basis-full">
            <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted p-6">
              <span className="text-sm text-muted-foreground">{itemList[0]}</span>
            </div>
          </div>
        </div>
      </div>
      <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      <div className="flex justify-center gap-1 mt-2">
        {itemList.map((_, i) => (
          <div key={i} className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-primary" : "bg-primary/30")} />
        ))}
      </div>
    </div>
  );
};

CraftCarousel.craft = {
  displayName: "Carousel",
  props: {
    items: "Slide 1,Slide 2,Slide 3",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
