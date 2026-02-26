import { Element, useEditor, useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

export interface TableMeta {
  rowMap: number[];
  colMap: number[];
  nextKey: number;
  colWidths: Record<string, string>;
}

const DEFAULT_TABLE_META: TableMeta = {
  rowMap: [0, 1, 2],
  colMap: [0, 1, 2],
  nextKey: 3,
  colWidths: { "0": "auto", "1": "auto", "2": "auto" },
};

function parseTableMeta(raw: string): TableMeta {
  try {
    const parsed = JSON.parse(raw);
    return {
      rowMap: Array.isArray(parsed.rowMap) ? parsed.rowMap : DEFAULT_TABLE_META.rowMap,
      colMap: Array.isArray(parsed.colMap) ? parsed.colMap : DEFAULT_TABLE_META.colMap,
      nextKey: typeof parsed.nextKey === "number" ? parsed.nextKey : DEFAULT_TABLE_META.nextKey,
      colWidths: typeof parsed.colWidths === "object" && parsed.colWidths !== null ? parsed.colWidths : DEFAULT_TABLE_META.colWidths,
    };
  } catch {
    return DEFAULT_TABLE_META;
  }
}

interface TableCellSlotProps {
  isHeader?: boolean;
  bgClass?: string;
  borderClass?: string;
  colspan?: number;
  rowspan?: number;
  children?: React.ReactNode;
}

/** Internal canvas slot used by CraftTable for each cell drop zone */
export const TableCellSlot: UserComponent<TableCellSlotProps> = ({
  isHeader = false,
  bgClass = "",
  borderClass = "",
  colspan = 1,
  rowspan = 1,
  children,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn("min-h-[20px] p-1", bgClass, borderClass)}
    >
      {children}
    </div>
  );
};

TableCellSlot.craft = {
  displayName: "TableCellSlot",
  props: {
    isHeader: false,
    bgClass: "",
    borderClass: "",
    colspan: 1,
    rowspan: 1,
  },
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};

interface CraftTableProps {
  tableMeta?: string;
  width?: string;
  height?: string;
  className?: string;
  borderColor?: string;
  borderWidth?: string;
}

export const CraftTable: UserComponent<CraftTableProps> = ({
  tableMeta: tableMetaRaw = JSON.stringify(DEFAULT_TABLE_META),
  width = "auto",
  height = "auto",
  className = "",
  borderColor = "",
  borderWidth = "1",
}) => {
  const {
    connectors: { connect, drag },
    linkedNodes,
  } = useNode((node) => ({
    linkedNodes: node.data.linkedNodes,
  }));

  const allNodes = useEditor((state) => state.nodes);

  const meta = parseTableMeta(tableMetaRaw || JSON.stringify(DEFAULT_TABLE_META));
  const { rowMap, colMap, colWidths } = meta;

  // Compute hidden cells due to colspan/rowspan
  const hiddenCells = new Set<string>();
  for (let logR = 0; logR < rowMap.length; logR++) {
    for (let logC = 0; logC < colMap.length; logC++) {
      const physR = rowMap[logR];
      const physC = colMap[logC];
      const slotNodeId = linkedNodes[`cell_${physR}_${physC}`];
      if (!slotNodeId || hiddenCells.has(`${logR}_${logC}`)) continue;

      const slotNode = allNodes[slotNodeId];
      const colspan = (slotNode?.data?.props?.colspan as number) || 1;
      const rowspan = (slotNode?.data?.props?.rowspan as number) || 1;

      // Mark cells covered by this cell's span as hidden
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (logR + dr < rowMap.length && logC + dc < colMap.length) {
            hiddenCells.add(`${logR + dr}_${logC + dc}`);
          }
        }
      }
    }
  }

  // Determine which rows are all-header rows (for thead/tbody split)
  // Consecutive leading rows where every visible cell is isHeader → thead
  let headerRowCount = 0;
  for (let logR = 0; logR < rowMap.length; logR++) {
    let allHeader = true;
    for (let logC = 0; logC < colMap.length; logC++) {
      if (hiddenCells.has(`${logR}_${logC}`)) continue;
      const physR = rowMap[logR];
      const physC = colMap[logC];
      const slotNodeId = linkedNodes[`cell_${physR}_${physC}`];
      if (!slotNodeId) { allHeader = false; break; }
      const slotNode = allNodes[slotNodeId];
      if (!slotNode?.data?.props?.isHeader) { allHeader = false; break; }
    }
    if (allHeader) headerRowCount++;
    else break;
  }

  const tableStyle: React.CSSProperties = {};
  if (width !== "auto") tableStyle.width = width;
  if (height !== "auto") tableStyle.height = height;

  const bwClass = borderWidth === "0" ? "border-0"
    : borderWidth === "2" ? "border-2"
    : borderWidth === "4" ? "border-4"
    : "border";
  const cellBorderClass = cn(bwClass, borderColor || "border-border");

  function renderRow(logR: number) {
    const physR = rowMap[logR];
    return (
      <tr key={physR}>
        {colMap.map((physC, logC) => {
          if (hiddenCells.has(`${logR}_${logC}`)) return null;

          const cellKey = `cell_${physR}_${physC}`;
          const slotNodeId = linkedNodes[cellKey];
          const slotNode = slotNodeId ? allNodes[slotNodeId] : null;
          const isHeader = !!(slotNode?.data?.props?.isHeader);
          const colspan = (slotNode?.data?.props?.colspan as number) || 1;
          const rowspan = (slotNode?.data?.props?.rowspan as number) || 1;
          const colWidth = colWidths[String(physC)];
          const cellWidth = (slotNode?.data?.props?.width as string) || "";
          const cellHeight = (slotNode?.data?.props?.height as string) || "";
          const cellStyle: React.CSSProperties = {};
          const effectiveWidth = (cellWidth && cellWidth !== "auto") ? cellWidth
            : (colWidth && colWidth !== "auto") ? colWidth
            : undefined;
          if (effectiveWidth) cellStyle.width = effectiveWidth;
          if (cellHeight && cellHeight !== "auto") cellStyle.height = cellHeight;

          const CellTag = isHeader ? "th" : "td";
          return (
            <CellTag
              key={physC}
              colSpan={colspan > 1 ? colspan : undefined}
              rowSpan={rowspan > 1 ? rowspan : undefined}
              style={Object.keys(cellStyle).length > 0 ? cellStyle : undefined}
              className={cn(cellBorderClass, "p-0 align-top")}
            >
              <Element
                id={cellKey}
                is={TableCellSlot}
                canvas
              />
            </CellTag>
          );
        })}
      </tr>
    );
  }

  const headerRows = rowMap.slice(0, headerRowCount);
  const bodyRows = rowMap.slice(headerRowCount);

  return (
    <div
      className={cn("w-full overflow-auto", className)}
      style={tableStyle}
    >
      {/* Drag handle strip — outside cell canvas, so clicks reach CraftTable's connect */}
      <div
        ref={(ref) => {
          if (ref) connect(drag(ref));
        }}
        className="flex h-4 cursor-move select-none items-center bg-muted/20 px-1 opacity-0 transition-opacity hover:opacity-100"
      >
        <span className="text-[9px] text-muted-foreground">⠿ Table</span>
      </div>
      <table className="w-full caption-bottom border-collapse text-sm">
        {headerRowCount > 0 && (
          <thead className="bg-muted/50">
            {headerRows.map((_, logR) => renderRow(logR))}
          </thead>
        )}
        {bodyRows.length > 0 && (
          <tbody>
            {bodyRows.map((_, idx) => renderRow(headerRowCount + idx))}
          </tbody>
        )}
      </table>
    </div>
  );
};

CraftTable.craft = {
  displayName: "Table",
  props: {
    tableMeta: JSON.stringify(DEFAULT_TABLE_META),
    width: "auto",
    height: "auto",
    className: "",
    borderColor: "",
    borderWidth: "1",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
};
