import { useState } from "react";
import { useEditor } from "@craftjs/core";
import type { TableMeta } from "../../crafts/shadcn/CraftTable";

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

function parseTableMeta(raw: string): TableMeta {
  try {
    const parsed = JSON.parse(raw);
    return {
      rowMap: Array.isArray(parsed.rowMap) ? parsed.rowMap : [0, 1, 2],
      colMap: Array.isArray(parsed.colMap) ? parsed.colMap : [0, 1, 2],
      nextKey: typeof parsed.nextKey === "number" ? parsed.nextKey : 3,
      colWidths: typeof parsed.colWidths === "object" && parsed.colWidths !== null ? parsed.colWidths : { "0": "auto", "1": "auto", "2": "auto" },
    };
  } catch {
    return { rowMap: [0, 1, 2], colMap: [0, 1, 2], nextKey: 3, colWidths: { "0": "auto", "1": "auto", "2": "auto" } };
  }
}

function addRow(meta: TableMeta, atIndex: number): TableMeta {
  const newKey = meta.nextKey;
  const newRowMap = [
    ...meta.rowMap.slice(0, atIndex),
    newKey,
    ...meta.rowMap.slice(atIndex),
  ];
  return { ...meta, rowMap: newRowMap, nextKey: newKey + 1 };
}

function removeRow(meta: TableMeta, atIndex: number): TableMeta {
  if (meta.rowMap.length <= 1) return meta;
  const newRowMap = meta.rowMap.filter((_, i) => i !== atIndex);
  return { ...meta, rowMap: newRowMap };
}

function addCol(meta: TableMeta, atIndex: number): TableMeta {
  const newKey = meta.nextKey;
  const newColMap = [
    ...meta.colMap.slice(0, atIndex),
    newKey,
    ...meta.colMap.slice(atIndex),
  ];
  const newColWidths = { ...meta.colWidths, [String(newKey)]: "auto" };
  return { ...meta, colMap: newColMap, colWidths: newColWidths, nextKey: newKey + 1 };
}

function removeCol(meta: TableMeta, atIndex: number): TableMeta {
  if (meta.colMap.length <= 1) return meta;
  const removedKey = meta.colMap[atIndex];
  const newColMap = meta.colMap.filter((_, i) => i !== atIndex);
  const newColWidths = { ...meta.colWidths };
  delete newColWidths[String(removedKey)];
  return { ...meta, colMap: newColMap, colWidths: newColWidths };
}

function setColWidth(meta: TableMeta, physCol: number, width: string): TableMeta {
  return {
    ...meta,
    colWidths: { ...meta.colWidths, [String(physCol)]: width },
  };
}

interface TableMetaEditorProps {
  value: string;
  selectedNodeId: string;
}

export function TableMetaEditor({ value, selectedNodeId }: TableMetaEditorProps) {
  const { actions, nodes } = useEditor((state) => ({ nodes: state.nodes }));

  function updateProp(key: string, value: string) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props[key] = value;
    });
  }
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);

  const meta = parseTableMeta(value);
  const { rowMap, colMap, colWidths } = meta;

  function updateMeta(newMeta: TableMeta) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.tableMeta = JSON.stringify(newMeta);
    });
  }

  // Get the linked nodes for the CraftTable node
  const tableNode = nodes[selectedNodeId];
  const linkedNodes = tableNode?.data?.linkedNodes || {};

  function getSlotNodeId(physR: number, physC: number): string | undefined {
    return linkedNodes[`cell_${physR}_${physC}`];
  }

  function getSlotProps(physR: number, physC: number): Record<string, unknown> {
    const slotId = getSlotNodeId(physR, physC);
    if (!slotId) return {};
    return nodes[slotId]?.data?.props || {};
  }

  // Compute hidden cells
  const hiddenCells = new Set<string>();
  for (let logR = 0; logR < rowMap.length; logR++) {
    for (let logC = 0; logC < colMap.length; logC++) {
      const physR = rowMap[logR];
      const physC = colMap[logC];
      if (hiddenCells.has(`${logR}_${logC}`)) continue;
      const props = getSlotProps(physR, physC);
      const colspan = (props.colspan as number) || 1;
      const rowspan = (props.rowspan as number) || 1;
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

  function toggleCell(logR: number, logC: number) {
    setSelectedCells((prev) => {
      const key = `${logR}_${logC}`;
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSelectedRow(null);
    setSelectedCol(null);
  }

  function selectRow(logR: number) {
    setSelectedRow(logR === selectedRow ? null : logR);
    setSelectedCol(null);
    setSelectedCells(new Set());
  }

  function selectCol(logC: number) {
    setSelectedCol(logC === selectedCol ? null : logC);
    setSelectedRow(null);
    setSelectedCells(new Set());
  }

  // Merge selected cells
  function mergeSelected() {
    if (selectedCells.size < 2) return;
    const coords = Array.from(selectedCells).map((k) => {
      const [r, c] = k.split("_").map(Number);
      return { r, c };
    });
    const minR = Math.min(...coords.map((c) => c.r));
    const maxR = Math.max(...coords.map((c) => c.r));
    const minC = Math.min(...coords.map((c) => c.c));
    const maxC = Math.max(...coords.map((c) => c.c));
    const colspan = maxC - minC + 1;
    const rowspan = maxR - minR + 1;

    // 1. Reset all cells in the bounding box to colspan=1/rowspan=1
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const slotId = getSlotNodeId(rowMap[r], colMap[c]);
        if (slotId) {
          actions.setProp(slotId, (props: Record<string, unknown>) => {
            props.colspan = 1;
            props.rowspan = 1;
          });
        }
      }
    }

    // 2. Set anchor cell's new span
    const anchorSlotId = getSlotNodeId(rowMap[minR], colMap[minC]);
    if (anchorSlotId) {
      actions.setProp(anchorSlotId, (props: Record<string, unknown>) => {
        props.colspan = colspan;
        props.rowspan = rowspan;
      });
    }
    setSelectedCells(new Set());
  }

  // Unmerge selected cells
  function unmergeSelected() {
    for (const key of selectedCells) {
      const [logR, logC] = key.split("_").map(Number);
      const physR = rowMap[logR];
      const physC = colMap[logC];
      const slotId = getSlotNodeId(physR, physC);
      if (slotId) {
        actions.setProp(slotId, (props: Record<string, unknown>) => {
          props.colspan = 1;
          props.rowspan = 1;
        });
      }
    }
    setSelectedCells(new Set());
  }

  const btnClass =
    "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground,#3c3c3c)] px-2 py-0.5 text-[11px] text-[var(--vscode-button-secondaryForeground,#ccc)] hover:opacity-90 disabled:opacity-40";
  const btnDangerClass =
    "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-errorForeground,#f44)] px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">tableMeta</label>

      {/* Visual grid */}
      <div className="overflow-auto">
        <table className="border-collapse text-[10px]" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: 16, minWidth: 16 }} />
              {colMap.map((physC, logC) => (
                <th
                  key={physC}
                  style={{ width: 28, minWidth: 28 }}
                  className={`h-5 cursor-pointer border border-[var(--vscode-input-border,#555)] text-center ${
                    selectedCol === logC
                      ? "bg-[var(--vscode-button-background,#0e639c)] text-white"
                      : "hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
                  }`}
                  onClick={() => selectCol(logC)}
                  title={`Col ${logC}`}
                >
                  {logC}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowMap.map((physR, logR) => (
              <tr key={physR}>
                <td
                  style={{ width: 16, minWidth: 16 }}
                  className={`h-[18px] cursor-pointer border border-[var(--vscode-input-border,#555)] text-center ${
                    selectedRow === logR
                      ? "bg-[var(--vscode-button-background,#0e639c)] text-white"
                      : "hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
                  }`}
                  onClick={() => selectRow(logR)}
                  title={`Row ${logR}`}
                >
                  {logR}
                </td>
                {colMap.map((physC, logC) => {
                  if (hiddenCells.has(`${logR}_${logC}`)) return null;
                  const cellKey = `${logR}_${logC}`;
                  const isSelected = selectedCells.has(cellKey);
                  const slotProps = getSlotProps(physR, physC);
                  const isHeader = !!(slotProps.isHeader);
                  const colspan = (slotProps.colspan as number) || 1;
                  const rowspan = (slotProps.rowspan as number) || 1;
                  const isMerged = colspan > 1 || rowspan > 1;
                  return (
                    <td
                      key={physC}
                      colSpan={colspan > 1 ? colspan : undefined}
                      rowSpan={rowspan > 1 ? rowspan : undefined}
                      style={{ width: 28 * colspan, minWidth: 28 * colspan }}
                      className={`cursor-pointer border border-[var(--vscode-input-border,#555)] text-center transition-colors ${
                        isSelected
                          ? "ring-2 ring-inset ring-[var(--vscode-focusBorder,#007fd4)]"
                          : isMerged
                          ? "bg-[var(--vscode-button-background,#0e639c)] opacity-50"
                          : isHeader
                          ? "bg-[var(--vscode-toolbar-hoverBackground,#333)]"
                          : "hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
                      }`}
                      onClick={() => toggleCell(logR, logC)}
                      title={isMerged ? `cell_${physR}_${physC} (${colspan}x${rowspan})` : `cell_${physR}_${physC}`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row operations */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--vscode-descriptionForeground,#888)]">行操作</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={btnClass}
            onClick={() => {
              const at = selectedRow !== null ? selectedRow : 0;
              updateMeta(addRow(meta, at));
            }}
            title="選択行の前に行を挿入"
          >
            ↑ 前に挿入
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => {
              const at = selectedRow !== null ? selectedRow + 1 : rowMap.length;
              updateMeta(addRow(meta, at));
            }}
            title="選択行の後ろに行を挿入"
          >
            ↓ 後ろに挿入
          </button>
          <button
            type="button"
            className={btnDangerClass}
            disabled={selectedRow === null || rowMap.length <= 1}
            onClick={() => {
              if (selectedRow !== null) {
                updateMeta(removeRow(meta, selectedRow));
                setSelectedRow(null);
              }
            }}
            title="選択行を削除"
          >
            ✕ 削除
          </button>
        </div>
      </div>

      {/* Column operations */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--vscode-descriptionForeground,#888)]">列操作</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={btnClass}
            onClick={() => {
              const at = selectedCol !== null ? selectedCol : 0;
              updateMeta(addCol(meta, at));
            }}
            title="選択列の前に列を挿入"
          >
            ← 前に挿入
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => {
              const at = selectedCol !== null ? selectedCol + 1 : colMap.length;
              updateMeta(addCol(meta, at));
            }}
            title="選択列の後ろに列を挿入"
          >
            → 後ろに挿入
          </button>
          <button
            type="button"
            className={btnDangerClass}
            disabled={selectedCol === null || colMap.length <= 1}
            onClick={() => {
              if (selectedCol !== null) {
                updateMeta(removeCol(meta, selectedCol));
                setSelectedCol(null);
              }
            }}
            title="選択列を削除"
          >
            ✕ 削除
          </button>
        </div>
      </div>

      {/* Merge/Unmerge — always visible, disabled when nothing selected */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--vscode-descriptionForeground,#888)]">
          セルマージ{selectedCells.size > 0 ? ` (${selectedCells.size}セル選択中)` : ""}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className={btnClass}
            disabled={selectedCells.size < 2}
            onClick={mergeSelected}
          >
            Merge
          </button>
          <button
            type="button"
            className={btnClass}
            disabled={selectedCells.size === 0}
            onClick={unmergeSelected}
          >
            Unmerge
          </button>
        </div>
      </div>

      {/* Scroll lock settings */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--vscode-descriptionForeground,#888)]">スクロール固定</span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--vscode-foreground,#ccc)]">ヘッダー固定行数</span>
          <input
            type="text"
            value={String(tableNode?.data?.props?.stickyHeader ?? "")}
            onChange={(e) => updateProp("stickyHeader", e.target.value)}
            className={`${INPUT_CLASS} w-full`}
            placeholder="例: 1"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--vscode-foreground,#ccc)]">左固定列数</span>
          <input
            type="text"
            value={String(tableNode?.data?.props?.pinnedLeft ?? "")}
            onChange={(e) => updateProp("pinnedLeft", e.target.value)}
            className={`${INPUT_CLASS} w-full`}
            placeholder="例: 1"
          />
        </div>
      </div>

      {/* Column widths */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--vscode-descriptionForeground,#888)]">列幅</span>
        <div className="flex flex-col gap-1">
          {colMap.map((physC, logC) => (
            <div key={physC} className="flex items-center gap-1">
              <span className="w-8 text-[10px] text-[var(--vscode-foreground,#ccc)]">Col {logC}</span>
              <input
                type="text"
                value={colWidths[String(physC)] ?? ""}
                onChange={(e) => updateMeta(setColWidth(meta, physC, e.target.value))}
                className={`${INPUT_CLASS} flex-1`}
                placeholder="auto"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
