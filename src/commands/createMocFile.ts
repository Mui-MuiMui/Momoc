import * as vscode from "vscode";
import { v4Template } from "../services/templates/empty.js";

export async function createMocFile(
  context: vscode.ExtensionContext,
): Promise<void> {
  const fileName = await vscode.window.showInputBox({
    prompt: "File name",
    value: "NewComponent.moc",
    validateInput: (value) => {
      if (!value.endsWith(".moc")) {
        return "File must have .moc extension";
      }
      return undefined;
    },
  });

  if (!fileName) {
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const componentName = fileName.replace(".moc", "");
  const content = v4Template(componentName);

  const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
  await vscode.workspace.fs.writeFile(
    fileUri,
    new TextEncoder().encode(content),
  );

  await vscode.commands.executeCommand("vscode.open", fileUri);
}
