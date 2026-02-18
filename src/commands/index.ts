import * as vscode from "vscode";
import { createMocFile } from "./createMocFile.js";
import { generateFlatTsx } from "../services/flatExportService.js";

export function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("mocker.createMocFile", () =>
      createMocFile(context),
    ),

    vscode.commands.registerCommand("mocker.toggleCodeDesign", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.fileName.endsWith(".moc")) {
        // Toggle between text editor and custom editor
        await vscode.commands.executeCommand(
          "vscode.openWith",
          editor.document.uri,
          "mocker.mocEditor",
        );
      } else {
        // If in custom editor, switch to text editor
        const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
        if (activeTab?.input && typeof activeTab.input === "object") {
          const input = activeTab.input as { uri?: vscode.Uri };
          if (input.uri && input.uri.fsPath.endsWith(".moc")) {
            await vscode.commands.executeCommand(
              "vscode.openWith",
              input.uri,
              "default",
            );
          }
        }
      }
    }),

    vscode.commands.registerCommand("mocker.openPreview", async () => {
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      if (activeTab?.input && typeof activeTab.input === "object") {
        const input = activeTab.input as { uri?: vscode.Uri };
        if (input.uri && input.uri.fsPath.endsWith(".moc")) {
          await vscode.commands.executeCommand(
            "vscode.openWith",
            input.uri,
            "mocker.mocEditor",
            vscode.ViewColumn.Beside,
          );
        }
      }
    }),

    vscode.commands.registerCommand("mocker.switchLayoutMode", () => {
      // Handled by webview internally
      vscode.window.showInformationMessage(
        vscode.l10n.t("command.switchLayoutMode"),
      );
    }),

    vscode.commands.registerCommand("mocker.toggleTheme", () => {
      // Handled by webview internally
      vscode.window.showInformationMessage(
        vscode.l10n.t("command.toggleTheme"),
      );
    }),

    vscode.commands.registerCommand("mocker.exportFlatTsx", async () => {
      const editor = vscode.window.activeTextEditor;
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;

      let uri: vscode.Uri | undefined;
      if (editor && editor.document.fileName.endsWith(".moc")) {
        uri = editor.document.uri;
      } else if (activeTab?.input && typeof activeTab.input === "object") {
        const input = activeTab.input as { uri?: vscode.Uri };
        if (input.uri?.fsPath.endsWith(".moc")) {
          uri = input.uri;
        }
      }

      if (!uri) {
        vscode.window.showErrorMessage("No .moc file is active");
        return;
      }

      const content = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(content);
      const flatTsx = generateFlatTsx(text);

      const doc = await vscode.workspace.openTextDocument({
        content: flatTsx,
        language: "typescriptreact",
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),
  );
}
