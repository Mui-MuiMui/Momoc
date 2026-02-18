import { describe, it, expect } from "vitest";
import { parseMocFile, extractComponentName } from "../../../src/services/mocParser.js";

const sampleMoc = `/**
 * @moc-version 1.0.0
 * @moc-id a1b2c3d4-e5f6-7890-abcd-ef1234567890
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

describe("mocParser", () => {
  describe("parseMocFile", () => {
    it("should parse metadata from .moc content", () => {
      const doc = parseMocFile(sampleMoc);

      expect(doc.metadata.version).toBe("1.0.0");
      expect(doc.metadata.id).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
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

      expect(doc.metadata.version).toBe("1.0.0");
      expect(doc.metadata.id).toBe("");
      expect(doc.metadata.memos).toHaveLength(0);
      expect(doc.tsxSource).toContain("export default function Test()");
    });

    it("should preserve raw content", () => {
      const doc = parseMocFile(sampleMoc);
      expect(doc.rawContent).toBe(sampleMoc);
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
