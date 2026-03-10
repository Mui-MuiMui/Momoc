/**
 * CraftDataTable / DataTableSlot generators
 */

import { registerGenerator } from "../registry.js";
import type { CraftNodeData, RenderContext } from "../types.js";

// ---------------------------------------------------------------------------
// DataTableSlot — simple container
// ---------------------------------------------------------------------------

registerGenerator("DataTableSlot", {
  mapping: { tag: "div", propsMap: [], isContainer: true },
});

// ---------------------------------------------------------------------------
// CraftDataTable — full DataTable rendering
// ---------------------------------------------------------------------------

registerGenerator("CraftDataTable", {
  mapping: {
    tag: "div",
    propsMap: ["className"],
    isContainer: false,
  },
  defaultProps: {
    filterType: "none", pageable: false, pageSize: "10", selectable: false, columnToggle: false, stickyHeader: false, pinnedLeft: "0",
    headerBgClass: "", hoverRowClass: "", selectedRowClass: "", headerTextClass: "", headerHoverTextClass: "", headerBorderClass: "", tableBorderClass: "",
  },
  collectImports: (node: CraftNodeData, ctx: RenderContext): "stop" => {
    ctx.addImport("@/components/ui/data-table", "DataTable");

    // Traverse linkedNodes so child imports are collected
    for (const linkedId of Object.values(node.linkedNodes || {})) {
      const slotNode = ctx.craftState[linkedId];
      if (!slotNode) continue;
      for (const childId of slotNode.nodes || []) {
        ctx.collectChildImports(childId);
      }
    }

    return "stop";
  },
  render: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext): string => {
    const pad = "  ".repeat(indent);
    const mocComments = ctx.buildMocComments(nodeId, pad, node.props);

    // Parse column defs
    let cols: Array<{ key: string; label?: string; type?: string; sortable?: boolean; width?: string; actionButtons?: Array<{ label?: string; className?: string }> }> = [];
    try {
      const rawDefs = (node.props?.columnDefs as string) || "";
      const parsed = JSON.parse(rawDefs);
      if (Array.isArray(parsed)) cols = parsed;
    } catch {
      cols = [
        { key: "name", label: "Name", sortable: true },
        { key: "status", label: "Status", sortable: true },
        { key: "email", label: "Email" },
        { key: "actions", type: "actions" },
      ];
    }

    // Parse CSV data
    let dataRows: Array<Record<string, string>> = [];
    try {
      const rawCsv = (node.props?.csvData as string) || "";
      const csvLines = rawCsv.trim().split("\n");
      if (csvLines.length >= 2) {
        const headers = csvLines[0].split(",").map((h) => h.trim());
        dataRows = csvLines.slice(1).map((line) => {
          const vals = line.split(",").map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
          return row;
        });
      }
    } catch {
      // leave empty
    }

    const className = (node.props?.className as string) || "";
    const styleAttr = ctx.buildStyleAttr(node.props);
    const classNameAttr = className ? ` className="${ctx.escapeAttr(className)}"` : "";

    const filterType = (node.props?.filterType as string) || "none";
    const pageable = !!(node.props?.pageable);
    const pageSize = parseInt((node.props?.pageSize as string) || "10") || 10;
    const selectable = !!(node.props?.selectable);
    const columnToggle = !!(node.props?.columnToggle);
    const stickyHeader = !!(node.props?.stickyHeader);
    const pinnedLeft = parseInt((node.props?.pinnedLeft as string) || "0") || 0;

    const lines: string[] = [];

    // Generate columns array inline
    const colItems: string[] = [];
    for (const col of cols) {
      if (col.type === "actions") {
        let buttonsJsx: string;
        const actionButtons = col.actionButtons;
        if (actionButtons && actionButtons.length > 0) {
          const btns = actionButtons.map((btn) => {
            const btnClassName = `inline-flex items-center rounded px-2 py-1 text-xs${btn.className ? ` ${btn.className}` : " hover:bg-accent"}`;
            return `<button type="button" className="${ctx.escapeAttr(btnClassName)}">${ctx.escapeJsString(btn.label || "···")}</button>`;
          });
          buttonsJsx = `<div className="flex items-center gap-1">${btns.join("")}</div>`;
        } else {
          buttonsJsx = `<button type="button" className="h-8 w-8 rounded-md hover:bg-accent">···</button>`;
        }
        colItems.push(
          `{ id: "${ctx.escapeJsString(col.key)}", header: "${ctx.escapeJsString(col.label ?? "")}", cell: () => ${buttonsJsx} }`,
        );
      } else if (col.type === "slot") {
        // Resolve slot children from linkedNodes
        const slotNodeId = node.linkedNodes?.[`dt_slot_${col.key}`];
        const slotNode = slotNodeId ? ctx.craftState[slotNodeId] : null;
        const slotChildren = (slotNode?.nodes || []).map((childId) => ctx.renderNode(childId, 0)).filter(Boolean);
        const slotContent = slotChildren.length > 0
          ? slotChildren.join(" ")
          : `{/* slot: ${ctx.escapeJsString(col.key)} */}`;
        colItems.push(
          `{ id: "${ctx.escapeJsString(col.key)}", header: "${ctx.escapeJsString(col.label ?? col.key)}", cell: () => <div className="min-h-[32px] flex items-center">${slotContent}</div> }`,
        );
      } else {
        const parts: string[] = [`accessorKey: "${ctx.escapeJsString(col.key)}"`, `header: "${ctx.escapeJsString(col.label ?? col.key)}"`];
        if (col.sortable) parts.push("enableSorting: true");
        if (col.width) {
          const numVal = parseInt(String(col.width));
          if (!isNaN(numVal) && !String(col.width).includes("%")) {
            parts.push(`size: ${numVal}`);
          }
        }
        colItems.push(`{ ${parts.join(", ")} }`);
      }
    }

    // Build prop attributes for DataTable
    const dtProps: string[] = [];
    dtProps.push(`columns={[${colItems.join(", ")}]}`);
    dtProps.push(`data={[${dataRows.map((row) => `{ ${Object.entries(row).map(([k, v]) => `${k}: "${ctx.escapeJsString(v)}"`).join(", ")} }`).join(", ")}]}`);
    if (filterType !== "none") dtProps.push(`filterType="${filterType}"`);
    if (pageable) dtProps.push("pageable");
    if (pageable && pageSize !== 10) dtProps.push(`pageSize={${pageSize}}`);
    if (selectable) dtProps.push("selectable");
    if (columnToggle) dtProps.push("columnToggle");
    if (stickyHeader) dtProps.push("stickyHeader");
    if (pinnedLeft > 0) dtProps.push(`pinnedLeft={${pinnedLeft}}`);

    const headerBgClass = (node.props?.headerBgClass as string) || "";
    const hoverRowClass = (node.props?.hoverRowClass as string) || "";
    const selectedRowClass = (node.props?.selectedRowClass as string) || "";
    const headerTextClass = (node.props?.headerTextClass as string) || "";
    const headerHoverTextClass = (node.props?.headerHoverTextClass as string) || "";
    const headerBorderClass = (node.props?.headerBorderClass as string) || "";
    const tableBorderClass = (node.props?.tableBorderClass as string) || "";
    const sortIconClass = (node.props?.sortIconClass as string) || "";
    const filterIconClass = (node.props?.filterIconClass as string) || "";
    if (headerBgClass) dtProps.push(`headerBgClass="${ctx.escapeAttr(headerBgClass)}"`);
    if (hoverRowClass) dtProps.push(`hoverRowClass="${ctx.escapeAttr(hoverRowClass)}"`);
    if (selectedRowClass) dtProps.push(`selectedRowClass="${ctx.escapeAttr(selectedRowClass)}"`);
    if (headerTextClass) dtProps.push(`headerTextClass="${ctx.escapeAttr(headerTextClass)}"`);
    if (headerHoverTextClass) dtProps.push(`headerHoverTextClass="${ctx.escapeAttr(headerHoverTextClass)}"`);
    if (headerBorderClass) dtProps.push(`headerBorderClass="${ctx.escapeAttr(headerBorderClass)}"`);
    if (tableBorderClass) dtProps.push(`tableBorderClass="${ctx.escapeAttr(tableBorderClass)}"`);
    if (sortIconClass) dtProps.push(`sortIconClass="${ctx.escapeAttr(sortIconClass)}"`);
    if (filterIconClass) dtProps.push(`filterIconClass="${ctx.escapeAttr(filterIconClass)}"`);
    const nodeWidth = (node.props?.width as string) || "";
    const nodeHeight = (node.props?.height as string) || "";
    if (nodeWidth && nodeWidth !== "auto") dtProps.push(`width="${ctx.escapeAttr(nodeWidth)}"`);
    if (nodeHeight && nodeHeight !== "auto") dtProps.push(`height="${ctx.escapeAttr(nodeHeight)}"`);

    lines.push(`${pad}<DataTable`);
    for (const p of dtProps) {
      lines.push(`${pad}  ${p}`);
    }
    if (className) lines.push(`${pad}  ${classNameAttr.trim()}`);
    if (styleAttr) lines.push(`${pad}  ${styleAttr.trim()}`);
    lines.push(`${pad}/>`);

    return `${mocComments}\n${lines.join("\n")}`;
  },
});
