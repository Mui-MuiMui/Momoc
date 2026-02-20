import * as vscode from "vscode";
import { MocEditorProvider } from "./editors/mocEditorProvider.js";
import { registerCommands } from "./commands/index.js";
import { disposeAll as disposePreviewServers } from "./services/previewServer.js";

export function activate(context: vscode.ExtensionContext): void {
  const provider = MocEditorProvider.register(context);
  context.subscriptions.push(provider);

  registerCommands(context);

  console.log("Mocker extension activated");
}

export function deactivate(): void {
  disposePreviewServers();
  console.log("Mocker extension deactivated");
}
