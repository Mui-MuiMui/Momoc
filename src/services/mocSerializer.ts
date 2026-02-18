import type { MocDocument, MocMetadata } from "../shared/types.js";

export function serializeMocFile(doc: MocDocument): string {
  const metadataBlock = serializeMetadata(doc.metadata);
  const parts = [metadataBlock];

  if (doc.imports.trim()) {
    parts.push(doc.imports.trim());
  }

  if (doc.tsxSource.trim()) {
    parts.push(doc.tsxSource.trim());
  }

  return parts.join("\n\n") + "\n";
}

function serializeMetadata(metadata: MocMetadata): string {
  const lines: string[] = ["/**"];

  lines.push(` * @moc-version ${metadata.version}`);
  lines.push(` * @moc-id ${metadata.id}`);
  lines.push(` * @moc-intent ${metadata.intent}`);
  lines.push(` * @moc-theme ${metadata.theme}`);
  lines.push(` * @moc-layout ${metadata.layout}`);
  lines.push(` * @moc-viewport ${metadata.viewport}`);

  if (metadata.memos.length > 0) {
    lines.push(" *");
    for (const memo of metadata.memos) {
      lines.push(` * @moc-memo #${memo.targetId} "${memo.text}"`);
    }
  }

  if (metadata.craftState) {
    lines.push(" *");
    lines.push(` * @moc-craft-state ${metadata.craftState}`);
  }

  lines.push(" */");

  return lines.join("\n");
}

export function updateMetadataField(
  content: string,
  field: string,
  value: string,
): string {
  const tagRegex = new RegExp(
    `(@moc-${field})\\s+.+`,
    "g",
  );

  if (tagRegex.test(content)) {
    return content.replace(tagRegex, `$1 ${value}`);
  }

  const insertPoint = content.indexOf(" */");
  if (insertPoint === -1) {
    return content;
  }

  return (
    content.slice(0, insertPoint) +
    ` * @moc-${field} ${value}\n` +
    content.slice(insertPoint)
  );
}
