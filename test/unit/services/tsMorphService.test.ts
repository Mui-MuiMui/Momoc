import { describe, it, expect } from "vitest";
import { parseJsxTree, getComponentName, updateJsxProp } from "../../../src/services/tsMorphService.js";

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
    it("should parse the root JSX element", async () => {
      const tree = await parseJsxTree(sampleTsx);

      expect(tree).toHaveLength(1);
      expect(tree[0].tagName).toBe("div");
    });

    it("should extract props from JSX elements", async () => {
      const tree = await parseJsxTree(sampleTsx);
      const root = tree[0];

      expect(root.props["className"]).toContain("flex");
    });

    it("should parse children", async () => {
      const tree = await parseJsxTree(sampleTsx);
      const root = tree[0];

      expect(root.children.length).toBeGreaterThanOrEqual(3);
    });

    it("should extract self-closing element info", async () => {
      const tree = await parseJsxTree(sampleTsx);
      const root = tree[0];

      const input = root.children.find((c) => c.tagName === "Input");
      expect(input).toBeDefined();
      expect(input?.props["type"]).toBeDefined();
    });

    it("should handle empty content", async () => {
      const tree = await parseJsxTree("");
      expect(tree).toHaveLength(0);
    });

    it("should handle content without default export", async () => {
      const tree = await parseJsxTree("const x = 1;");
      expect(tree).toHaveLength(0);
    });
  });

  describe("getComponentName", () => {
    it("should extract the default export function name", async () => {
      const name = await getComponentName(sampleTsx);
      expect(name).toBe("LoginForm");
    });

    it("should return null for no default export", async () => {
      const name = await getComponentName("function Foo() { return <div />; }");
      expect(name).toBeNull();
    });
  });

  describe("updateJsxProp", () => {
    const sampleWithCraftIds = `
export default function Foo() {
  return (
    <div data-craft-id="root" className="flex">
      <Button data-craft-id="btn1" variant="default" />
    </div>
  );
}
`;

    it("should update an existing prop on the matched element", async () => {
      const result = await updateJsxProp(sampleWithCraftIds, "btn1", "variant", `"outline"`);
      expect(result).toContain('variant="outline"');
      expect(result).not.toContain('variant="default"');
    });

    it("should add a new prop when prop does not exist", async () => {
      const result = await updateJsxProp(sampleWithCraftIds, "root", "id", `"main"`);
      expect(result).toContain('id="main"');
    });

    it("should not modify content when craft ID is not found", async () => {
      const result = await updateJsxProp(sampleWithCraftIds, "nonexistent", "variant", `"outline"`);
      expect(result).toContain('variant="default"');
      expect(result).not.toContain('variant="outline"');
    });
  });
});
