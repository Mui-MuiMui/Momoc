import { describe, it, expect } from "vitest";
import { craftStateToTsx } from "../../../../../src/services/craftToTsx.js";

describe("craftStateToTsx - CraftCard", () => {
  const makeState = (
    nodeProps: Record<string, unknown>,
    extra?: Record<string, unknown>,
    children?: Record<string, unknown>,
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
      type: { resolvedName: "CraftCard" },
      props: nodeProps,
      nodes: [],
      linkedNodes: {},
      parent: "ROOT",
      isCanvas: true,
      ...extra,
    },
    ...children,
  });

  it("タイトルのみ出力", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ title: "My Card" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Card");
    expect(tsxSource).toContain("My Card");
    expect(tsxSource).toContain('<h3 className="text-lg font-semibold whitespace-pre-line">');
  });

  it("タイトルと説明文が出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ title: "Title", description: "Some description" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("Title");
    expect(tsxSource).toContain("Some description");
    expect(tsxSource).toContain('<p className="text-sm text-muted-foreground whitespace-pre-line">');
  });

  it("linkedMocPath がコメントとして出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ title: "Card", linkedMocPath: "pages/detail.moc" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("{/* linked: pages/detail.moc */}");
  });

  it("子ノードがカード本体に出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState(
        { title: "Card" },
        { nodes: ["child1"] },
        {
          child1: {
            type: { resolvedName: "CraftButton" },
            props: { text: "Action" },
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
    expect(tsxSource).toContain("Action");
  });

  it("空カード（タイトルなし・子なし）は自己閉じタグ", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ title: "" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Card");
    expect(tsxSource).toContain("/>");
  });

  it("className が出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ title: "C", className: "bg-red-500" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('className="bg-red-500"');
  });

  it("import に Card が含まれる", () => {
    const { imports } = craftStateToTsx(
      makeState({ title: "C" }) as never,
      "TestPage",
    );
    expect(imports).toContain("Card");
    expect(imports).toContain("@/components/ui/card");
  });
});
