import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftPaginationProps {
  totalPages?: number;
  currentPage?: number;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftPagination: UserComponent<CraftPaginationProps> = ({
  totalPages = 5,
  currentPage = 1,
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <ul className="flex flex-row items-center gap-1">
        <li>
          <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
            <span>Previous</span>
          </span>
        </li>
        {pages.map((page) => (
          <li key={page}>
            <span
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 w-9 cursor-pointer",
                page === currentPage
                  ? "border border-input bg-background shadow-sm"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {page}
            </span>
          </li>
        ))}
        <li>
          <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
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
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
