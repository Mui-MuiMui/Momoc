import { describe, it, expect } from "vitest";
import { serializeMocFile, updateMetadataField } from "../../../src/services/mocSerializer.js";
import { parseMocFile } from "../../../src/services/mocParser.js";
import type { MocDocument } from "../../../src/shared/types.js";

describe("mocSerializer", () => {
  describe("serializeMocFile", () => {
    it("should serialize a MocDocument to .moc content", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.0.0",
          intent: "Test component",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [{ targetId: "btn", text: "Test memo" }],
        },
        imports: 'import { Button } from "@/components/ui/button";',
        tsxSource: `export default function Test() {
  return <Button id="btn">Click</Button>;
}`,
        rawContent: "",
      };

      const content = serializeMocFile(doc);

      expect(content).toContain("@moc-version 1.2.0");
      expect(content).toContain("@moc-intent Test component");
      expect(content).toContain("@moc-theme light");
      expect(content).toContain("@moc-layout flow");
      expect(content).toContain("@moc-viewport desktop");
      // metadata.memos はヘッダーコメントに書き出されない（editorData.memos に保存される）
      expect(content).not.toMatch(/ \* @moc-memo #\S+ "/);
      expect(content).toContain('import { Button } from "@/components/ui/button"');
      expect(content).toContain("export default function Test()");
      // Should not contain @moc-id
      expect(content).not.toContain("@moc-id");
    });

    it("should serialize editor data as template literal", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.0.0",
          intent: "Editor data test",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [],
        },
        imports: "",
        tsxSource: "export default function Test() { return <div />; }",
        rawContent: "",
        editorData: {
          craftState: {
            ROOT: {
              type: { resolvedName: "CraftContainer" },
              props: {},
              nodes: [],
              linkedNodes: {},
              parent: null,
            },
          },
          memos: [],
          viewport: { mode: "desktop", width: 1280, height: 800 },
        },
      };

      const content = serializeMocFile(doc);

      // Should use Brotli compressed format
      expect(content).toContain("const __mocEditorData = `brotli:");
      // Raw JSON should NOT appear (it's compressed)
      expect(content).not.toContain('"craftState"');
      expect(content).not.toContain('"ROOT"');
    });

    it("should handle backticks and template expressions in editor data via Brotli compression", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.0.0",
          intent: "Escape test",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [],
        },
        imports: "",
        tsxSource: "export default function Test() { return <div />; }",
        rawContent: "",
        editorData: {
          craftState: {
            ROOT: {
              type: { resolvedName: "CraftContainer" },
              props: { className: "test with ` backtick and ${expr}" },
              nodes: [],
              linkedNodes: {},
              parent: null,
            },
          },
          memos: [],
        },
      };

      const content = serializeMocFile(doc);

      // Should be Brotli compressed (no escaping needed)
      expect(content).toContain("const __mocEditorData = `brotli:");

      // Round-trip: parse back and verify special characters are preserved
      const reparsed = parseMocFile(content);
      expect(reparsed.editorData).toBeDefined();
      const root = reparsed.editorData!.craftState.ROOT as { props: Record<string, unknown> };
      expect(root.props.className).toBe("test with ` backtick and ${expr}");
    });

    it("should round-trip: parse → serialize → parse", () => {
      const original = `/**
 * @moc-version 1.0.0
 * @moc-intent Round trip test
 * @moc-theme dark
 * @moc-layout absolute
 * @moc-viewport tablet
 */

import { Card } from "@/components/ui/card";

export default function RoundTrip() {
  return (
    <Card id="header">Hello</Card>
  );
}
`;
      const parsed = parseMocFile(original);
      const serialized = serializeMocFile(parsed);
      const reparsed = parseMocFile(serialized);

      // serialize 時に常に MOC_VERSION へ更新されるため、元ファイルのバージョンとは異なる場合がある
      expect(reparsed.metadata.version).toBe("1.2.0");
      expect(reparsed.metadata.intent).toBe(parsed.metadata.intent);
      expect(reparsed.metadata.theme).toBe(parsed.metadata.theme);
      expect(reparsed.metadata.layout).toBe(parsed.metadata.layout);
      expect(reparsed.metadata.viewport).toBe(parsed.metadata.viewport);
      // metadata.memos はシリアライズ後に保持されない（editorData.memos に保存される）
      expect(reparsed.metadata.memos).toEqual([]);
    });

    it("should round-trip editor data: parse → serialize → parse", () => {
      const original = `/**
 * @moc-version 1.0.0
 * @moc-intent Editor data round trip
 * @moc-theme light
 * @moc-layout flow
 * @moc-viewport desktop
 */

export default function TestPage() {
  return <div />;
}

const __mocEditorData = \`
{
  "craftState": {
    "ROOT": {
      "type": { "resolvedName": "CraftContainer" },
      "props": { "className": "flex" },
      "nodes": ["node1"],
      "linkedNodes": {},
      "parent": null
    },
    "node1": {
      "type": { "resolvedName": "CraftText" },
      "props": { "text": "Hello" },
      "nodes": [],
      "linkedNodes": {},
      "parent": "ROOT"
    }
  },
  "memos": [
    {
      "id": "m1",
      "title": "Note",
      "body": "A test note",
      "color": "#fff",
      "collapsed": false,
      "x": 0,
      "y": 0,
      "targetNodeId": "node1"
    }
  ],
  "viewport": {
    "mode": "desktop",
    "width": 1280,
    "height": 800
  }
}
\`;
`;

      const parsed = parseMocFile(original);
      expect(parsed.editorData).toBeDefined();

      const serialized = serializeMocFile(parsed);
      const reparsed = parseMocFile(serialized);

      expect(reparsed.editorData).toBeDefined();
      expect(reparsed.editorData!.craftState).toEqual(parsed.editorData!.craftState);
      expect(reparsed.editorData!.memos).toEqual(parsed.editorData!.memos);
      expect(reparsed.editorData!.viewport).toEqual(parsed.editorData!.viewport);
    });

    it("should handle document with no memos", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.0.0",
          intent: "No memos",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [],
        },
        imports: "",
        tsxSource: "export default function Empty() { return <div />; }",
        rawContent: "",
      };

      const content = serializeMocFile(doc);
      // Should not contain actual @moc-memo tags (with #targetId "text" format)
      expect(content).not.toMatch(/ \* @moc-memo #\S+ "/);
    });
  });

  describe("@moc-component tags (v1.1.0)", () => {
    it("should output @moc-component tags for components in craftState", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.1.0",
          intent: "Component schema test",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [],
        },
        imports: "",
        tsxSource: "export default function Test() { return <div />; }",
        rawContent: "",
        editorData: {
          craftState: {
            ROOT: {
              type: { resolvedName: "CraftContainer" },
              props: {},
              nodes: ["btn1"],
              linkedNodes: {},
              parent: null,
            },
            btn1: {
              type: { resolvedName: "CraftButton" },
              props: { text: "Click me" },
              nodes: [],
              linkedNodes: {},
              parent: "ROOT",
            },
          },
          memos: [],
        },
      };

      const content = serializeMocFile(doc);

      expect(content).toContain("@moc-component CraftButton");
      expect(content).toContain("@moc-component CraftContainer");
      // JSON should include displayName and props
      expect(content).toContain('"displayName":"Button"');
      expect(content).toContain('"displayName":"Container"');
    });

    it("should not output @moc-component tags for slot components", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.1.0",
          intent: "Slot exclusion test",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [],
        },
        imports: "",
        tsxSource: "export default function Test() { return <div />; }",
        rawContent: "",
        editorData: {
          craftState: {
            ROOT: {
              type: { resolvedName: "CraftContainer" },
              props: {},
              nodes: ["slot1"],
              linkedNodes: {},
              parent: null,
            },
            slot1: {
              type: { resolvedName: "TableCellSlot" },
              props: {},
              nodes: [],
              linkedNodes: {},
              parent: "ROOT",
            },
          },
          memos: [],
        },
      };

      const content = serializeMocFile(doc);

      expect(content).not.toContain("@moc-component TableCellSlot");
      expect(content).toContain("@moc-component CraftContainer");
    });

    it("should not output @moc-component tags when no editorData", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.1.0",
          intent: "No editor data",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [],
        },
        imports: "",
        tsxSource: "export default function Test() { return <div />; }",
        rawContent: "",
      };

      const content = serializeMocFile(doc);

      // 実際のタグ行（` * @moc-component Name {`）は存在しないこと
      // 説明ブロックの `*   @moc-component` は除外してチェック
      expect(content).not.toMatch(/ \* @moc-component \w/);
    });

    it("should output @moc-version 1.1.0 by default", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.1.0",
          intent: "",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [],
        },
        imports: "",
        tsxSource: "export default function Test() { return <div />; }",
        rawContent: "",
      };

      const content = serializeMocFile(doc);
      expect(content).toContain("@moc-version 1.2.0");
    });

    it("should output @moc-component as valid JSON", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.1.0",
          intent: "",
          theme: "light",
          layout: "flow",
          viewport: "desktop",
          memos: [],
        },
        imports: "",
        tsxSource: "export default function Test() { return <div />; }",
        rawContent: "",
        editorData: {
          craftState: {
            ROOT: {
              type: { resolvedName: "CraftButton" },
              props: {},
              nodes: [],
              linkedNodes: {},
              parent: null,
            },
          },
          memos: [],
        },
      };

      const content = serializeMocFile(doc);

      // Extract the @moc-component line and verify the JSON part is valid
      const match = content.match(/ \* @moc-component CraftButton (.+)/);
      expect(match).not.toBeNull();
      const json = match![1];
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.displayName).toBe("Button");
      expect(parsed.props).toBeDefined();
    });
  });

  describe("updateMetadataField", () => {
    it("should update an existing field", () => {
      const content = `/**
 * @moc-theme light
 */`;
      const updated = updateMetadataField(content, "theme", "dark");
      expect(updated).toContain("@moc-theme dark");
      expect(updated).not.toContain("@moc-theme light");
    });

    it("should add a new field if not present", () => {
      const content = `/**
 * @moc-version 1.0.0
 */`;
      const updated = updateMetadataField(content, "theme", "dark");
      expect(updated).toContain("@moc-theme dark");
    });
  });
});
