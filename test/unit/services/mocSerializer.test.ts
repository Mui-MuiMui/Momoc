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
          id: "test-uuid",
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
      expect(content).toContain("@moc-id test-uuid");
      expect(content).toContain("@moc-intent Test component");
      expect(content).toContain("@moc-theme light");
      expect(content).toContain("@moc-layout flow");
      expect(content).toContain("@moc-viewport desktop");
      expect(content).toContain('@moc-memo #btn "Test memo"');
      expect(content).toContain('import { Button } from "@/components/ui/button"');
      expect(content).toContain("export default function Test()");
    });

    it("should round-trip: parse → serialize → parse", () => {
      const original = `/**
 * @moc-version 1.0.0
 * @moc-id round-trip-test
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
      expect(reparsed.metadata.id).toBe(parsed.metadata.id);
      expect(reparsed.metadata.intent).toBe(parsed.metadata.intent);
      expect(reparsed.metadata.theme).toBe(parsed.metadata.theme);
      expect(reparsed.metadata.layout).toBe(parsed.metadata.layout);
      expect(reparsed.metadata.viewport).toBe(parsed.metadata.viewport);
      expect(reparsed.metadata.memos).toEqual(parsed.metadata.memos);
    });

    it("should handle document with no memos", () => {
      const doc: MocDocument = {
        metadata: {
          version: "1.0.0",
          id: "no-memos",
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
      expect(content).not.toContain("@moc-memo");
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
