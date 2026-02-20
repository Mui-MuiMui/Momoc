export function v4Template(componentName: string): string {
  return `/**
 * Mocker Document (.moc)
 * VSCode拡張「Mocker」で作成されたGUIモックアップの定義ファイルです。
 * 人間・GUI・AIエージェントが協調して開発を行うための統合データ形式です。
 *
 * ファイル構造:
 *   本ファイルはTSX（TypeScript JSX）形式をベースとし、
 *   メタデータと付箋メモをJSDocコメント内に、
 *   エディタ内部状態をテンプレートリテラル変数に格納しています。
 *   TSX部分はそのままReactコンポーネントとして読解可能です。
 *
 * SSOT（Single Source of Truth）:
 *   GUIエディタの状態（craftState）が末尾のエディタデータに存在する場合、
 *   TSXコードよりcraftStateが正となります。
 *   TSXはcraftStateから自動生成される派生データです。
 *   AIエージェントがTSXを編集した場合、GUIエディタ側でcraftStateが再構築されます。
 *
 * メタデータ:
 *   @moc-version  - ドキュメント形式バージョン（必須）
 *   @moc-intent   - このページの目的・意図（任意、人間が記述）
 *   @moc-theme    - テーマ (light | dark)（任意、デフォルト: light）
 *   @moc-layout   - レイアウトモード (flow | absolute)（任意、デフォルト: flow）
 *   @moc-viewport - 対象ビューポート (desktop | tablet | mobile | WxH)（任意、デフォルト: desktop）
 *
 * AI指示メモ:
 *   ユーザーがキャンバス上に配置した、AIエージェントへの指示付箋です。
 *   各メモは @moc-memo タグで記述され、対象要素IDと指示テキストのペアです。
 *   AIはこのメモを読み取り、該当要素に対する修正・提案を行ってください。
 *
 * TSX内コメント規約:
 *   @moc-node <nodeID>  - Craft.jsノードとの対応付け
 *   @moc-role <役割>     - 要素の役割説明
 *   @moc-memo <メモ>     - 付箋メモの概要
 *
 * @moc-version 1.0.0
 * @moc-intent Empty page
 * @moc-theme light
 * @moc-layout flow
 * @moc-viewport desktop
 */

export default function ${componentName}() {
  return (
    <div className="min-h-screen bg-background p-8">
    </div>
  );
}
`;
}
