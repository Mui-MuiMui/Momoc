import { describe, it, expect } from "vitest";
import { brotliCompressSync } from "zlib";
import { parseMocFile, extractComponentName } from "../../../src/services/mocParser.js";

const sampleMoc = `/**
 * @moc-version 1.0.0
 * @moc-intent Login form mockup
 * @moc-theme light
 * @moc-layout flow
 * @moc-viewport desktop
 *
 * @moc-memo #loginButton "Submit button for login action"
 * @moc-memo #emailInput "Email validation required"
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Input id="emailInput" type="email" placeholder="Email" />
      <Button id="loginButton">Login</Button>
    </div>
  );
}
`;

const sampleMocWithEditorData = `/**
 * @moc-version 1.0.0
 * @moc-intent Test page
 * @moc-theme dark
 * @moc-layout flow
 * @moc-viewport tablet
 */

export default function TestPage() {
  return <div />;
}

const __mocEditorData = \`
{
  "craftState": {
    "ROOT": {
      "type": { "resolvedName": "CraftContainer" },
      "props": {},
      "nodes": [],
      "linkedNodes": {},
      "parent": null
    }
  },
  "memos": [
    {
      "id": "memo1",
      "title": "Test memo",
      "body": "This is a test",
      "color": "#ff0",
      "collapsed": false,
      "x": 10,
      "y": 20
    }
  ],
  "viewport": {
    "mode": "tablet",
    "width": 768,
    "height": 1024
  }
}
\`;
`;

describe("mocParser", () => {
  describe("parseMocFile", () => {
    it("should parse metadata from .moc content", () => {
      const doc = parseMocFile(sampleMoc);

      expect(doc.metadata.version).toBe("1.0.0");
      expect(doc.metadata.intent).toBe("Login form mockup");
      expect(doc.metadata.theme).toBe("light");
      expect(doc.metadata.layout).toBe("flow");
      expect(doc.metadata.viewport).toBe("desktop");
    });

    it("should parse memos", () => {
      const doc = parseMocFile(sampleMoc);

      expect(doc.metadata.memos).toHaveLength(2);
      expect(doc.metadata.memos[0]).toEqual({
        targetId: "loginButton",
        text: "Submit button for login action",
      });
      expect(doc.metadata.memos[1]).toEqual({
        targetId: "emailInput",
        text: "Email validation required",
      });
    });

    it("should extract imports", () => {
      const doc = parseMocFile(sampleMoc);

      expect(doc.imports).toContain('import { Button } from "@/components/ui/button"');
      expect(doc.imports).toContain('import { Input } from "@/components/ui/input"');
    });

    it("should extract TSX source", () => {
      const doc = parseMocFile(sampleMoc);

      expect(doc.tsxSource).toContain("export default function LoginForm()");
      expect(doc.tsxSource).toContain("<Button");
      expect(doc.tsxSource).toContain("<Input");
    });

    it("should handle content without metadata", () => {
      const content = `export default function Test() {
  return <div>Hello</div>;
}
`;
      const doc = parseMocFile(content);

      expect(doc.metadata.version).toBe("1.2.0");
      expect(doc.metadata.memos).toHaveLength(0);
      expect(doc.tsxSource).toContain("export default function Test()");
    });

    it("should preserve raw content", () => {
      const doc = parseMocFile(sampleMoc);
      expect(doc.rawContent).toBe(sampleMoc);
    });

    it("should parse editor data from template literal format", () => {
      const doc = parseMocFile(sampleMocWithEditorData);

      expect(doc.editorData).toBeDefined();
      expect(doc.editorData!.craftState).toBeDefined();
      expect(doc.editorData!.craftState.ROOT).toBeDefined();
      expect(doc.editorData!.memos).toHaveLength(1);
      expect(doc.editorData!.memos[0].title).toBe("Test memo");
      expect(doc.editorData!.viewport).toEqual({
        mode: "tablet",
        width: 768,
        height: 1024,
      });
    });

    it("should exclude editor data block from TSX source", () => {
      const doc = parseMocFile(sampleMocWithEditorData);

      expect(doc.tsxSource).toContain("export default function TestPage()");
      expect(doc.tsxSource).not.toContain("__mocEditorData");
    });

    it("should handle escaped backtick and template expressions in editor data", () => {
      // Build content with string concatenation to avoid backtick escaping issues in test source
      const editorBlock = [
        "const __mocEditorData = `",
        "{",
        '  "craftState": {',
        '    "ROOT": {',
        '      "type": { "resolvedName": "CraftContainer" },',
        '      "props": { "className": "test with \\` backtick and \\${expr}" },',
        '      "nodes": [],',
        '      "linkedNodes": {},',
        '      "parent": null',
        "    }",
        "  },",
        '  "memos": []',
        "}",
        "`;",
      ].join("\n");

      const content = [
        "/**",
        " * @moc-version 1.0.0",
        " * @moc-intent Escape test",
        " * @moc-theme light",
        " * @moc-layout flow",
        " * @moc-viewport desktop",
        " */",
        "",
        "export default function EscapeTest() {",
        "  return <div />;",
        "}",
        "",
        editorBlock,
        "",
      ].join("\n");

      const doc = parseMocFile(content);

      expect(doc.editorData).toBeDefined();
      const root = doc.editorData!.craftState.ROOT as { props: Record<string, unknown> };
      expect(root.props.className).toBe("test with ` backtick and ${expr}");
    });
  });

  describe("@moc-component tag (v1.1.0)", () => {
    it("should parse @moc-component tags into componentSchemas", () => {
      const schema = JSON.stringify({
        displayName: "Button",
        props: {
          text: { type: "string", default: "Button" },
          variant: { type: "default|destructive|outline", default: "default" },
        },
      });
      const content = [
        "/**",
        " * @moc-version 1.1.0",
        " * @moc-intent Test",
        " * @moc-theme light",
        " * @moc-layout flow",
        " * @moc-viewport desktop",
        ` * @moc-component CraftButton ${schema}`,
        " */",
        "",
        "export default function Test() { return <div />; }",
      ].join("\n");

      const doc = parseMocFile(content);

      expect(doc.metadata.componentSchemas).toBeDefined();
      expect(doc.metadata.componentSchemas!["CraftButton"]).toBeDefined();
      expect(doc.metadata.componentSchemas!["CraftButton"].displayName).toBe("Button");
      expect(doc.metadata.componentSchemas!["CraftButton"].props.text.type).toBe("string");
      expect(doc.metadata.componentSchemas!["CraftButton"].props.variant.default).toBe("default");
    });

    it("should parse multiple @moc-component tags", () => {
      const btnSchema = JSON.stringify({ displayName: "Button", props: { text: { type: "string", default: "Button" } } });
      const cardSchema = JSON.stringify({ displayName: "Card", props: { title: { type: "string", default: "Card Title" } } });
      const content = [
        "/**",
        " * @moc-version 1.1.0",
        " * @moc-intent Test",
        " * @moc-theme light",
        " * @moc-layout flow",
        " * @moc-viewport desktop",
        ` * @moc-component CraftButton ${btnSchema}`,
        ` * @moc-component CraftCard ${cardSchema}`,
        " */",
        "",
        "export default function Test() { return <div />; }",
      ].join("\n");

      const doc = parseMocFile(content);

      expect(Object.keys(doc.metadata.componentSchemas!)).toHaveLength(2);
      expect(doc.metadata.componentSchemas!["CraftButton"].displayName).toBe("Button");
      expect(doc.metadata.componentSchemas!["CraftCard"].displayName).toBe("Card");
    });

    it("should ignore @moc-component tags with invalid JSON", () => {
      const content = [
        "/**",
        " * @moc-version 1.1.0",
        " * @moc-intent Test",
        " * @moc-theme light",
        " * @moc-layout flow",
        " * @moc-viewport desktop",
        " * @moc-component CraftButton {invalid json}",
        " */",
        "",
        "export default function Test() { return <div />; }",
      ].join("\n");

      const doc = parseMocFile(content);

      expect(doc.metadata.componentSchemas).toBeUndefined();
    });

    it("should return undefined componentSchemas when no @moc-component tags present", () => {
      const doc = parseMocFile(sampleMoc);
      expect(doc.metadata.componentSchemas).toBeUndefined();
    });
  });

  describe("Brotli compressed editor data (v1.2.0)", () => {
    it("should parse Brotli compressed editor data", () => {
      const editorData = {
        craftState: {
          ROOT: {
            type: { resolvedName: "CraftContainer" },
            props: { className: "flex" },
            nodes: [],
            linkedNodes: {},
            parent: null,
          },
        },
        memos: [],
        viewport: { mode: "desktop", width: 1280, height: 800 },
      };
      const json = JSON.stringify(editorData);
      const compressed = brotliCompressSync(Buffer.from(json));
      const base64 = compressed.toString("base64");

      const content = [
        "/**",
        " * @moc-version 1.2.0",
        " * @moc-intent Brotli test",
        " * @moc-theme light",
        " * @moc-layout flow",
        " * @moc-viewport desktop",
        " */",
        "",
        "export default function Test() { return <div />; }",
        "",
        `const __mocEditorData = \`brotli:${base64}\`;`,
        "",
      ].join("\n");

      const doc = parseMocFile(content);

      expect(doc.editorData).toBeDefined();
      expect(doc.editorData!.craftState.ROOT).toBeDefined();
      const root = doc.editorData!.craftState.ROOT as { props: Record<string, unknown> };
      expect(root.props.className).toBe("flex");
      expect(doc.editorData!.viewport).toEqual({ mode: "desktop", width: 1280, height: 800 });
    });

    it("should still parse legacy raw JSON editor data (backward compat)", () => {
      const doc = parseMocFile(sampleMocWithEditorData);

      expect(doc.editorData).toBeDefined();
      expect(doc.editorData!.craftState.ROOT).toBeDefined();
      expect(doc.editorData!.memos).toHaveLength(1);
    });
  });

  describe("extractComponentName", () => {
    it("should extract component name from TSX source", () => {
      const name = extractComponentName("export default function MyComponent() { return <div />; }");
      expect(name).toBe("MyComponent");
    });

    it("should return null for missing component name", () => {
      const name = extractComponentName("const x = 1;");
      expect(name).toBeNull();
    });
  });
});
