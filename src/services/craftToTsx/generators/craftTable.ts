/**
 * CraftTable / TableCellSlot generators
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

// ---------------------------------------------------------------------------
// TableCellSlot — simple container mapped to TableCell
// ---------------------------------------------------------------------------

registerGenerator("TableCellSlot", {
  mapping: { tag: "TableCell", propsMap: [], isContainer: true },
});

// ---------------------------------------------------------------------------
// CraftTable — full table rendering with header/body, sticky, pinned columns
// ---------------------------------------------------------------------------

registerGenerator("CraftTable", {
  mapping: {
    tag: "Table",
    importFrom: "@/components/ui/table",
    importName: "Table",
    propsMap: ["className"],
    isContainer: false,
  },

  collectImports: (node: CraftNodeData, ctx: RenderContext): "stop" => {
    // Always needed sub-components
    ctx.addImport("@/components/ui/table", "TableHeader");
    ctx.addImport("@/components/ui/table", "TableBody");
    ctx.addImport("@/components/ui/table", "TableRow");
    ctx.addImport("@/components/ui/table", "TableHead");
    ctx.addImport("@/components/ui/table", "TableCell");

    // Traverse linkedNodes so child imports are collected
    const linkedNodes = node.linkedNodes || {};
    for (const slotId of Object.values(linkedNodes)) {
      const slotNode = ctx.craftState[slotId];
      if (!slotNode) continue;
      for (const childId of slotNode.nodes || []) {
        ctx.collectChildImports(childId);
      }
    }

    return "stop";
  },

  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext): string => {
    const pad = "  ".repeat(indent);

    // Parse tableMeta
    let rowMap: number[] = [0, 1, 2];
    let colMap: number[] = [0, 1, 2];
    let colWidths: Record<string, string> = {};
    try {
      const meta = JSON.parse((node.props?.tableMeta as string) || "{}");
      if (Array.isArray(meta.rowMap)) rowMap = meta.rowMap;
      if (Array.isArray(meta.colMap)) colMap = meta.colMap;
      if (typeof meta.colWidths === "object" && meta.colWidths !== null) colWidths = meta.colWidths;
    } catch {
      // use defaults
    }

    // Build className and style attributes
    const className = (node.props?.className as string) || "";
    const classNameAttr = className ? ` className="${ctx.escapeAttr(className)}"` : "";
    const styleAttr = ctx.buildStyleAttr(node.props);

    // Compute hidden cells due to colspan/rowspan
    const hiddenCells = new Set<string>();
    for (let logR = 0; logR < rowMap.length; logR++) {
      for (let logC = 0; logC < colMap.length; logC++) {
        const physR = rowMap[logR];
        const physC = colMap[logC];
        const slotId = node.linkedNodes?.[`cell_${physR}_${physC}`];
        if (!slotId || hiddenCells.has(`${logR}_${logC}`)) continue;
        const slotNode = ctx.craftState[slotId];
        const colspan = (slotNode?.props?.colspan as number) || 1;
        const rowspan = (slotNode?.props?.rowspan as number) || 1;
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

    // Determine how many leading rows are all-header (→ <TableHeader>)
    let headerRowCount = 0;
    for (let logR = 0; logR < rowMap.length; logR++) {
      let allHeader = true;
      for (let logC = 0; logC < colMap.length; logC++) {
        if (hiddenCells.has(`${logR}_${logC}`)) continue;
        const physR = rowMap[logR];
        const physC = colMap[logC];
        const slotId = node.linkedNodes?.[`cell_${physR}_${physC}`];
        if (!slotId) { allHeader = false; break; }
        const slotNode = ctx.craftState[slotId];
        if (!slotNode?.props?.isHeader) { allHeader = false; break; }
      }
      if (allHeader) headerRowCount++;
      else break;
    }

    const stickyHeaderNum = parseInt((node.props?.stickyHeader as string) || "0") || 0;
    const pinnedLeftNum = parseInt((node.props?.pinnedLeft as string) || "0") || 0;

    // Compute total column width for minWidth (enables scroll when Table width < total col widths)
    const totalColWidth = colMap.reduce((sum, physC) => {
      const w = colWidths[String(physC)] || "";
      if (!w || w === "auto") return sum;
      const num = parseFloat(w);
      return isNaN(num) ? sum : sum + num;
    }, 0);

    // Compute cumulative left offset for pinned columns
    function calcPinnedLeftOffset(upToLogC: number): number {
      let left = 0;
      for (let i = 0; i < upToLogC; i++) {
        const physC = colMap[i];
        const w = colWidths[String(physC)] || "auto";
        if (w !== "auto") {
          const num = parseFloat(w);
          if (!isNaN(num)) left += num;
        }
      }
      return left;
    }

    const tableBorderWidth = (node.props?.borderWidth as string) || "1";
    const tableBorderColor = (node.props?.borderColor as string) || "";
    const borderColorCls = tableBorderColor || "border-border";
    const bwSuffix = tableBorderWidth === "0" ? "-0"
      : tableBorderWidth === "2" ? "-2"
      : tableBorderWidth === "4" ? "-4"
      : "";
    // border-separate pattern: cell gets right+bottom, table gets top+left outer border
    const tableBorderClass = tableBorderWidth === "0"
      ? "border-r-0 border-b-0"
      : `border-r${bwSuffix} border-b${bwSuffix} ${borderColorCls}`;
    const tableOuterBorderClass = tableBorderWidth === "0"
      ? ""
      : `border-t${bwSuffix} border-l${bwSuffix} ${borderColorCls}`;

    const extraStyles: Record<string, string> = { borderSpacing: "0" };
    if (totalColWidth > 0) extraStyles.minWidth = `${totalColWidth}px`;
    const styleAttrWithMin = ctx.buildStyleAttr(node.props, extraStyles);

    // Combine user className with outer border class (top+left)
    const outerBorderAttr = tableOuterBorderClass
      ? ` className="${ctx.escapeAttr([tableOuterBorderClass, className].filter(Boolean).join(" "))}"`
      : classNameAttr;

    const lines: string[] = [];
    lines.push(`${pad}<Table${outerBorderAttr}${styleAttrWithMin}>`);

    function renderRow(logR: number, rowIndent: number, isStickyRow = false): void {
      const rowPad = "  ".repeat(rowIndent);
      const physR = rowMap[logR];
      lines.push(`${rowPad}<TableRow>`);
      for (let logC = 0; logC < colMap.length; logC++) {
        if (hiddenCells.has(`${logR}_${logC}`)) continue;
        const physC = colMap[logC];
        const cellKey = `cell_${physR}_${physC}`;
        const slotId = node.linkedNodes?.[cellKey];
        const slotNode = slotId ? ctx.craftState[slotId] : null;
        const isHeader = !!(slotNode?.props?.isHeader);
        const colspan = (slotNode?.props?.colspan as number) || 1;
        const rowspan = (slotNode?.props?.rowspan as number) || 1;
        const bgClass = (slotNode?.props?.bgClass as string) || "";
        const borderClass = (slotNode?.props?.borderClass as string) || "";
        const cellWidth = (slotNode?.props?.width as string) || "";
        const cellHeight = (slotNode?.props?.height as string) || "";
        const slotClassName = (slotNode?.props?.className as string) || "";
        const colWidth = colWidths[String(physC)] || "";
        const cellTag = isHeader ? "TableHead" : "TableCell";
        const colSpanAttr = colspan > 1 ? ` colSpan={${colspan}}` : "";
        const rowSpanAttr = rowspan > 1 ? ` rowSpan={${rowspan}}` : "";
        // inner div uses flex (flex-row) so items-* controls vertical alignment and justify-* controls horizontal
        // h-full works because td has height:1px (1px trick makes h-full expand to full td height)
        const innerDivCls = ["flex h-full p-1", slotClassName].filter(Boolean).join(" ");
        const isPinned = logC < pinnedLeftNum;
        // bg-background is a fallback for pinned cells only when no bgClass is set (prevents transparent sticky cells)
        const pinnedBg = isPinned && !bgClass ? "bg-background" : "";
        const stickyBg = isStickyRow && !bgClass ? "bg-background" : "";
        const cellCls = [bgClass, borderClass, tableBorderClass, pinnedBg, stickyBg].filter(Boolean).join(" ");
        const classAttr = cellCls ? ` className="${ctx.escapeAttr(cellCls)}"` : "";
        const stylePartsCell: string[] = [];
        const rawEffectiveWidth = (cellWidth && cellWidth !== "auto") ? cellWidth
          : (colWidth && colWidth !== "auto") ? colWidth
          : "";
        const effectiveWidth = ctx.normalizeCssSize(rawEffectiveWidth || undefined) || "";
        if (effectiveWidth) stylePartsCell.push(`width: "${effectiveWidth}"`);
        const normalizedCellHeight = ctx.normalizeCssSize(cellHeight || undefined);
        // 1px trick: td height:1px allows inner div h-full to expand to actual td height
        stylePartsCell.push(`height: "${(normalizedCellHeight && normalizedCellHeight !== "auto") ? normalizedCellHeight : "1px"}"`);
        if (isStickyRow && isPinned) {
          // corner cell: sticky both top and left
          stylePartsCell.push(`position: "sticky"`);
          stylePartsCell.push(`top: 0`);
          stylePartsCell.push(`left: ${calcPinnedLeftOffset(logC)}`);
          stylePartsCell.push(`zIndex: 3`);
        } else if (isStickyRow) {
          stylePartsCell.push(`position: "sticky"`);
          stylePartsCell.push(`top: 0`);
          stylePartsCell.push(`zIndex: 2`);
        } else if (isPinned) {
          stylePartsCell.push(`position: "sticky"`);
          stylePartsCell.push(`left: ${calcPinnedLeftOffset(logC)}`);
          stylePartsCell.push(`zIndex: 1`);
        }
        const cellStyleAttr = stylePartsCell.length > 0 ? ` style={{ ${stylePartsCell.join(", ")} }}` : "";
        const slotChildren = slotNode
          ? (slotNode.nodes || []).map((childId) => ctx.renderNode(childId, rowIndent + 3)).filter(Boolean)
          : [];
        if (slotChildren.length > 0) {
          lines.push(`${rowPad}  <${cellTag}${colSpanAttr}${rowSpanAttr}${classAttr}${cellStyleAttr}>`);
          lines.push(`${rowPad}    <div className="${ctx.escapeAttr(innerDivCls)}">`);
          for (const child of slotChildren) lines.push(child);
          lines.push(`${rowPad}    </div>`);
          lines.push(`${rowPad}  </${cellTag}>`);
        } else {
          lines.push(`${rowPad}  <${cellTag}${colSpanAttr}${rowSpanAttr}${classAttr}${cellStyleAttr} />`);
        }
      }
      lines.push(`${rowPad}</TableRow>`);
    }

    if (headerRowCount > 0) {
      lines.push(`${pad}  <TableHeader>`);
      for (let logR = 0; logR < headerRowCount; logR++) {
        renderRow(logR, indent + 2, logR < stickyHeaderNum);
      }
      lines.push(`${pad}  </TableHeader>`);
    }

    const bodyRowCount = rowMap.length - headerRowCount;
    if (bodyRowCount > 0) {
      lines.push(`${pad}  <TableBody>`);
      for (let logR = headerRowCount; logR < rowMap.length; logR++) {
        renderRow(logR, indent + 2, logR < stickyHeaderNum);
      }
      lines.push(`${pad}  </TableBody>`);
    }

    lines.push(`${pad}</Table>`);
    return lines.join("\n");
  },
});
