import { describe, it, expect } from "vitest";
import { craftStateToTsx } from "../../../../../src/services/craftToTsx.js";

describe("craftStateToTsx - CraftTable", () => {
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
      type: { resolvedName: "CraftTable" },
      props: nodeProps,
      nodes: [],
      linkedNodes: {},
      parent: "ROOT",
      isCanvas: false,
      ...extra,
    },
    ...additionalNodes,
  });

  it("基本的なテーブル構造が出力される", () => {
    const meta = JSON.stringify({
      rowMap: [0, 1],
      colMap: [0, 1],
    });
    const { tsxSource } = craftStateToTsx(
      makeState({ tableMeta: meta }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Table");
    expect(tsxSource).toContain("<TableBody>");
    expect(tsxSource).toContain("<TableRow>");
    expect(tsxSource).toContain("</Table>");
  });

  it("ヘッダー行が TableHeader に出力される", () => {
    const meta = JSON.stringify({
      rowMap: [0, 1],
      colMap: [0, 1],
    });
    const { tsxSource } = craftStateToTsx(
      makeState(
        { tableMeta: meta },
        {
          linkedNodes: {
            cell_0_0: "hdr00",
            cell_0_1: "hdr01",
            cell_1_0: "body10",
            cell_1_1: "body11",
          },
        },
        {
          hdr00: {
            type: { resolvedName: "TableCellSlot" },
            props: { isHeader: true },
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          hdr01: {
            type: { resolvedName: "TableCellSlot" },
            props: { isHeader: true },
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          body10: {
            type: { resolvedName: "TableCellSlot" },
            props: {},
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          body11: {
            type: { resolvedName: "TableCellSlot" },
            props: {},
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<TableHeader>");
    expect(tsxSource).toContain("<TableHead");
    expect(tsxSource).toContain("<TableBody>");
    expect(tsxSource).toContain("<TableCell");
  });

  it("colspan が出力される", () => {
    const meta = JSON.stringify({
      rowMap: [0],
      colMap: [0, 1],
    });
    const { tsxSource } = craftStateToTsx(
      makeState(
        { tableMeta: meta },
        {
          linkedNodes: {
            cell_0_0: "c00",
            cell_0_1: "c01",
          },
        },
        {
          c00: {
            type: { resolvedName: "TableCellSlot" },
            props: { colspan: 2 },
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          c01: {
            type: { resolvedName: "TableCellSlot" },
            props: {},
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("colSpan={2}");
  });

  it("rowspan が出力される", () => {
    const meta = JSON.stringify({
      rowMap: [0, 1],
      colMap: [0],
    });
    const { tsxSource } = craftStateToTsx(
      makeState(
        { tableMeta: meta },
        {
          linkedNodes: {
            cell_0_0: "c00",
            cell_1_0: "c10",
          },
        },
        {
          c00: {
            type: { resolvedName: "TableCellSlot" },
            props: { rowspan: 2 },
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          c10: {
            type: { resolvedName: "TableCellSlot" },
            props: {},
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("rowSpan={2}");
  });

  it("sticky ヘッダーで position sticky が出力される", () => {
    const meta = JSON.stringify({
      rowMap: [0, 1],
      colMap: [0],
    });
    const { tsxSource } = craftStateToTsx(
      makeState(
        { tableMeta: meta, stickyHeader: "1" },
        {
          linkedNodes: {
            cell_0_0: "h00",
            cell_1_0: "b10",
          },
        },
        {
          h00: {
            type: { resolvedName: "TableCellSlot" },
            props: { isHeader: true },
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          b10: {
            type: { resolvedName: "TableCellSlot" },
            props: {},
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('position: "sticky"');
    expect(tsxSource).toContain("top: 0");
    expect(tsxSource).toContain("zIndex: 2");
  });

  it("pinned left カラムで sticky left が出力される", () => {
    const meta = JSON.stringify({
      rowMap: [0],
      colMap: [0, 1],
      colWidths: { "0": "100" },
    });
    const { tsxSource } = craftStateToTsx(
      makeState(
        { tableMeta: meta, pinnedLeft: "1" },
        {
          linkedNodes: {
            cell_0_0: "c00",
            cell_0_1: "c01",
          },
        },
        {
          c00: {
            type: { resolvedName: "TableCellSlot" },
            props: {},
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          c01: {
            type: { resolvedName: "TableCellSlot" },
            props: {},
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('position: "sticky"');
    expect(tsxSource).toContain("left: 0");
    expect(tsxSource).toContain("zIndex: 1");
  });

  it("セル内の子ノードが出力される", () => {
    const meta = JSON.stringify({
      rowMap: [0],
      colMap: [0],
    });
    const { tsxSource } = craftStateToTsx(
      makeState(
        { tableMeta: meta },
        {
          linkedNodes: { cell_0_0: "slot00" },
        },
        {
          slot00: {
            type: { resolvedName: "TableCellSlot" },
            props: {},
            nodes: ["cellChild"],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          cellChild: {
            type: { resolvedName: "CraftButton" },
            props: { text: "Click" },
            nodes: [],
            linkedNodes: {},
            parent: "slot00",
            isCanvas: false,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Button");
    expect(tsxSource).toContain("Click");
  });

  it("import にサブコンポーネントが含まれる", () => {
    const meta = JSON.stringify({ rowMap: [0], colMap: [0] });
    const { imports } = craftStateToTsx(
      makeState({ tableMeta: meta }) as never,
      "TestPage",
    );
    expect(imports).toContain("Table");
    expect(imports).toContain("TableHeader");
    expect(imports).toContain("TableBody");
    expect(imports).toContain("TableRow");
    expect(imports).toContain("TableHead");
    expect(imports).toContain("TableCell");
  });

  it("borderWidth=0 でボーダークラスが border-*-0 になる", () => {
    const meta = JSON.stringify({ rowMap: [0], colMap: [0] });
    const { tsxSource } = craftStateToTsx(
      makeState({ tableMeta: meta, borderWidth: "0" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("border-r-0");
    expect(tsxSource).toContain("border-b-0");
  });
});
