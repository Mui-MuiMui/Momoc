import { useState, useRef, useEffect } from "react";
import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftBreadcrumbProps {
  items?: string;
  maxVisible?: string;
  width?: string;
  height?: string;
  className?: string;
}

const ChevronIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const EllipsisIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

export const CraftBreadcrumb: UserComponent<CraftBreadcrumbProps> = ({
  items = "Home,Products,Current",
  maxVisible = "0",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  const itemList = items.split(",").map((s) => s.trim()).filter(Boolean);
  const maxV = parseInt(maxVisible || "0", 10);
  const shouldCollapse = maxV > 0 && itemList.length > maxV;

  // Always show first item + last (maxV-1) items; middle goes into dropdown
  const visibleTail = shouldCollapse ? itemList.slice(-(maxV - 1)) : itemList.slice(1);
  const collapsed = shouldCollapse ? itemList.slice(1, -(maxV - 1)) : [];

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

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
        {/* First item */}
        <li className="inline-flex items-center gap-1.5">
          {itemList.length === 1 ? (
            <span className="font-normal text-foreground">{itemList[0]}</span>
          ) : (
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-foreground transition-colors">{itemList[0]}</a>
          )}
        </li>

        {/* Ellipsis with dropdown for collapsed items */}
        {shouldCollapse && (
          <>
            <li aria-hidden="true" className="[&>svg]:size-3.5"><ChevronIcon /></li>
            <li ref={dropdownRef} className="inline-flex items-center gap-1.5" style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center hover:text-foreground transition-colors"
                aria-label="Show more"
              >
                <EllipsisIcon />
              </button>
              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, zIndex: 50,
                  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
                  borderRadius: "6px", padding: "4px", minWidth: "8rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  color: "hsl(var(--popover-foreground))",
                }}>
                  {collapsed.map((label, i) => (
                    <div key={i} className="rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-default">
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </li>
          </>
        )}

        {/* Tail items */}
        {visibleTail.map((label, i) => {
          const globalIndex = shouldCollapse
            ? itemList.length - visibleTail.length + i
            : i + 1;
          const isLast = globalIndex === itemList.length - 1;
          return (
            <>
              <li key={`sep-${globalIndex}`} aria-hidden="true" className="[&>svg]:size-3.5"><ChevronIcon /></li>
              <li key={`item-${globalIndex}`} className="inline-flex items-center gap-1.5">
                {isLast ? (
                  <span className="font-normal text-foreground">{label}</span>
                ) : (
                  <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-foreground transition-colors">{label}</a>
                )}
              </li>
            </>
          );
        })}
      </ol>
    </nav>
  );
};

CraftBreadcrumb.craft = {
  displayName: "Breadcrumb",
  props: {
    items: "Home,Products,Current",
    maxVisible: "0",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
