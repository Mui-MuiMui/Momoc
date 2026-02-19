import { describe, it, expect } from "vitest";
import { parseJsxTree, getComponentName } from "../../../src/services/tsMorphService.js";

const sampleTsx = `
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Button variant="default">Login</Button>
    </div>
  );
}
`;

describe("tsMorphService", () => {
  describe("parseJsxTree", () => {
    it("should parse the root JSX element", () => {
      const tree = parseJsxTree(sampleTsx);

      expect(tree).toHaveLength(1);
      expect(tree[0].tagName).toBe("div");
    });

    it("should extract props from JSX elements", () => {
      const tree = parseJsxTree(sampleTsx);
      const root = tree[0];

      expect(root.props["className"]).toContain("flex");
    });

    it("should parse children", () => {
      const tree = parseJsxTree(sampleTsx);
      const root = tree[0];

      expect(root.children.length).toBeGreaterThanOrEqual(3);
    });

    it("should extract self-closing element info", () => {
      const tree = parseJsxTree(sampleTsx);
      const root = tree[0];

      const input = root.children.find((c) => c.tagName === "Input");
      expect(input).toBeDefined();
      expect(input?.props["type"]).toBeDefined();
    });

    it("should handle empty content", () => {
      const tree = parseJsxTree("");
      expect(tree).toHaveLength(0);
    });

    it("should handle content without default export", () => {
      const tree = parseJsxTree("const x = 1;");
      expect(tree).toHaveLength(0);
    });
  });

  describe("getComponentName", () => {
    it("should extract the default export function name", () => {
      const name = getComponentName(sampleTsx);
      expect(name).toBe("LoginForm");
    });

    it("should return null for no default export", () => {
      const name = getComponentName("function Foo() { return <div />; }");
      expect(name).toBeNull();
    });
  });
});
