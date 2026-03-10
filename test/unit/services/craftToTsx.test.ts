import { describe, it, expect } from "vitest";
import { craftStateToTsx } from "../../../src/services/craftToTsx.js";

describe("craftStateToTsx - zIndex", () => {
  it("zIndex が非ゼロの場合に style に zIndex: N が出力される", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftFreeCanvas" },
        props: { width: "100%", height: "100vh", className: "" },
        nodes: ["node1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
        displayName: "Free Canvas",
      },
      node1: {
        type: { resolvedName: "CraftButton" },
        props: {
          text: "Click",
          top: "10px",
          left: "20px",
          zIndex: 5,
        },
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
        isCanvas: false,
        displayName: "Button",
      },
    };

    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain("zIndex: 5");
    expect(tsxSource).toContain('position: "absolute"');
  });

  it("zIndex が 0 の場合は style に zIndex が出力されない", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftFreeCanvas" },
        props: { width: "100%", height: "100vh", className: "" },
        nodes: ["node1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
        displayName: "Free Canvas",
      },
      node1: {
        type: { resolvedName: "CraftButton" },
        props: {
          text: "Click",
          top: "10px",
          left: "20px",
          zIndex: 0,
        },
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
        isCanvas: false,
        displayName: "Button",
      },
    };

    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).not.toContain("zIndex");
  });
});

describe("craftStateToTsx - 境界値テスト", () => {
  it("null → 空divが返る", () => {
    const { tsxSource } = craftStateToTsx(null as never, "TestPage");
    expect(tsxSource).toContain("export default function TestPage()");
    expect(tsxSource).toContain("return <div />");
  });

  it("undefined → 空divが返る", () => {
    const { tsxSource } = craftStateToTsx(undefined as never, "TestPage");
    expect(tsxSource).toContain("export default function TestPage()");
    expect(tsxSource).toContain("return <div />");
  });

  it("空オブジェクト（ROOTなし） → 空divが返る", () => {
    const { tsxSource } = craftStateToTsx({} as never, "TestPage");
    expect(tsxSource).toContain("export default function TestPage()");
    expect(tsxSource).toContain("return <div />");
  });

  it("空コンポーネント名 → 空文字列のまま関数名に使われる", () => {
    const { tsxSource } = craftStateToTsx({ ROOT: {
      type: { resolvedName: "CraftContainer" },
      props: {},
      nodes: [],
      linkedNodes: {},
      parent: null,
    }} as never, "");
    expect(tsxSource).toContain("export default function ()");
  });

  it("未知のコンポーネント → Unknown コメント出力", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftContainer" },
        props: { className: "" },
        nodes: ["node1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
      },
      node1: {
        type: { resolvedName: "UnknownComponent" },
        props: {},
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
      },
    };

    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain("{/* Unknown: UnknownComponent */}");
  });

  it("存在しないノード参照 → クラッシュせず空出力", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftContainer" },
        props: { className: "" },
        nodes: ["nonexistent_id"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
      },
    };

    // クラッシュしないことを確認
    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain("export default function TestPage()");
  });

  it("深いネスト（20段）→ スタックオーバーフローせずに出力", () => {
    const craftState: Record<string, unknown> = {};
    const depth = 20;

    for (let i = 0; i <= depth; i++) {
      const id = i === 0 ? "ROOT" : `node${i}`;
      const childId = i < depth ? `node${i + 1}` : undefined;
      craftState[id] = {
        type: { resolvedName: "CraftContainer" },
        props: { className: "" },
        nodes: childId ? [childId] : [],
        linkedNodes: {},
        parent: i === 0 ? null : i === 1 ? "ROOT" : `node${i - 1}`,
        isCanvas: true,
      };
    }

    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain("export default function TestPage()");
    // 最も内側の div も出力されている
    expect(tsxSource).toContain("<div");
  });

  it("空の props → デフォルト出力", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftContainer" },
        props: {},
        nodes: ["node1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
      },
      node1: {
        type: { resolvedName: "CraftButton" },
        props: {},
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
      },
    };

    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain("<Button");
  });
});

describe("craftStateToTsx - CraftGroup", () => {
  it("CraftGroup が position: relative 付きの div として出力される", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftFreeCanvas" },
        props: { width: "100%", height: "100vh", className: "" },
        nodes: ["group1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
        displayName: "Free Canvas",
      },
      group1: {
        type: { resolvedName: "CraftGroup" },
        props: { width: "200px", height: "150px", className: "" },
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
        isCanvas: true,
        displayName: "Group",
      },
    };

    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain('className="relative"');
    expect(tsxSource).toContain('<div');
    expect(tsxSource).toContain('width: "200px"');
    expect(tsxSource).toContain('height: "150px"');
  });

  it("CraftGroup の子ノードが absolute 配置で出力される", () => {
    const craftState = {
      ROOT: {
        type: { resolvedName: "CraftFreeCanvas" },
        props: { width: "100%", height: "100vh", className: "" },
        nodes: ["group1"],
        linkedNodes: {},
        parent: null,
        isCanvas: true,
        displayName: "Free Canvas",
      },
      group1: {
        type: { resolvedName: "CraftGroup" },
        props: { width: "200px", height: "150px", className: "" },
        nodes: ["child1"],
        linkedNodes: {},
        parent: "ROOT",
        isCanvas: true,
        displayName: "Group",
      },
      child1: {
        type: { resolvedName: "CraftText" },
        props: { text: "Hello", top: "10px", left: "20px" },
        nodes: [],
        linkedNodes: {},
        parent: "group1",
        isCanvas: false,
        displayName: "Text",
      },
    };

    const { tsxSource } = craftStateToTsx(craftState as never, "TestPage");
    expect(tsxSource).toContain('position: "absolute"');
    expect(tsxSource).toContain('top: "10px"');
    expect(tsxSource).toContain('left: "20px"');
  });
});
