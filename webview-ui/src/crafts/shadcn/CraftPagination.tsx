import { useState } from "react";
import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftPaginationProps {
  totalPages?: number;
  currentPage?: number;
  width?: string;
  height?: string;
  className?: string;
  hoverBgClass?: string;
  hoverTextClass?: string;
  activeBgClass?: string;
  activeTextClass?: string;
  activeBorderClass?: string;
  activeBorderWidth?: string;
  activeShadowClass?: string;
}

export const CraftPagination: UserComponent<CraftPaginationProps> = ({
  totalPages = 5,
  currentPage = 1,
  width = "auto",
  height = "auto",
  className = "",
  hoverBgClass = "",
  hoverTextClass = "",
  activeBgClass = "",
  activeTextClass = "",
  activeBorderClass = "",
  activeBorderWidth = "",
  activeShadowClass = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const [hoveredPage, setHoveredPage] = useState<number | null>(null);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const activeBorderWidthClass =
    activeBorderWidth === "0" ? "border-0"
    : activeBorderWidth === "2" ? "border-2"
    : activeBorderWidth === "4" ? "border-4"
    : activeBorderWidth === "8" ? "border-8"
    : activeBorderWidth === "1" ? "border"
    : "border";

  const activeCls = cn(
    activeBorderWidthClass,
    activeBorderClass || "border-input",
    activeBgClass || "bg-background",
    activeShadowClass || "shadow-sm",
    activeTextClass,
  );

  const hasCustomHover = !!(hoverBgClass || hoverTextClass);

  const getPageCls = (page: number) => {
    if (page === currentPage) return activeCls;
    if (hasCustomHover) {
      return hoveredPage === page ? cn(hoverBgClass, hoverTextClass) : "";
    }
    return "hover:bg-accent hover:text-accent-foreground";
  };

  const getNavCls = (key: string) => {
    if (hasCustomHover) {
      return hoveredPage === (key === "prev" ? -1 : -2) ? cn(hoverBgClass, hoverTextClass) : "";
    }
    return "hover:bg-accent hover:text-accent-foreground";
  };

  return (
    <nav
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      role="navigation"
      aria-label="pagination"
      className={cn("flex w-full", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <ul className="flex flex-row items-center gap-1">
        <li>
          <span
            className={cn(
              "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-3 cursor-pointer",
              getNavCls("prev"),
            )}
            onMouseEnter={() => setHoveredPage(-1)}
            onMouseLeave={() => setHoveredPage(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
            <span>Previous</span>
          </span>
        </li>
        {pages.map((page) => (
          <li key={page}>
            <span
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 w-9 cursor-pointer",
                getPageCls(page),
              )}
              onMouseEnter={() => setHoveredPage(page)}
              onMouseLeave={() => setHoveredPage(null)}
            >
              {page}
            </span>
          </li>
        ))}
        <li>
          <span
            className={cn(
              "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-3 cursor-pointer",
              getNavCls("next"),
            )}
            onMouseEnter={() => setHoveredPage(-2)}
            onMouseLeave={() => setHoveredPage(null)}
          >
            <span>Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
          </span>
        </li>
      </ul>
    </nav>
  );
};

CraftPagination.craft = {
  displayName: "Pagination",
  props: {
    totalPages: 5,
    currentPage: 1,
    width: "auto",
    height: "auto",
    className: "",
    hoverBgClass: "",
    hoverTextClass: "",
    activeBgClass: "",
    activeTextClass: "",
    activeBorderClass: "",
    activeBorderWidth: "",
    activeShadowClass: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
