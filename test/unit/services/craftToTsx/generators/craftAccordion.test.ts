import { describe, it, expect } from "vitest";
import { craftStateToTsx } from "../../../../../src/services/craftToTsx.js";

describe("craftStateToTsx - CraftAccordion", () => {
  const makeState = (nodeProps: Record<string, unknown>) => ({
    ROOT: {
      type: { resolvedName: "CraftContainer" },
      props: { className: "" },
      nodes: ["node1"],
      linkedNodes: {},
      parent: null,
      isCanvas: true,
    },
    node1: {
      type: { resolvedName: "CraftAccordion" },
      props: nodeProps,
      nodes: [],
      linkedNodes: {},
      parent: "ROOT",
      isCanvas: false,
    },
  });

  it("デフォルトアイテム分割で3つのアイテムが出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ items: "Item 1,Item 2,Item 3" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Accordion");
    expect(tsxSource).toContain("<AccordionItem");
    expect(tsxSource).toContain("<AccordionTrigger>Item 1</AccordionTrigger>");
    expect(tsxSource).toContain("<AccordionTrigger>Item 2</AccordionTrigger>");
    expect(tsxSource).toContain("<AccordionTrigger>Item 3</AccordionTrigger>");
    expect(tsxSource).toContain("Item 1 content");
    expect(tsxSource).toContain("Item 2 content");
  });

  it("type=single の場合に collapsible 属性が出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ items: "A,B", type: "single" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("collapsible");
  });

  it("type=multiple の場合に collapsible 属性が出力されない", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ items: "A,B", type: "multiple" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('type="multiple"');
    expect(tsxSource).not.toContain("collapsible");
  });

  it("linkedMocPaths がコメントとして出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ items: "X,Y", linkedMocPaths: "pages/x.moc,pages/y.moc" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("{/* linked: pages/x.moc */}");
    expect(tsxSource).toContain("{/* linked: pages/y.moc */}");
  });

  it("linkedMocPaths が不足している場合はデフォルトコンテンツが出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ items: "X,Y", linkedMocPaths: "pages/x.moc" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("{/* linked: pages/x.moc */}");
    expect(tsxSource).toContain("Y content");
  });

  it("AccordionItem の value 属性が連番で出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ items: "A,B,C" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('value="item-1"');
    expect(tsxSource).toContain('value="item-2"');
    expect(tsxSource).toContain('value="item-3"');
  });

  it("import にサブコンポーネントが含まれる", () => {
    const { imports } = craftStateToTsx(
      makeState({ items: "A" }) as never,
      "TestPage",
    );
    expect(imports).toContain("Accordion");
    expect(imports).toContain("AccordionItem");
    expect(imports).toContain("AccordionTrigger");
    expect(imports).toContain("AccordionContent");
  });

  it("className が出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ items: "A", className: "w-full" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('className="w-full"');
  });
});
