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

      expect(content).toContain("@moc-version 1.0.0");
      expect(content).toContain("@moc-intent Test component");
      expect(content).toContain("@moc-theme light");
      expect(content).toContain("@moc-layout flow");
      expect(content).toContain("@moc-viewport desktop");
      expect(content).toContain('@moc-memo #btn "Test memo"');
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

      // Should use template literal format
      expect(content).toContain("const __mocEditorData = `");
      expect(content).toContain('"craftState"');
      expect(content).toContain('"ROOT"');
      // Should NOT use base64 format
      expect(content).not.toContain("@moc-editor-data");
      expect(content).not.toContain("DATA:");
    });

    it("should escape backticks and template expressions in editor data", () => {
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

      // Backtick should be escaped
      expect(content).toContain("\\`");
      // Template expression should be escaped
      expect(content).toContain("\\${");
    });

    it("should round-trip: parse → serialize → parse", () => {
      const original = `/**
 * @moc-version 1.0.0
 * @moc-intent Round trip test
 * @moc-theme dark
 * @moc-layout absolute
 * @moc-viewport tablet
 *
 * @moc-memo #header "Main header"
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

      expect(reparsed.metadata.version).toBe(parsed.metadata.version);
      expect(reparsed.metadata.intent).toBe(parsed.metadata.intent);
      expect(reparsed.metadata.theme).toBe(parsed.metadata.theme);
      expect(reparsed.metadata.layout).toBe(parsed.metadata.layout);
      expect(reparsed.metadata.viewport).toBe(parsed.metadata.viewport);
      expect(reparsed.metadata.memos).toEqual(parsed.metadata.memos);
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
