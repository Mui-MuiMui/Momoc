import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftAccordionProps {
  items?: string;
  type?: "single" | "multiple";
  linkedMocPaths?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftAccordion: UserComponent<CraftAccordionProps> = ({
  items = "Item 1,Item 2,Item 3",
  type = "single",
  linkedMocPaths = "",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const itemList = items.split(",").map((s) => s.trim());
  const mocPaths = linkedMocPaths ? linkedMocPaths.split(",").map((s) => s.trim()) : [];

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("w-full", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {itemList.map((item, i) => (
        <div key={i} className="border-b">
          <div className="flex w-full items-center justify-between py-3 text-sm font-medium">
            <span className="flex items-center gap-1.5">
              {item}
              {mocPaths[i] && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              )}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-muted-foreground"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      ))}
    </div>
  );
};

CraftAccordion.craft = {
  displayName: "Accordion",
  props: {
    items: "Item 1,Item 2,Item 3",
    type: "single",
    linkedMocPaths: "",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
