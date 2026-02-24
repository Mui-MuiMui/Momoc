export function dashboardTemplate(componentName: string): string {
  return `/**
 * Momoc Document (.moc)
 * VSCode拡張「Momoc」で作成されたGUIモックアップの定義ファイルです。
 * 人間・GUI・AIエージェントが協調して開発を行うための統合データ形式です。
 *
 * ファイル構造:
 *   本ファイルはTSX（TypeScript JSX）形式をベースとし、
 *   メタデータと付箋メモをJSDocコメント内に、
 *   エディタ内部状態をテンプレートリテラル変数に格納しています。
 *   TSX部分はそのままReactコンポーネントとして読解可能です。
 *
 * 技術スタック:
 *   CSS: Tailwind CSS v4（ユーティリティファーストCSS）
 *   UIコンポーネント: shadcn/ui（Radix UI + Tailwind CSSベース）
 *   importパス「@/components/ui/*」はshadcn/uiコンポーネントです。
 *   導入先にTailwind CSSやshadcn/uiがない場合は、
 *   導入先の技術スタックで同等の見た目・レイアウトを再現してください。
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
 * @moc-intent Dashboard layout mockup
 * @moc-theme light
 * @moc-layout flow
 * @moc-viewport desktop
 *
 * @moc-memo #sidebar "Navigation sidebar with menu items"
 * @moc-memo #mainContent "Main content area for dashboard widgets"
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ${componentName}() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside id="sidebar" className="w-64 border-r bg-muted/40 p-4">
        <h2 className="text-lg font-semibold mb-4">Dashboard</h2>
        <nav className="flex flex-col gap-2">
          <Button variant="ghost" className="justify-start">Home</Button>
          <Button variant="ghost" className="justify-start">Analytics</Button>
          <Button variant="ghost" className="justify-start">Settings</Button>
        </nav>
      </aside>
      <main id="mainContent" className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">1,234</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$12,345</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">567</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
`;
}
