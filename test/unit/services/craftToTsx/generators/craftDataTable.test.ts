import { describe, it, expect } from "vitest";
import { craftStateToTsx } from "../../../../../src/services/craftToTsx.js";

describe("craftStateToTsx - CraftDataTable", () => {
  const makeState = (
    nodeProps: Record<string, unknown>,
    extra?: Record<string, unknown>,
    additionalNodes?: Record<string, unknown>,
  ) => ({
    ROOT: {
      type: { resolvedName: "CraftContainer" },
      props: { className: "" },
      nodes: ["node1"],
      linkedNodes: {},
      parent: null,
      isCanvas: true,
    },
    node1: {
      type: { resolvedName: "CraftDataTable" },
      props: nodeProps,
      nodes: [],
      linkedNodes: {},
      parent: "ROOT",
      isCanvas: false,
      ...extra,
    },
    ...additionalNodes,
  });

  it("columnDefs から columns が出力される", () => {
    const columnDefs = JSON.stringify([
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
    ]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<DataTable");
    expect(tsxSource).toContain('accessorKey: "name"');
    expect(tsxSource).toContain('header: "Name"');
    expect(tsxSource).toContain('accessorKey: "email"');
    expect(tsxSource).toContain('header: "Email"');
  });

  it("csvData から data が出力される", () => {
    const columnDefs = JSON.stringify([
      { key: "name", label: "Name" },
    ]);
    const csvData = "name\nAlice\nBob";
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs, csvData }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('name: "Alice"');
    expect(tsxSource).toContain('name: "Bob"');
  });

  it("sortable カラムで enableSorting が出力される", () => {
    const columnDefs = JSON.stringify([
      { key: "name", label: "Name", sortable: true },
    ]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("enableSorting: true");
  });

  it("カラム幅が size として出力される", () => {
    const columnDefs = JSON.stringify([
      { key: "name", label: "Name", width: "200" },
    ]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("size: 200");
  });

  it("actions カラムでアクションボタンが出力される", () => {
    const columnDefs = JSON.stringify([
      {
        key: "actions",
        type: "actions",
        actionButtons: [{ label: "Edit", className: "text-blue-500" }],
      },
    ]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("Edit");
    expect(tsxSource).toContain("text-blue-500");
  });

  it("actions カラムのデフォルトボタン（actionButtons なし）", () => {
    const columnDefs = JSON.stringify([
      { key: "actions", type: "actions" },
    ]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("···");
  });

  it("pagination が有効な場合に pageable が出力される", () => {
    const columnDefs = JSON.stringify([{ key: "name", label: "Name" }]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs, pageable: true, pageSize: "20" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("pageable");
    expect(tsxSource).toContain("pageSize={20}");
  });

  it("filterType が出力される", () => {
    const columnDefs = JSON.stringify([{ key: "name", label: "Name" }]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs, filterType: "global" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('filterType="global"');
  });

  it("selectable が出力される", () => {
    const columnDefs = JSON.stringify([{ key: "name", label: "Name" }]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs, selectable: true }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("selectable");
  });

  it("columnToggle が出力される", () => {
    const columnDefs = JSON.stringify([{ key: "name", label: "Name" }]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs, columnToggle: true }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("columnToggle");
  });

  it("stickyHeader が出力される", () => {
    const columnDefs = JSON.stringify([{ key: "name", label: "Name" }]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs, stickyHeader: true }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("stickyHeader");
  });

  it("pinnedLeft が出力される", () => {
    const columnDefs = JSON.stringify([{ key: "name", label: "Name" }]);
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs, pinnedLeft: "2" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("pinnedLeft={2}");
  });

  it("スタイリング props が出力される", () => {
    const columnDefs = JSON.stringify([{ key: "name", label: "Name" }]);
    const { tsxSource } = craftStateToTsx(
      makeState({
        columnDefs,
        headerBgClass: "bg-gray-100",
        hoverRowClass: "hover:bg-gray-50",
      }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('headerBgClass="bg-gray-100"');
    expect(tsxSource).toContain('hoverRowClass="hover:bg-gray-50"');
  });

  it("slot カラムで linkedNodes の子ノードが出力される", () => {
    const columnDefs = JSON.stringify([
      { key: "custom", label: "Custom", type: "slot" },
    ]);
    const { tsxSource } = craftStateToTsx(
      makeState(
        { columnDefs },
        {
          linkedNodes: { dt_slot_custom: "slotNode" },
        },
        {
          slotNode: {
            type: { resolvedName: "DataTableSlot" },
            props: {},
            nodes: ["slotChild"],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          slotChild: {
            type: { resolvedName: "CraftButton" },
            props: { text: "SlotBtn" },
            nodes: [],
            linkedNodes: {},
            parent: "slotNode",
            isCanvas: false,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("SlotBtn");
  });

  it("import に DataTable が含まれる", () => {
    const columnDefs = JSON.stringify([{ key: "name", label: "Name" }]);
    const { imports } = craftStateToTsx(
      makeState({ columnDefs }) as never,
      "TestPage",
    );
    expect(imports).toContain("DataTable");
    expect(imports).toContain("@/components/ui/data-table");
  });

  it("不正な columnDefs JSON でもデフォルトカラムが使われクラッシュしない", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ columnDefs: "invalid json" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<DataTable");
    expect(tsxSource).toContain('accessorKey: "name"');
  });
});
