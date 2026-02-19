import type { MocDocument, MocMetadata, MocEditorData } from "../shared/types.js";

export function serializeMocFile(doc: MocDocument): string {
  const metadataBlock = serializeMetadata(doc.metadata);
  const parts = [metadataBlock];

  if (doc.imports.trim()) {
    parts.push(doc.imports.trim());
  }

  if (doc.tsxSource.trim()) {
    parts.push(doc.tsxSource.trim());
  }

  let result = parts.join("\n\n") + "\n";

  if (doc.editorData) {
    result += "\n" + serializeEditorData(doc.editorData) + "\n";
  }

  return result;
}

function serializeMetadata(metadata: MocMetadata): string {
  const lines: string[] = ["/**"];

  // Data structure description prompt for AI agents
  lines.push(" * Mocker Document (.moc)");
  lines.push(" * VSCode\u62E1\u5F35\u300CMocker\u300D\u3067\u4F5C\u6210\u3055\u308C\u305FGUI\u30E2\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u3067\u3059\u3002");
  lines.push(" * \u4EBA\u9593\u30FBGUI\u30FBAI\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u304C\u5354\u8ABF\u3057\u3066\u958B\u767A\u3092\u884C\u3046\u305F\u3081\u306E\u7D71\u5408\u30C7\u30FC\u30BF\u5F62\u5F0F\u3067\u3059\u3002");
  lines.push(" *");
  lines.push(" * \u30D5\u30A1\u30A4\u30EB\u69CB\u9020:");
  lines.push(" *   \u672C\u30D5\u30A1\u30A4\u30EB\u306FTSX\uFF08TypeScript JSX\uFF09\u5F62\u5F0F\u3092\u30D9\u30FC\u30B9\u3068\u3057\u3001");
  lines.push(" *   \u30E1\u30BF\u30C7\u30FC\u30BF\u3068\u4ED8\u7B8B\u30E1\u30E2\u3092JSDoc\u30B3\u30E1\u30F3\u30C8\u5185\u306B\u3001");
  lines.push(" *   \u30A8\u30C7\u30A3\u30BF\u5185\u90E8\u72B6\u614B\u3092\u672B\u5C3E\u30B3\u30E1\u30F3\u30C8\u30D6\u30ED\u30C3\u30AF\u306B\u683C\u7D0D\u3057\u3066\u3044\u307E\u3059\u3002");
  lines.push(" *   TSX\u90E8\u5206\u306F\u305D\u306E\u307E\u307EReact\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u3068\u3057\u3066\u8AAD\u89E3\u53EF\u80FD\u3067\u3059\u3002");
  lines.push(" *");
  lines.push(" * \u30E1\u30BF\u30C7\u30FC\u30BF:");
  lines.push(" *   @moc-version  - \u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u5F62\u5F0F\u30D0\u30FC\u30B8\u30E7\u30F3");
  lines.push(" *   @moc-id       - \u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u56FA\u6709ID");
  lines.push(" *   @moc-intent   - \u3053\u306E\u30DA\u30FC\u30B8\u306E\u76EE\u7684\u30FB\u610F\u56F3\uFF08\u4EBA\u9593\u304C\u8A18\u8FF0\uFF09");
  lines.push(" *   @moc-theme    - \u30C6\u30FC\u30DE (light | dark)");
  lines.push(" *   @moc-layout   - \u30EC\u30A4\u30A2\u30A6\u30C8\u30E2\u30FC\u30C9 (flow | absolute)");
  lines.push(" *   @moc-viewport - \u5BFE\u8C61\u30D3\u30E5\u30FC\u30DD\u30FC\u30C8 (desktop | tablet | mobile)");
  lines.push(" *");
  lines.push(" * AI\u6307\u793A\u30E1\u30E2 (@moc-memo):");
  lines.push(" *   \u30E6\u30FC\u30B6\u30FC\u304C\u30AD\u30E3\u30F3\u30D0\u30B9\u4E0A\u306B\u914D\u7F6E\u3057\u305F\u3001AI\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3078\u306E\u6307\u793A\u4ED8\u7B8B\u3067\u3059\u3002");
  lines.push(" *   \u66F8\u5F0F: @moc-memo #<\u5BFE\u8C61\u8981\u7D20ID> \"\u6307\u793A\u30C6\u30AD\u30B9\u30C8\"");
  lines.push(" *   AI\u306F\u3053\u306E\u30E1\u30E2\u3092\u8AAD\u307F\u53D6\u308A\u3001\u8A72\u5F53\u8981\u7D20\u306B\u5BFE\u3059\u308B\u4FEE\u6B63\u30FB\u63D0\u6848\u3092\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002");
  lines.push(" *");

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

  lines.push(" */");

  return lines.join("\n");
}

function serializeEditorData(data: MocEditorData): string {
  const json = JSON.stringify(data);
  const base64 = Buffer.from(json, "utf-8").toString("base64");

  const lines: string[] = [];
  lines.push("/*");
  lines.push(" * @moc-editor-data");
  lines.push(" * \u4EE5\u4E0B\u306FMocker\u30A8\u30C7\u30A3\u30BF\u306E\u5185\u90E8\u72B6\u614B\u3067\u3059\uFF08base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6E08\u307FJSON\uFF09\u3002");
  lines.push(" * craftState: Craft.js\u30CE\u30FC\u30C9\u30C4\u30EA\u30FC\uFF08GUI\u30A8\u30C7\u30A3\u30BF\u306E\u5FA9\u5143\u306B\u4F7F\u7528\uFF09");
  lines.push(" * memos: \u4ED8\u7B8B\u30E1\u30E2\u306E\u5B8C\u5168\u30C7\u30FC\u30BF\uFF08\u4F4D\u7F6E\u30FB\u8272\u30FB\u30BF\u30A4\u30C8\u30EB\u30FB\u672C\u6587\u30FB\u30EA\u30F3\u30AF\u5148\u8981\u7D20ID\uFF09");
  lines.push(" * \u3053\u306E\u90E8\u5206\u306F\u30A8\u30C7\u30A3\u30BF\u304C\u81EA\u52D5\u751F\u6210\u3057\u307E\u3059\u3002\u624B\u52D5\u7DE8\u96C6\u306F\u975E\u63A8\u5968\u3067\u3059\u3002");
  lines.push(` * DATA:${base64}`);
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
