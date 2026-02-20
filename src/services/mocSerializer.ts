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
  lines.push(" * VSCode拡張「Mocker」で作成されたGUIモックアップの定義ファイルです。");
  lines.push(" * 人間・GUI・AIエージェントが協調して開発を行うための統合データ形式です。");
  lines.push(" *");
  lines.push(" * ファイル構造:");
  lines.push(" *   本ファイルはTSX（TypeScript JSX）形式をベースとし、");
  lines.push(" *   メタデータと付箋メモをJSDocコメント内に、");
  lines.push(" *   エディタ内部状態をテンプレートリテラル変数に格納しています。");
  lines.push(" *   TSX部分はそのままReactコンポーネントとして読解可能です。");
  lines.push(" *");
  lines.push(" * SSOT（Single Source of Truth）:");
  lines.push(" *   GUIエディタの状態（craftState）が末尾のエディタデータに存在する場合、");
  lines.push(" *   TSXコードよりcraftStateが正となります。");
  lines.push(" *   TSXはcraftStateから自動生成される派生データです。");
  lines.push(" *   AIエージェントがTSXを編集した場合、GUIエディタ側でcraftStateが再構築されます。");
  lines.push(" *");
  lines.push(" * メタデータ:");
  lines.push(" *   @moc-version  - ドキュメント形式バージョン（必須）");
  lines.push(" *   @moc-intent   - このページの目的・意図（任意、人間が記述）");
  lines.push(" *   @moc-theme    - テーマ (light | dark)（任意、デフォルト: light）");
  lines.push(" *   @moc-layout   - レイアウトモード (flow | absolute)（任意、デフォルト: flow）");
  lines.push(" *   @moc-viewport - 対象ビューポート (desktop | tablet | mobile | WxH)（任意、デフォルト: desktop）");
  lines.push(" *");
  lines.push(" * AI指示メモ:");
  lines.push(" *   ユーザーがキャンバス上に配置した、AIエージェントへの指示付箋です。");
  lines.push(" *   各メモは @moc-memo タグで記述され、対象要素IDと指示テキストのペアです。");
  lines.push(" *   AIはこのメモを読み取り、該当要素に対する修正・提案を行ってください。");
  lines.push(" *");
  lines.push(" * TSX内コメント規約:");
  lines.push(" *   @moc-node <nodeID>  - Craft.jsノードとの対応付け");
  lines.push(" *   @moc-role <役割>     - 要素の役割説明");
  lines.push(" *   @moc-memo <メモ>     - 付箋メモの概要");
  lines.push(" *");

  lines.push(` * @moc-version ${metadata.version}`);
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
  const json = JSON.stringify(data, null, 2);
  // Escape template literal special chars: ` → \`, ${ → \${
  const escaped = json
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");

  return `const __mocEditorData = \`\n${escaped}\n\`;`;
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
