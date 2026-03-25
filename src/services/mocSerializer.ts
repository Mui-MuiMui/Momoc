import { brotliCompressSync } from "zlib";
import type { MocDocument, MocMetadata, MocEditorData, MocEditorMemo } from "../shared/types.js";
import { COMPONENT_SCHEMAS, SLOT_COMPONENT_NAMES } from "../shared/componentSchemas.js";
import { MOC_VERSION } from "../shared/constants.js";

export function serializeMocFile(doc: MocDocument): string {
  const usedComponents = extractUsedComponents(doc.editorData?.craftState);
  const usesIcons = doc.imports.includes("lucide-react");
  const editorMemos = doc.editorData?.memos ?? [];
  const metadataBlock = serializeMetadata(doc.metadata, usedComponents, usesIcons, editorMemos);
  const parts = [metadataBlock];

  if (doc.imports.trim()) {
    parts.push(`/* @moc-imports-start */\n${doc.imports.trim()}\n/* @moc-imports-end */`);
  }

  if (doc.tsxSource.trim()) {
    parts.push(`/* @moc-tsx-start */\n${doc.tsxSource.trim()}\n/* @moc-tsx-end */`);
  }

  let result = parts.join("\n\n") + "\n";

  if (doc.editorData) {
    result += "\n" + serializeEditorData(doc.editorData) + "\n";
  }

  return result;
}

function extractUsedComponents(craftState: Record<string, unknown> | undefined): string[] {
  if (!craftState) return [];
  const names = new Set<string>();
  for (const node of Object.values(craftState)) {
    const resolvedName = (node as { type?: { resolvedName?: string } })?.type?.resolvedName;
    if (resolvedName && !SLOT_COMPONENT_NAMES.has(resolvedName)) {
      names.add(resolvedName);
    }
  }
  return [...names].sort();
}

function serializeMetadata(metadata: MocMetadata, usedComponents: string[], usesIcons: boolean, editorMemos: MocEditorMemo[]): string {
  const lines: string[] = ["/**"];

  // Data structure description prompt for AI agents
  lines.push(" * Momoc Document (.moc)");
  lines.push(" * VSCode拡張「Momoc」で作成されたGUIモックアップの定義ファイルです。");
  lines.push(" * 人間・GUI・AIエージェントが協調して開発を行うための統合データ形式です。");
  lines.push(" *");
  lines.push(" * ファイル構造:");
  lines.push(" *   本ファイルはTSX（TypeScript JSX）形式をベースとし、");
  lines.push(" *   メタデータと付箋メモをJSDocコメント内に、");
  lines.push(" *   エディタ内部状態をテンプレートリテラル変数に格納しています。");
  lines.push(" *   TSX部分はそのままReactコンポーネントとして読解可能です。");
  lines.push(" *");
  lines.push(" * 技術スタック:");
  lines.push(" *   CSS: Tailwind CSS v4（ユーティリティファーストCSS）");
  lines.push(" *   UIコンポーネント: shadcn/ui（Radix UI + Tailwind CSSベース）");
  lines.push(" *   importパス「@/components/ui/*」はshadcn/uiコンポーネントです。");
  if (usesIcons) {
    lines.push(" *   アイコン: lucide-react（importパス「lucide-react」）");
  }
  lines.push(" *   導入先にTailwind CSSやshadcn/uiがない場合は、");
  lines.push(" *   導入先の技術スタックで同等の見た目・レイアウトを再現してください。");
  lines.push(" *");
  lines.push(" * SSOT（Single Source of Truth）:");
  lines.push(" *   GUIエディタの状態（craftState）が末尾のエディタデータに存在する場合、");
  lines.push(" *   TSXコードよりcraftStateが正となります。");
  lines.push(" *   TSXはcraftStateから自動生成される派生データであり、AIがページ構造を");
  lines.push(" *   読み取るための参照用です。コンポーネントの配置変更はGUIで行ってください。");
  lines.push(" *   (GUIで編集した場合、craftStateの内容がtsxにも上書きされます。)");
  lines.push(" *");
  lines.push(" * AI読み取り優先順位:");
  lines.push(" *   1. TSXコード（構造・レイアウトの主軸 読み手理解用）");
  lines.push(" *   2. craftState（GUIエディタの詳細プロパティ参照用）");
  lines.push(" *");
  lines.push(" * エディタデータ（末尾ブロック）:");
  lines.push(" *   Brotli圧縮+Base64エンコードされたGUIエディタの内部状態です。");
  lines.push(" *   AIエージェントはこのデータを直接読み取る必要はありません。");
  lines.push(" *   ページ構造の理解にはTSXコードと@moc-componentスキーマを使用してください。");
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
  lines.push(" *   @moc-memos ブロックにメモ一覧が記載されます（Title/Message形式）。");
  lines.push(" *   TSX内にも @moc-memo コメントとして各要素付近に記載されます。");
  lines.push(" *   AIはこのメモを読み取り、該当要素に対する修正・提案を行ってください。");
  lines.push(" *");
  lines.push(" * コンポーネントスキーマ（v1.1.0）:");
  lines.push(" *   @moc-component <コンポーネント名> <propsスキーマJSON>");
  lines.push(" *   このファイルで使用されているMomocコンポーネントのプロパティ定義です。");
  lines.push(" *   type: 受け付ける値の型または選択肢（A|B|C形式）、default: デフォルト値。");
  lines.push(" *   AIはcraftStateの各ノードのpropsをこの定義と照合して解釈してください。");
  lines.push(" *");
  lines.push(" * TSX内コメント規約:");
  lines.push(" *   @moc-node <nodeID>  - Craft.jsノードとの対応付け");
  lines.push(" *   @moc-role <役割>     - 要素の役割説明");
  lines.push(" *   @moc-memo <メモ>     - 付箋メモの概要");
  lines.push(" *");

  lines.push(` * @moc-version ${MOC_VERSION}`);
  lines.push(` * @moc-intent ${metadata.intent}`);
  lines.push(` * @moc-theme ${metadata.theme}`);
  lines.push(` * @moc-layout ${metadata.layout}`);
  lines.push(` * @moc-viewport ${metadata.viewport}`);

  // @moc-memos block (v1.2.1)
  const memoLines = buildMemoLines(editorMemos);
  if (memoLines.length > 0) {
    lines.push(" *");
    lines.push(" * @moc-memos");
    for (const line of memoLines) {
      lines.push(` *   ${line}`);
    }
  }

  for (const name of usedComponents) {
    const schema = COMPONENT_SCHEMAS[name];
    if (schema) {
      lines.push(` * @moc-component ${name} ${JSON.stringify(schema)}`);
    }
  }

  lines.push(" */");

  return lines.join("\n");
}

function buildMemoLines(memos: MocEditorMemo[]): string[] {
  const lines: string[] = [];
  for (const memo of memos) {
    if (!memo.title && !memo.body) continue;
    const nodeIds = memo.targetNodeIds ?? [];
    // メモがノードに紐づいていない場合もタイトルで出力
    const ids = nodeIds.length > 0 ? nodeIds : ["_"];
    for (const nid of ids) {
      let entry = `[${nid}]`;
      if (memo.title) entry += ` Title:${memo.title}`;
      if (memo.body) entry += ` Message:${memo.body}`;
      lines.push(entry);
    }
  }
  return lines;
}

function serializeEditorData(data: MocEditorData): string {
  const json = JSON.stringify(data);
  const compressed = brotliCompressSync(Buffer.from(json));
  const base64 = compressed.toString("base64");
  return `const __mocEditorData = \`brotli:${base64}\`;`;
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
