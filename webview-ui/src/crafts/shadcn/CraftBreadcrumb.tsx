import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftBreadcrumbProps {
  items?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftBreadcrumb: UserComponent<CraftBreadcrumbProps> = ({
  items = "Home,Products,Current",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const itemList = items.split(",").map((s) => s.trim());

  return (
    <nav
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      aria-label="breadcrumb"
      className={cn(className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <ol className="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
        {itemList.map((item, i) => (
          <li key={i} className="inline-flex items-center gap-1.5">
            {i > 0 && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="m9 18 6-6-6-6"/></svg>
            )}
            {i === itemList.length - 1 ? (
              <span className="font-normal text-foreground">{item}</span>
            ) : (
              <span className="hover:text-foreground transition-colors cursor-pointer">{item}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

CraftBreadcrumb.craft = {
  displayName: "Breadcrumb",
  props: {
    items: "Home,Products,Current",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
