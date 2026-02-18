export function loginFormTemplate(
  componentName: string,
  uuid: string,
): string {
  return `/**
 * @moc-version 1.0.0
 * @moc-id ${uuid}
 * @moc-intent Login form mockup
 * @moc-theme light
 * @moc-layout flow
 * @moc-viewport desktop
 *
 * @moc-memo #loginButton "Submit button for login action"
 * @moc-memo #emailInput "Email validation required"
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ${componentName}() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="emailInput">Email</Label>
            <Input id="emailInput" type="email" placeholder="email@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="passwordInput">Password</Label>
            <Input id="passwordInput" type="password" placeholder="Enter password" />
          </div>
          <Button id="loginButton" variant="default" className="w-full">
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
`;
}
