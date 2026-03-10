import { describe, it, expect } from "vitest";
import { craftStateToTsx } from "../../../../../src/services/craftToTsx.js";

describe("craftStateToTsx - CraftButton", () => {
  const makeState = (
    nodeProps: Record<string, unknown>,
    extra?: Record<string, unknown>,
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
      type: { resolvedName: "CraftButton" },
      props: nodeProps,
      nodes: [],
      linkedNodes: {},
      parent: "ROOT",
      isCanvas: false,
      ...extra,
    },
  });

  it("デフォルトテキスト出力", () => {
    const { tsxSource } = craftStateToTsx(makeState({ text: "Click me" }) as never, "TestPage");
    expect(tsxSource).toContain("<Button");
    expect(tsxSource).toContain("Click me");
  });

  it("variant と size が出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ text: "OK", variant: "destructive", size: "sm" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('variant="destructive"');
    expect(tsxSource).toContain('size="sm"');
  });

  it("デフォルト値の variant/size は省略される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ text: "OK", variant: "default", size: "default" }) as never,
      "TestPage",
    );
    expect(tsxSource).not.toContain("variant=");
    expect(tsxSource).not.toContain("size=");
  });

  it("disabled 属性が出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ text: "Submit", disabled: true }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("disabled");
  });

  it("icon モードでアイコンが子要素に出力される", () => {
    const { tsxSource, imports } = craftStateToTsx(
      makeState({ buttonType: "icon", icon: "Trash2", iconSize: "5" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Trash2");
    expect(tsxSource).toContain('className="h-5 w-5"');
    expect(imports).toContain("Trash2");
    expect(imports).toContain("lucide-react");
  });

  it("overlay（dialog）でラップされる", () => {
    const { tsxSource, imports } = craftStateToTsx(
      makeState({ text: "Open", overlayType: "dialog" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Dialog>");
    expect(tsxSource).toContain("<DialogTrigger asChild>");
    expect(tsxSource).toContain("<DialogContent");
    expect(imports).toContain("Dialog");
  });

  it("overlay（sheet）で side 属性が出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ text: "Open", overlayType: "sheet", sheetSide: "left" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain("<Sheet>");
    expect(tsxSource).toContain('side="left"');
  });

  it("toast テキストで onClick が出力される", () => {
    const { tsxSource, imports } = craftStateToTsx(
      makeState({ text: "Save", toastText: "Saved!" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('toast("Saved!")');
    expect(imports).toContain("toast");
    expect(imports).toContain("sonner");
  });

  it("toast のカスタムポジションが出力される", () => {
    const { tsxSource } = craftStateToTsx(
      makeState({ text: "Save", toastText: "Done", toastPosition: "top-center" }) as never,
      "TestPage",
    );
    expect(tsxSource).toContain('position: "top-center"');
  });

  it("import に Button が含まれる", () => {
    const { imports } = craftStateToTsx(makeState({ text: "X" }) as never, "TestPage");
    expect(imports).toContain("Button");
    expect(imports).toContain("@/components/ui/button");
  });
});
