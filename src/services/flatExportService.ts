import { parseMocFile } from "./mocParser.js";

export function generateFlatTsx(content: string): string {
  const doc = parseMocFile(content);
  const lines: string[] = [];

  // Header with metadata as AI-readable comments
  lines.push("/**");
  lines.push(` * Mocker Flat TSX Export`);
  lines.push(` * Generated for AI agent consumption`);
  lines.push(` *`);
  lines.push(` * Intent: ${doc.metadata.intent}`);
  lines.push(` * Theme: ${doc.metadata.theme}`);
  lines.push(` * Layout: ${doc.metadata.layout}`);
  lines.push(` * Viewport: ${doc.metadata.viewport}`);

  if (doc.metadata.memos.length > 0) {
    lines.push(` *`);
    lines.push(` * AI Memos:`);
    for (const memo of doc.metadata.memos) {
      lines.push(` *   #${memo.targetId}: ${memo.text}`);
    }
  }

  lines.push(` */`);
  lines.push("");

  // Imports
  if (doc.imports.trim()) {
    lines.push(doc.imports.trim());
    lines.push("");
  }

  // Inline memo comments before the component
  if (doc.metadata.memos.length > 0) {
    for (const memo of doc.metadata.memos) {
      lines.push(`/* @ai-memo #${memo.targetId}: ${memo.text} */`);
    }
    lines.push("");
  }

  // Component source
  lines.push(doc.tsxSource.trim());
  lines.push("");

  return lines.join("\n");
}
