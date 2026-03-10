import { describe, it, expect } from "vitest";
import { craftStateToTsx } from "../../../../../src/services/craftToTsx.js";

describe("craftStateToTsx - CraftTabs", () => {
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
      type: { resolvedName: "CraftTabs" },
      props: nodeProps,
      nodes: [],
      linkedNodes: {},
      parent: "ROOT",
      isCanvas: false,
      ...extra,
    },
    ...additionalNodes,
  });

  it("デフォルトタブが3つ出力される", () => {
    const meta = JSON.stringify({
      keys: [0, 1, 2],
      labels: { "0": "Tab 1", "1": "Tab 2", "2": "Tab 3" },
    });
    const { tsxSource } = craftStateToTsx(
      makeState({ tabMeta: meta }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Tabs");
    expect(tsxSource).toContain("<TabsList");
    expect(tsxSource).toContain("<TabsTrigger");
    expect(tsxSource).toContain("Tab 1");
    expect(tsxSource).toContain("Tab 2");
    expect(tsxSource).toContain("Tab 3");
    expect(tsxSource).toContain('defaultValue="tab-0"');
  });

  it("vertical orientation が出力される", () => {
    const meta = JSON.stringify({ keys: [0], labels: { "0": "Tab" } });
    const { tsxSource } = craftStateToTsx(
      makeState({ tabMeta: meta, orientation: "vertical" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('orientation="vertical"');
    expect(tsxSource).toContain("flex flex-row");
  });

  it("horizontal orientation では orientation 属性が出力されない", () => {
    const meta = JSON.stringify({ keys: [0], labels: { "0": "Tab" } });
    const { tsxSource } = craftStateToTsx(
      makeState({ tabMeta: meta, orientation: "horizontal" }) as never,
      "TestPage",
    );
    expect(tsxSource).not.toContain('orientation=');
  });

  it("tabMeta の icons が出力される", () => {
    const meta = JSON.stringify({
      keys: [0],
      labels: { "0": "Files" },
      icons: { "0": "FileIcon" },
    });
    const { tsxSource, imports } = craftStateToTsx(
      makeState({ tabMeta: meta }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('<FileIcon className="h-4 w-4"');
    expect(imports).toContain("FileIcon");
    expect(imports).toContain("lucide-react");
  });

  it("tabMeta の tooltips がツールチップラッパーを生成する", () => {
    const meta = JSON.stringify({
      keys: [0],
      labels: { "0": "Tab" },
      tooltips: { "0": "Hover info" },
    });
    const { tsxSource, imports } = craftStateToTsx(
      makeState({ tabMeta: meta }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<TooltipProvider>");
    expect(tsxSource).toContain("<TooltipTrigger asChild>");
    expect(tsxSource).toContain("Hover info");
    expect(imports).toContain("TooltipProvider");
  });

  it("linkedNodes のスロットコンテンツが TabsContent に出力される", () => {
    const meta = JSON.stringify({
      keys: [0],
      labels: { "0": "Tab 1" },
    });
    const { tsxSource } = craftStateToTsx(
      makeState(
        { tabMeta: meta },
        {
          linkedNodes: { tab_0: "slot0" },
        },
        {
          slot0: {
            type: { resolvedName: "TabContentSlot" },
            props: {},
            nodes: ["slotChild"],
            linkedNodes: {},
            parent: "node1",
            isCanvas: true,
          },
          slotChild: {
            type: { resolvedName: "CraftButton" },
            props: { text: "Inside Tab" },
            nodes: [],
            linkedNodes: {},
            parent: "slot0",
            isCanvas: false,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<TabsContent");
    expect(tsxSource).toContain("Inside Tab");
  });

  it("空のスロットは自己閉じ TabsContent になる", () => {
    const meta = JSON.stringify({
      keys: [0],
      labels: { "0": "Tab 1" },
    });
    const { tsxSource } = craftStateToTsx(
      makeState({ tabMeta: meta }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('<TabsContent value="tab-0"');
    expect(tsxSource).toContain("/>");
  });

  it("import にサブコンポーネントが含まれる", () => {
    const meta = JSON.stringify({ keys: [0], labels: { "0": "T" } });
    const { imports } = craftStateToTsx(
      makeState({ tabMeta: meta }) as never,
      "TestPage",
    );
    expect(imports).toContain("Tabs");
    expect(imports).toContain("TabsList");
    expect(imports).toContain("TabsTrigger");
    expect(imports).toContain("TabsContent");
  });

  it("tabButtonWidth=100% でタブボタンが w-full クラスを持つ", () => {
    const meta = JSON.stringify({ keys: [0], labels: { "0": "Tab" } });
    const { tsxSource } = craftStateToTsx(
      makeState({ tabMeta: meta, tabButtonWidth: "100%" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("w-full");
  });

  it("固定幅 tabButtonWidth で style が出力される", () => {
    const meta = JSON.stringify({ keys: [0], labels: { "0": "Tab" } });
    const { tsxSource } = craftStateToTsx(
      makeState({ tabMeta: meta, tabButtonWidth: "120px" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('width: "120px"');
  });
});
