export function v4Template(componentName: string, uuid: string): string {
  return `/**
 * @moc-version 1.0.0
 * @moc-id ${uuid}
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
