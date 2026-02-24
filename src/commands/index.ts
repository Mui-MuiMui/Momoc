import * as vscode from "vscode";
import { createMocFile } from "./createMocFile.js";
import { generateFlatTsx } from "../services/flatExportService.js";
import { MocEditorProvider } from "../editors/mocEditorProvider.js";
import { startPreviewServer, getActiveSession } from "../services/previewServer.js";
import { parseMocFile } from "../services/mocParser.js";

export function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("momoc.createMocFile", () =>
      createMocFile(context),
    ),

    vscode.commands.registerCommand("momoc.toggleCodeDesign", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.fileName.endsWith(".moc")) {
        // Toggle between text editor and custom editor
        await vscode.commands.executeCommand(
          "vscode.openWith",
          editor.document.uri,
          "momoc.mocEditor",
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

    vscode.commands.registerCommand("momoc.openPreview", async () => {
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      if (activeTab?.input && typeof activeTab.input === "object") {
        const input = activeTab.input as { uri?: vscode.Uri };
        if (input.uri && input.uri.fsPath.endsWith(".moc")) {
          await vscode.commands.executeCommand(
            "vscode.openWith",
            input.uri,
            "momoc.mocEditor",
            vscode.ViewColumn.Beside,
          );
        }
      }
    }),

    vscode.commands.registerCommand("momoc.switchLayoutMode", () => {
      if (!MocEditorProvider.postToWebview({ type: "command:switchLayoutMode" })) {
        vscode.window.showWarningMessage("No active Momoc editor");
      }
    }),

    vscode.commands.registerCommand("momoc.toggleTheme", () => {
      if (!MocEditorProvider.postToWebview({ type: "command:toggleTheme" })) {
        vscode.window.showWarningMessage("No active Momoc editor");
      }
    }),

    vscode.commands.registerCommand("momoc.openBrowserPreview", async () => {
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      let uri: vscode.Uri | undefined;

      const editor = vscode.window.activeTextEditor;
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

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder open");
        return;
      }

      const mocFilePath = uri.fsPath;

      // Check if already running for this file
      const existing = getActiveSession(mocFilePath);
      if (existing) {
        await vscode.env.openExternal(vscode.Uri.parse(existing.url));
        return;
      }

      // Read theme from .moc file
      const content = new TextDecoder().decode(
        await vscode.workspace.fs.readFile(uri),
      );
      const mocDoc = parseMocFile(content);
      const theme = mocDoc.metadata.theme;

      const { url, dispose } = await startPreviewServer(
        mocFilePath,
        workspaceRoot,
        theme,
      );
      context.subscriptions.push({ dispose });

      await vscode.env.openExternal(vscode.Uri.parse(url));
    }),

    vscode.commands.registerCommand("momoc.exportImage", () => {
      if (!MocEditorProvider.postToWebview({ type: "capture:start" })) {
        vscode.window.showWarningMessage("No active Momoc editor");
      }
    }),

    vscode.commands.registerCommand("momoc.exportFlatTsx", async () => {
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
