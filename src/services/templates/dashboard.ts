export function dashboardTemplate(
  componentName: string,
  uuid: string,
): string {
  return `/**
 * Mocker Document (.moc)
 * VSCode\u62E1\u5F35\u300CMocker\u300D\u3067\u4F5C\u6210\u3055\u308C\u305FGUI\u30E2\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u3067\u3059\u3002
 * \u4EBA\u9593\u30FBGUI\u30FBAI\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u304C\u5354\u8ABF\u3057\u3066\u958B\u767A\u3092\u884C\u3046\u305F\u3081\u306E\u7D71\u5408\u30C7\u30FC\u30BF\u5F62\u5F0F\u3067\u3059\u3002
 *
 * \u30D5\u30A1\u30A4\u30EB\u69CB\u9020:
 *   \u672C\u30D5\u30A1\u30A4\u30EB\u306FTSX\uFF08TypeScript JSX\uFF09\u5F62\u5F0F\u3092\u30D9\u30FC\u30B9\u3068\u3057\u3001
 *   \u30E1\u30BF\u30C7\u30FC\u30BF\u3068\u4ED8\u7B8B\u30E1\u30E2\u3092JSDoc\u30B3\u30E1\u30F3\u30C8\u5185\u306B\u3001
 *   \u30A8\u30C7\u30A3\u30BF\u5185\u90E8\u72B6\u614B\u3092\u672B\u5C3E\u30B3\u30E1\u30F3\u30C8\u30D6\u30ED\u30C3\u30AF\u306B\u683C\u7D0D\u3057\u3066\u3044\u307E\u3059\u3002
 *   TSX\u90E8\u5206\u306F\u305D\u306E\u307E\u307EReact\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u3068\u3057\u3066\u8AAD\u89E3\u53EF\u80FD\u3067\u3059\u3002
 *
 * \u30E1\u30BF\u30C7\u30FC\u30BF:
 *   @moc-version  - \u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u5F62\u5F0F\u30D0\u30FC\u30B8\u30E7\u30F3
 *   @moc-id       - \u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u56FA\u6709ID
 *   @moc-intent   - \u3053\u306E\u30DA\u30FC\u30B8\u306E\u76EE\u7684\u30FB\u610F\u56F3\uFF08\u4EBA\u9593\u304C\u8A18\u8FF0\uFF09
 *   @moc-theme    - \u30C6\u30FC\u30DE (light | dark)
 *   @moc-layout   - \u30EC\u30A4\u30A2\u30A6\u30C8\u30E2\u30FC\u30C9 (flow | absolute)
 *   @moc-viewport - \u5BFE\u8C61\u30D3\u30E5\u30FC\u30DD\u30FC\u30C8 (desktop | tablet | mobile)
 *
 * AI\u6307\u793A\u30E1\u30E2 (@moc-memo):
 *   \u30E6\u30FC\u30B6\u30FC\u304C\u30AD\u30E3\u30F3\u30D0\u30B9\u4E0A\u306B\u914D\u7F6E\u3057\u305F\u3001AI\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3078\u306E\u6307\u793A\u4ED8\u7B8B\u3067\u3059\u3002
 *   \u66F8\u5F0F: @moc-memo #<\u5BFE\u8C61\u8981\u7D20ID> "\u6307\u793A\u30C6\u30AD\u30B9\u30C8"
 *   AI\u306F\u3053\u306E\u30E1\u30E2\u3092\u8AAD\u307F\u53D6\u308A\u3001\u8A72\u5F53\u8981\u7D20\u306B\u5BFE\u3059\u308B\u4FEE\u6B63\u30FB\u63D0\u6848\u3092\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002
 *
 * @moc-version 1.0.0
 * @moc-id ${uuid}
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
