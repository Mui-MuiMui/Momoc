import * as vscode from "vscode";
import { compileTsx } from "../services/esbuildService.js";
import {
  isProjectInitialized,
  initShadcn,
  installComponent,
  getShadcnComponentMap,
} from "../services/shadcnService.js";
import { parseMocFile } from "../services/mocParser.js";
import { serializeMocFile } from "../services/mocSerializer.js";
import type { MocDocument } from "../shared/types.js";

export class MocEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "mocker.mocEditor";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MocEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      MocEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview"),
      ],
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Track edits we applied ourselves to avoid echoing them back
    let suppressExternalChange = false;

    const changeDocumentSubscription =
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          if (suppressExternalChange) {
            suppressExternalChange = false;
            return;
          }
          webviewPanel.webview.postMessage({
            type: "doc:externalChange",
            payload: { content: document.getText() },
          });
        }
      });

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "doc:save") {
        suppressExternalChange = true;
      }
      await this.handleWebviewMessage(message, document, webviewPanel);
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.postMessage({
      type: "doc:load",
      payload: {
        content: document.getText(),
        fileName: document.fileName,
      },
    });

    // Send locale info
    const locale = vscode.env.language;
    webviewPanel.webview.postMessage({
      type: "i18n:locale",
      payload: { locale, messages: {} },
    });
  }

  private async handleWebviewMessage(
    message: { type: string; payload?: unknown },
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    switch (message.type) {
      case "doc:save": {
        const payload = message.payload as { content: string };
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(0, 0, document.lineCount, 0),
          payload.content,
        );
        await vscode.workspace.applyEdit(edit);
        break;
      }

      case "doc:requestBuild": {
        const payload = message.payload as {
          componentId: string;
          tsx: string;
        };
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) break;

        const result = await compileTsx(payload.tsx, workspaceRoot);
        if (result.error) {
          webviewPanel.webview.postMessage({
            type: "build:error",
            payload: { componentId: payload.componentId, error: result.error },
          });
        } else {
          webviewPanel.webview.postMessage({
            type: "build:result",
            payload: { componentId: payload.componentId, jsCode: result.code },
          });
        }
        break;
      }

      case "shadcn:install": {
        const payload = message.payload as { components: string[] };
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) break;

        const initialized = await isProjectInitialized(workspaceRoot);
        if (!initialized) {
          await initShadcn(workspaceRoot);
          break;
        }

        const componentMap = getShadcnComponentMap();
        for (const comp of payload.components) {
          const shadcnName = componentMap[comp];
          if (shadcnName) {
            await installComponent(workspaceRoot, shadcnName);
          }
        }
        break;
      }

      case "selection:change": {
        // Store selection context for agent access
        const content = document.getText();
        const mocDoc = parseMocFile(content);
        mocDoc.metadata.selection = message.payload as MocDocument["metadata"]["selection"];
        // Update the .moc file with selection context
        // (for agent consumption via filesystem)
        break;
      }

      case "editor:ready":
        break;
    }
  }

  private getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distUri = vscode.Uri.joinPath(
      this.context.extensionUri,
      "dist",
      "webview",
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, "assets", "index.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, "assets", "index.css"),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data: blob: https:; connect-src ${webview.cspSource};">
  <link rel="stylesheet" href="${styleUri}">
  <title>Mocker</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
