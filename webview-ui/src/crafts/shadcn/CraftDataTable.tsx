import { useState } from "react";
import { Element, useEditor, useNode, type UserComponent } from "@craftjs/core";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface ActionButton {
  label: string;
  className?: string; // full Tailwind className string
}

export interface ColumnDef {
  key: string;
  label?: string;
  type?: "data" | "actions" | "slot";
  sortable?: boolean;
  width?: string; // e.g. "120", "120px", "50%"
  actionButtons?: ActionButton[]; // type==="actions" のみ使用
}

const DEFAULT_COLUMN_DEFS: ColumnDef[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "email", label: "Email" },
  { key: "actions", type: "actions" },
];

export const DEFAULT_COLUMN_DEFS_STR = JSON.stringify(DEFAULT_COLUMN_DEFS);

export const DEFAULT_CSV_DATA = `name,status,email
Alice Johnson,Active,alice@example.com
Bob Smith,Pending,bob@example.com
Carol White,Inactive,carol@example.com
David Brown,Active,david@example.com
Emma Wilson,Pending,emma@example.com`;

function parseColumnDefs(raw: string): ColumnDef[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_COLUMN_DEFS;
    return parsed;
  } catch {
    return DEFAULT_COLUMN_DEFS;
  }
}

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

function normalizeCssSize(v: string | undefined): string | undefined {
  if (!v || v === "auto") return v;
  return /^\d+(\.\d+)?$/.test(v) ? v + "px" : v;
}

/** Internal canvas slot used by CraftDataTable for slot-type columns */
export const DataTableSlot: UserComponent<{ children?: ReactNode }> = ({ children }) => {
  const { connectors: { connect } } = useNode();
  return (
    <div
      ref={(ref) => { if (ref) connect(ref); }}
      className="min-h-[32px] flex items-center"
    >
      {children}
    </div>
  );
};

DataTableSlot.craft = {
  displayName: "DataTableSlot",
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

interface CraftDataTableProps {
  columnDefs?: string;
  csvData?: string;
  filterType?: "none" | "header" | "bar";
  pageable?: boolean;
  pageSize?: string; // "5" | "10" | "20" | "50" | ""
  selectable?: boolean;
  columnToggle?: boolean;
  stickyHeader?: boolean;
  pinnedLeft?: string; // "0" | "1" | "2" | "3" | ""
  width?: string;
  height?: string;
  className?: string;
  headerBgClass?: string;
  hoverRowClass?: string;
  selectedRowClass?: string;
  headerTextClass?: string;
  headerHoverTextClass?: string;
  headerBorderClass?: string;
  tableBorderClass?: string;
}

export const CraftDataTable: UserComponent<CraftDataTableProps> = ({
  columnDefs: columnDefsRaw = DEFAULT_COLUMN_DEFS_STR,
  csvData = DEFAULT_CSV_DATA,
  filterType = "none",
  pageable = false,
  pageSize = "10",
  selectable = false,
  columnToggle = false,
  stickyHeader = false,
  pinnedLeft = "0",
  width = "auto",
  height = "auto",
  className = "",
  headerBgClass = "",
  hoverRowClass = "",
  selectedRowClass = "",
  headerTextClass = "",
  headerHoverTextClass = "",
  headerBorderClass = "",
  tableBorderClass = "",
}) => {
  const { connectors: { connect, drag } } = useNode();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterValue, setFilterValue] = useState("");
  const [filterCol, setFilterCol] = useState("all");
  const [headerFilters, setHeaderFilters] = useState<Record<string, string>>({});
  const [activeHeaderFilter, setActiveHeaderFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColToggle, setShowColToggle] = useState(false);

  const cols = parseColumnDefs(columnDefsRaw || DEFAULT_COLUMN_DEFS_STR);
  const allRows = parseCSV(csvData || DEFAULT_CSV_DATA);
  const pageSizeNum = Math.max(1, parseInt(pageSize || "10") || 10);
  const pinnedLeftNum = Math.max(0, parseInt(pinnedLeft || "0") || 0);

  // Data pipeline (only when in preview mode)
  let filteredRows = allRows;
  if (!enabled) {
    if (filterType === "bar" && filterValue) {
      filteredRows = filteredRows.filter((row) => {
        if (filterCol === "all") {
          return cols
            .filter((c) => !c.type || c.type === "data")
            .some((c) => String(row[c.key] ?? "").toLowerCase().includes(filterValue.toLowerCase()));
        }
        return String(row[filterCol] ?? "").toLowerCase().includes(filterValue.toLowerCase());
      });
    }
    if (filterType === "header") {
      for (const [col, val] of Object.entries(headerFilters)) {
        if (val) {
          filteredRows = filteredRows.filter((row) =>
            String(row[col] ?? "").toLowerCase().includes(val.toLowerCase()),
          );
        }
      }
    }
    if (sortCol) {
      filteredRows = [...filteredRows].sort((a, b) => {
        const av = String(a[sortCol] ?? "");
        const bv = String(b[sortCol] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
  }

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSizeNum));
  const displayRows = pageable && !enabled
    ? filteredRows.slice((page - 1) * pageSizeNum, page * pageSizeNum)
    : filteredRows;

  const visibleCols = cols.filter((c) => !hiddenCols.has(c.key));

  const containerStyle: React.CSSProperties = {};
  const normalizedWidth = normalizeCssSize(width);
  const normalizedHeight = normalizeCssSize(height);
  if (normalizedWidth && normalizedWidth !== "auto") containerStyle.width = normalizedWidth;
  if (normalizedHeight && normalizedHeight !== "auto") containerStyle.height = normalizedHeight;

  const headerStyle: React.CSSProperties = stickyHeader ? { position: "sticky", top: 0, zIndex: 2 } : {};

  function getPinnedStyle(colIdx: number): React.CSSProperties {
    if (colIdx >= pinnedLeftNum) return {};
    let left = selectable ? 40 : 0;
    for (let i = 0; i < colIdx; i++) {
      left += parseInt(visibleCols[i]?.width ?? "120") || 120;
    }
    return { position: "sticky", left, background: "var(--background, white)", zIndex: 1 };
  }

  function handleSort(key: string) {
    if (enabled) return;
    if (sortCol === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(key); setSortDir("asc"); }
  }

  function handleRowSelect(idx: number) {
    if (enabled) return;
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function handleSelectAll() {
    if (enabled) return;
    if (selectedRows.size === displayRows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(displayRows.map((_, i) => i)));
  }

  const borderCls = tableBorderClass || "border-border";

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      className={cn("flex flex-col gap-2", className)}
      style={containerStyle}
    >
      {/* Toolbar */}
      {(filterType === "bar" || columnToggle) && (
        <div className="flex items-center gap-2">
          {filterType === "bar" && (
            <>
              <select
                className="rounded border border-border bg-background px-2 py-1 text-xs"
                value={filterCol}
                onChange={(e) => { if (!enabled) setFilterCol(e.target.value); }}
                disabled={enabled}
              >
                <option value="all">All</option>
                {cols.filter((c) => !c.type || c.type === "data").map((c) => (
                  <option key={c.key} value={c.key}>{c.label ?? c.key}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Filter..."
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
                value={filterValue}
                onChange={(e) => { if (!enabled) setFilterValue(e.target.value); }}
                disabled={enabled}
              />
            </>
          )}
          {columnToggle && (
            <div className="relative ml-auto">
              <button
                type="button"
                className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
                onClick={() => { if (!enabled) setShowColToggle((v) => !v); }}
              >
                Columns ▾
              </button>
              {showColToggle && !enabled && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded border border-border bg-background p-2 shadow-md">
                  {cols.map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-1 py-0.5 text-xs">
                      <input
                        type="checkbox"
                        checked={!hiddenCols.has(c.key)}
                        onChange={() => {
                          setHiddenCols((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.key)) next.delete(c.key);
                            else next.add(c.key);
                            return next;
                          });
                        }}
                      />
                      {c.label ?? c.key}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className={cn("overflow-auto rounded-md border", borderCls)}>
        <table className="min-w-full caption-bottom border-collapse text-sm">
          <thead
            className={cn("border-b", headerBgClass || "bg-muted/50", headerBorderClass)}
            style={headerStyle}
          >
            <tr>
              {selectable && (
                <th className={cn("w-10 px-2 py-2 text-left", headerTextClass)} style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={displayRows.length > 0 && selectedRows.size === displayRows.length}
                    onChange={handleSelectAll}
                    disabled={enabled}
                  />
                </th>
              )}
              {visibleCols.map((col, colIdx) => {
                const isSorted = sortCol === col.key;
                const colStyle: React.CSSProperties = {
                  ...(col.width ? { width: normalizeCssSize(col.width) } : {}),
                  ...getPinnedStyle(colIdx),
                };
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-2 text-left text-xs font-medium",
                      headerTextClass || "text-muted-foreground",
                      col.sortable && !enabled && cn(
                        "cursor-pointer select-none",
                        headerHoverTextClass ? `hover:${headerHoverTextClass}` : "hover:text-foreground",
                      ),
                    )}
                    style={colStyle}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label ?? col.key}</span>
                      {col.sortable && (
                        <span className="text-muted-foreground/60">
                          {isSorted ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      )}
                      {filterType === "header" && (!col.type || col.type === "data") && (
                        <button
                          type="button"
                          className={cn(
                            "ml-auto rounded p-0.5 text-xs opacity-40 hover:opacity-100",
                            activeHeaderFilter === col.key && "text-primary opacity-100",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!enabled) setActiveHeaderFilter((v) => (v === col.key ? null : col.key));
                          }}
                        >
                          ⌕
                        </button>
                      )}
                    </div>
                    {filterType === "header" && activeHeaderFilter === col.key && !enabled && (
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="mt-1 w-full rounded border border-border bg-background px-1 py-0.5 text-xs font-normal"
                        value={headerFilters[col.key] ?? ""}
                        onChange={(e) => setHeaderFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIdx) => {
              const isSelected = selectedRows.has(rowIdx);
              return (
                <tr
                  key={rowIdx}
                  className={cn(
                    "border-b transition-colors",
                    !enabled && hoverRowClass ? `hover:${hoverRowClass}` : !enabled ? "hover:bg-muted/50" : "",
                    isSelected && (selectedRowClass || "bg-muted"),
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-2 py-2" style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(rowIdx)}
                        disabled={enabled}
                      />
                    </td>
                  )}
                  {visibleCols.map((col, colIdx) => {
                    const colStyle: React.CSSProperties = {
                      ...(col.width ? { width: normalizeCssSize(col.width) } : {}),
                      ...getPinnedStyle(colIdx),
                    };
                    return (
                      <td key={col.key} className="px-3 py-2 text-sm" style={colStyle}>
                        {col.type === "slot" ? (
                          rowIdx === 0 ? (
                            <Element id={`dt_slot_${col.key}`} is={DataTableSlot} canvas />
                          ) : (
                            <div className="flex min-h-[32px] items-center text-xs text-muted-foreground opacity-40">
                              [slot]
                            </div>
                          )
                        ) : col.type === "actions" ? (
                          <div className="flex items-center gap-1">
                            {col.actionButtons && col.actionButtons.length > 0
                              ? col.actionButtons.map((btn, bi) => (
                                  <button
                                    key={bi}
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center rounded px-2 py-1 text-xs",
                                      btn.className || "hover:bg-accent",
                                    )}
                                  >
                                    {btn.label || "···"}
                                  </button>
                                ))
                              : (
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-accent"
                                  >
                                    ···
                                  </button>
                                )}
                          </div>
                        ) : (
                          row[col.key] ?? ""
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {displayRows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleCols.length + (selectable ? 1 : 0)}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageable && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {selectable
              ? `${selectedRows.size} of ${totalRows} row(s) selected.`
              : `${totalRows} row(s)`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40"
              disabled={page <= 1 || enabled}
              onClick={() => { if (!enabled) setPage(1); }}
            >
              «
            </button>
            <button
              type="button"
              className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40"
              disabled={page <= 1 || enabled}
              onClick={() => { if (!enabled) setPage((p) => Math.max(1, p - 1)); }}
            >
              ‹
            </button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <button
              type="button"
              className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40"
              disabled={page >= totalPages || enabled}
              onClick={() => { if (!enabled) setPage((p) => Math.min(totalPages, p + 1)); }}
            >
              ›
            </button>
            <button
              type="button"
              className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40"
              disabled={page >= totalPages || enabled}
              onClick={() => { if (!enabled) setPage(totalPages); }}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

CraftDataTable.craft = {
  displayName: "Data Table",
  props: {
    columnDefs: DEFAULT_COLUMN_DEFS_STR,
    csvData: DEFAULT_CSV_DATA,
    filterType: "none",
    pageable: false,
    pageSize: "10",
    selectable: false,
    columnToggle: false,
    stickyHeader: false,
    pinnedLeft: "0",
    width: "auto",
    height: "auto",
    className: "",
    headerBgClass: "",
    hoverRowClass: "",
    selectedRowClass: "",
    headerTextClass: "",
    headerHoverTextClass: "",
    headerBorderClass: "",
    tableBorderClass: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
