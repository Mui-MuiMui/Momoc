import { describe, it, expect } from "vitest";
import { generateFlatTsx } from "../../../src/services/flatExportService.js";

const sampleMoc = `/**
 * @moc-version 1.0.0
 * @moc-id test-uuid
 * @moc-intent Login form
 * @moc-theme light
 * @moc-layout flow
 * @moc-viewport desktop
 *
 * @moc-memo #loginButton "Submit for login"
 * @moc-memo #emailInput "Needs email validation"
 */
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  return (
    <div>
      <Button id="loginButton">Login</Button>
    </div>
  );
}
`;

describe("flatExportService", () => {
  describe("generateFlatTsx", () => {
    it("should include metadata as comments", () => {
      const result = generateFlatTsx(sampleMoc);

      expect(result).toContain("Intent: Login form");
      expect(result).toContain("Theme: light");
      expect(result).toContain("Layout: flow");
    });

    it("should include AI memos", () => {
      const result = generateFlatTsx(sampleMoc);

      expect(result).toContain("#loginButton: Submit for login");
      expect(result).toContain("#emailInput: Needs email validation");
    });

    it("should include inline memo comments", () => {
      const result = generateFlatTsx(sampleMoc);

      expect(result).toContain("/* @ai-memo #loginButton: Submit for login */");
    });

    it("should include imports", () => {
      const result = generateFlatTsx(sampleMoc);

      expect(result).toContain('import { Button } from "@/components/ui/button"');
    });

    it("should include component source", () => {
      const result = generateFlatTsx(sampleMoc);

      expect(result).toContain("export default function LoginForm()");
    });
  });
});
