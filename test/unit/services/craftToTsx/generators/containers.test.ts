import { describe, it, expect } from "vitest";
import { craftStateToTsx } from "../../../../../src/services/craftToTsx.js";

describe("craftStateToTsx - CraftContainer", () => {
  const makeContainerState = (
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
      type: { resolvedName: "CraftContainer" },
      props: nodeProps,
      nodes: [],
      linkedNodes: {},
      parent: "ROOT",
      isCanvas: true,
      ...extra,
    },
    ...additionalNodes,
  });

  it("デフォルト flex column レイアウトが出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeContainerState({ className: "" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("flex");
    expect(tsxSource).toContain("flex-col");
    expect(tsxSource).toContain("gap-4");
  });

  it("flex row レイアウトが出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeContainerState({ className: "", display: "flex", flexDirection: "row" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("flex-row");
  });

  it("grid レイアウトが出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeContainerState({ className: "", display: "grid", gridCols: 4 }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("grid");
    expect(tsxSource).toContain("grid-cols-4");
  });

  it("gap=0 では内側コンテナに gap クラスが出力されない", () => {
    const { tsxSource } = craftStateToTsx(
      makeContainerState({ className: "", gap: "0" }) as never,
      "TestPage",
    );
    // node1 の出力行を抽出して gap- が含まれないことを確認
    const node1Line = tsxSource.split("\n").find((l: string) => l.includes("@moc-node node1"));
    expect(node1Line).toBeDefined();
    // node1 直後の div にはgapがないことを確認
    const lines = tsxSource.split("\n");
    const node1Idx = lines.findIndex((l: string) => l.includes("@moc-node node1"));
    const node1Div = lines[node1Idx + 1];
    expect(node1Div).not.toContain("gap-");
  });

  it("linkedMocPath がコメントとして出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeContainerState({ className: "", linkedMocPath: "pages/sub.moc" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("{/* linked: pages/sub.moc */}");
  });

  it("子ノードが出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeContainerState(
        { className: "" },
        { nodes: ["child1"] },
        {
          child1: {
            type: { resolvedName: "CraftButton" },
            props: { text: "Go" },
            nodes: [],
            linkedNodes: {},
            parent: "node1",
            isCanvas: false,
          },
        },
      ) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Button");
    expect(tsxSource).toContain("Go");
  });

  it("空コンテナは自己閉じタグ", () => {
    const { tsxSource } = craftStateToTsx(
      makeContainerState({ className: "" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<div");
    // 内側のコンテナが自己閉じであることを確認（子ノードなし）
    expect(tsxSource).toContain("/>");
  });

  it("userClassName が containerClass とマージされる", () => {
    const { tsxSource } = craftStateToTsx(
      makeContainerState({ className: "p-4 items-center" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("items-center");
    expect(tsxSource).toContain("p-4");
    expect(tsxSource).toContain("flex");
  });
});

describe("craftStateToTsx - CraftFreeCanvas", () => {
  it("relative クラスが出力される", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftContainer" },
        props: { className: "" },
        nodes: ["fc1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
      },
      fc1: {
        type: { resolvedName: "CraftFreeCanvas" },
        props: { width: "100%", height: "100vh", className: "" },
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
        isCanvas: true,
      },
    };
    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain('className="relative"');
  });
});

describe("craftStateToTsx - CraftGroup", () => {
  it("relative クラスとサイズが出力される", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftFreeCanvas" },
        props: { width: "100%", height: "100vh", className: "" },
        nodes: ["g1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
      },
      g1: {
        type: { resolvedName: "CraftGroup" },
        props: { width: "300px", height: "200px", className: "" },
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
        isCanvas: true,
      },
    };
    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain('className="relative"');
    expect(tsxSource).toContain('width: "300px"');
    expect(tsxSource).toContain('height: "200px"');
  });
});

describe("craftStateToTsx - CraftDiv", () => {
  it("シンプルな div が出力される", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftContainer" },
        props: { className: "" },
        nodes: ["d1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
      },
      d1: {
        type: { resolvedName: "CraftDiv" },
        props: { className: "my-class" },
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
        isCanvas: true,
      },
    };
    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain('<div');
    expect(tsxSource).toContain('className="my-class"');
  });
});
