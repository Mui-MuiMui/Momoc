import { Element, useEditor, useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

/** 単位なし数値文字列に "px" を付ける。"100" → "100px"、"50%" → "50%"（そのまま） */
function normalizeCssSize(v: string | undefined): string | undefined {
  if (!v || v === "auto") return v;
  return /^\d+(\.\d+)?$/.test(v) ? v + "px" : v;
}

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
  width?: string;
  height?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Internal canvas slot used by CraftTable for each cell drop zone */
export const TableCellSlot: UserComponent<TableCellSlotProps> = ({
  isHeader = false,
  bgClass = "",
  borderClass = "",
  colspan = 1,
  rowspan = 1,
  width = "auto",
  height = "auto",
  className = "",
  children,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  const cellStyle: React.CSSProperties = {};
  const normalizedWidth = normalizeCssSize(width);
  const normalizedHeight = normalizeCssSize(height);
  if (normalizedWidth && normalizedWidth !== "auto") cellStyle.width = normalizedWidth;
  cellStyle.height = (normalizedHeight && normalizedHeight !== "auto") ? normalizedHeight : "100%";

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn("flex p-1", bgClass, borderClass, className)}
      style={cellStyle}
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
    width: "auto",
    height: "auto",
    className: "",
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
  stickyHeader?: string;
  pinnedLeft?: string;
}

/** colWidths から指定列インデックスまでの累積左オフセットを計算（auto は 0px 扱い） */
function calcPinnedLeft(colMap: number[], colWidths: Record<string, string>, upToLogC: number): number {
  let left = 0;
  for (let i = 0; i < upToLogC; i++) {
    const physC = colMap[i];
    const w = colWidths[String(physC)] || "auto";
    if (w === "auto") {
      left += 0;
    } else {
      const num = parseFloat(w);
      if (!isNaN(num)) left += num;
    }
  }
  return left;
}

export const CraftTable: UserComponent<CraftTableProps> = ({
  tableMeta: tableMetaRaw = JSON.stringify(DEFAULT_TABLE_META),
  width = "auto",
  height = "auto",
  className = "",
  borderColor = "",
  borderWidth = "1",
  stickyHeader = "",
  pinnedLeft = "",
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

  const pinnedLeftNum = parseInt(pinnedLeft || "0") || 0;
  const stickyHeaderNum = parseInt(stickyHeader || "0") || 0;

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

  // Wrapper style: width/height only when not auto
  const wrapperStyle: React.CSSProperties = {};
  const normalizedWidth = normalizeCssSize(width);
  const normalizedHeight = normalizeCssSize(height);
  if (normalizedWidth && normalizedWidth !== "auto") wrapperStyle.width = normalizedWidth;
  if (normalizedHeight && normalizedHeight !== "auto") wrapperStyle.height = normalizedHeight;

  // Compute total column width for table min-width (enables overflow scroll when wrapper is narrower)
  const totalColWidth = colMap.reduce((sum, physC) => {
    const w = colWidths[String(physC)] || "";
    if (!w || w === "auto") return sum;
    const num = parseFloat(w);
    return isNaN(num) ? sum : sum + num;
  }, 0);

  // border-separate + border-spacing:0 is used for sticky column compatibility.
  // Each cell gets right+bottom border; the table itself gets top+left border.
  const borderColorCls = borderColor || "border-border";
  const bwSuffix = borderWidth === "0" ? "-0"
    : borderWidth === "2" ? "-2"
    : borderWidth === "4" ? "-4"
    : "";
  // Cell border: right + bottom only (prevents double borders with border-separate)
  const cellBorderClass = borderWidth === "0"
    ? "border-r-0 border-b-0"
    : cn(`border-r${bwSuffix}`, `border-b${bwSuffix}`, borderColorCls);
  // Table outer border: top + left only
  const tableOuterBorderClass = borderWidth === "0"
    ? ""
    : cn(`border-t${bwSuffix}`, `border-l${bwSuffix}`, borderColorCls);

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
          const rawEffectiveWidth = (cellWidth && cellWidth !== "auto") ? cellWidth
            : (colWidth && colWidth !== "auto") ? colWidth
            : undefined;
          const effectiveWidth = normalizeCssSize(rawEffectiveWidth);
          if (effectiveWidth) cellStyle.width = effectiveWidth;
          const normalizedCellHeight = normalizeCssSize(cellHeight);
          if (normalizedCellHeight && normalizedCellHeight !== "auto" && normalizedCellHeight !== "100%") {
            cellStyle.height = normalizedCellHeight;
          } else {
            // td/th に height を設定しないと内側の div で height:100% が効かないため 1px トリックを適用
            // auto / 100% どちらも内側 div を伸ばす意図なので同様に扱う
            cellStyle.height = "1px";
          }

          // rowspan セルも同様
          if (rowspan > 1) cellStyle.height = "1px";

          const CellTag = isHeader ? "th" : "td";
          return (
            <CellTag
              key={physC}
              colSpan={colspan > 1 ? colspan : undefined}
              rowSpan={rowspan > 1 ? rowspan : undefined}
              style={Object.keys(cellStyle).length > 0 ? cellStyle : undefined}
              className={cn(cellBorderClass, "p-0 align-top text-left font-normal")}
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

  const hasWidth = Object.keys(wrapperStyle).length > 0;
  // auto時: table に width: "100%" を付けない（各列のcol幅に追従させる）
  // wrapper指定時: wrapper の幅に table が追従するよう width: "100%" を維持
  const tableWidth = hasWidth ? "100%" : undefined;
  return (
    <div
      className={cn(hasWidth ? "block" : "inline-block", "overflow-auto", className)}
      style={hasWidth ? wrapperStyle : undefined}
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
      <table
        className={cn("caption-bottom text-sm border-separate", tableOuterBorderClass)}
        style={{ tableLayout: "fixed", borderSpacing: 0, width: tableWidth, minWidth: totalColWidth > 0 ? `${totalColWidth}px` : undefined }}
      >
        <colgroup>
          {colMap.map((physC) => {
            const w = colWidths[String(physC)];
            const normalized = normalizeCssSize(w || undefined);
            return <col key={physC} style={normalized && normalized !== "auto" ? { width: normalized } : undefined} />;
          })}
        </colgroup>
        {headerRowCount > 0 && (
          <thead className="bg-muted/50">
            {headerRows.map((_, logR) => renderRow(logR))}
          </thead>
        )}
        {bodyRows.length > 0 && (
          <tbody>
            {bodyRows.map((_, idx) => {
              const logR = headerRowCount + idx;
              return renderRow(logR);
            })}
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
    stickyHeader: "",
    pinnedLeft: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
};
