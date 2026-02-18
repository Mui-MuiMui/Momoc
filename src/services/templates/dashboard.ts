export function dashboardTemplate(
  componentName: string,
  uuid: string,
): string {
  return `/**
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
