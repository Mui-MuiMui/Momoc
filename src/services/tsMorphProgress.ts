import * as vscode from "vscode";

export function withTsMorphProgress<T>(
  title: string,
  fn: () => Promise<T>,
): Promise<T> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
    },
    () => fn(),
  );
}
