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
