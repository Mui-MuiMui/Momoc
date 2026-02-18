import * as vscode from "vscode";
import { getTemplates, getTemplateContent } from "../services/templateService.js";

export async function createMocFile(
  context: vscode.ExtensionContext,
): Promise<void> {
  const templates = getTemplates();

  const selected = await vscode.window.showQuickPick(
    templates.map((t) => ({
      label: t.label,
      description: t.description,
      id: t.id,
    })),
    {
      placeHolder: vscode.l10n.t("template.selectPlaceholder"),
      title: vscode.l10n.t("template.selectTitle"),
    },
  );

  if (!selected) {
    return;
  }

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

  const template = templates.find((t) => t.id === (selected as { id: string }).id);
  if (!template) {
    return;
  }

  const componentName = fileName.replace(".moc", "");
  const content = getTemplateContent(template.id, componentName);

  const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
  await vscode.workspace.fs.writeFile(
    fileUri,
    new TextEncoder().encode(content),
  );

  await vscode.commands.executeCommand("vscode.open", fileUri);
}
