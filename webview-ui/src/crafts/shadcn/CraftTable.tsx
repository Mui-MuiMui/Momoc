import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftTableProps {
  columns: string;
  rows: string;
  hasHeader?: boolean;
  striped?: boolean;
  className?: string;
}

export const CraftTable: UserComponent<CraftTableProps> = ({
  columns = "Name,Email,Role",
  rows = "Alice,alice@example.com,Admin;Bob,bob@example.com,User;Carol,carol@example.com,Editor",
  hasHeader = true,
  striped = false,
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const cols = columns.split(",").map((c) => c.trim());
  const rowData = rows
    .split(";")
    .map((r) => r.split(",").map((c) => c.trim()));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("w-full overflow-auto", className)}
    >
      <table className="w-full caption-bottom text-sm">
        {hasHeader && (
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50">
              {cols.map((col, i) => (
                <th
                  key={i}
                  className="h-10 px-2 text-left align-middle font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="[&_tr:last-child]:border-0">
          {rowData.map((row, ri) => (
            <tr
              key={ri}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                striped && ri % 2 === 1 ? "bg-muted/30" : "",
              )}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="p-2 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

CraftTable.craft = {
  displayName: "Table",
  props: {
    columns: "Name,Email,Role",
    rows: "Alice,alice@example.com,Admin;Bob,bob@example.com,User;Carol,carol@example.com,Editor",
    hasHeader: true,
    striped: false,
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
