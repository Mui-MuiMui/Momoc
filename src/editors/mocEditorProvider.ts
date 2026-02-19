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
import { craftStateToTsx } from "../services/craftToTsx.js";
import type { MocDocument, MocEditorData } from "../shared/types.js";
import { DEFAULT_METADATA, MOC_VERSION } from "../shared/constants.js";

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

  /** Cached metadata from the last parsed .moc file, preserved across saves */
  private documentMetadata = new Map<string, MocDocument["metadata"]>();

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
          // On external change, re-parse and send webview-compatible JSON
          const webviewJson = this.fileToWebviewJson(document.getText());
          if (webviewJson) {
            webviewPanel.webview.postMessage({
              type: "doc:externalChange",
              payload: { content: webviewJson },
            });
          }
        }
      });

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "doc:save") {
        suppressExternalChange = true;
      }

      // When the webview React app is ready, send initial data
      if (message.type === "editor:ready") {
        const webviewJson = this.fileToWebviewJson(document.getText());
        webviewPanel.webview.postMessage({
          type: "doc:load",
          payload: {
            content: webviewJson || "",
            fileName: document.fileName,
          },
        });

        const locale = vscode.env.language;
        webviewPanel.webview.postMessage({
          type: "i18n:locale",
          payload: { locale, messages: {} },
        });
        return;
      }

      await this.handleWebviewMessage(message, document, webviewPanel);
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      this.documentMetadata.delete(document.uri.toString());
    });
  }

  /**
   * Convert .moc TSX file content → webview-compatible JSON string.
   * The webview expects: { version: 1, craftState: {...}, memos: [...] }
   */
  private fileToWebviewJson(fileContent: string): string | undefined {
    const docKey = "current";

    const mocDoc = parseMocFile(fileContent);
    this.documentMetadata.set(docKey, mocDoc.metadata);

    if (mocDoc.editorData) {
      return JSON.stringify({
        version: 1,
        craftState: mocDoc.editorData.craftState,
        memos: mocDoc.editorData.memos,
      });
    }

    // New file from template (TSX with metadata but no editor-data yet)
    return undefined;
  }

  /**
   * Convert webview JSON → .moc TSX file content for saving.
   */
  private webviewJsonToFile(webviewJson: string, fileName: string): string {
    const docKey = "current";

    let craftState: Record<string, unknown>;
    let memos: MocEditorData["memos"];
    try {
      const parsed = JSON.parse(webviewJson);
      craftState = parsed.craftState || {};
      memos = Array.isArray(parsed.memos) ? parsed.memos : [];
    } catch {
      // If JSON parsing fails, return as-is
      return webviewJson;
    }

    // Derive component name from file name
    const baseName = fileName.replace(/^.*[\\/]/, "").replace(/\.moc$/, "");
    const componentName = baseName || "MockPage";

    // Generate TSX from Craft.js state
    const { imports, tsxSource } = craftStateToTsx(craftState as Record<string, unknown>, componentName);

    // Build @moc-memo tags from full memos (simplified for AI readability)
    const mocMemos = memos
      .filter((m) => m.targetNodeId && (m.title || m.body))
      .map((m) => ({
        targetId: m.targetNodeId!,
        text: m.title ? (m.body ? `${m.title}: ${m.body}` : m.title) : m.body,
      }));

    // Retrieve or create metadata
    const existingMeta = this.documentMetadata.get(docKey);
    const metadata = {
      version: existingMeta?.version || MOC_VERSION,
      id: existingMeta?.id || generateUuid(),
      intent: existingMeta?.intent || "",
      theme: existingMeta?.theme || DEFAULT_METADATA.theme,
      layout: existingMeta?.layout || DEFAULT_METADATA.layout,
      viewport: existingMeta?.viewport || DEFAULT_METADATA.viewport,
      memos: mocMemos,
      selection: undefined,
    };

    // Build the full .moc document
    const mocDoc: MocDocument = {
      metadata,
      imports,
      tsxSource,
      rawContent: "",
      editorData: { craftState, memos },
    };

    return serializeMocFile(mocDoc);
  }

  private async handleWebviewMessage(
    message: { type: string; payload?: unknown },
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    switch (message.type) {
      case "doc:save": {
        try {
          const payload = message.payload as { content: string };
          if (!payload?.content) {
            console.error("[Mocker] doc:save received empty content");
            break;
          }

          // Convert webview JSON → .moc TSX format
          const mocContent = this.webviewJsonToFile(payload.content, document.fileName);

          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            0,
            0,
            document.lineCount,
            document.lineAt(Math.max(0, document.lineCount - 1)).text.length,
          );
          edit.replace(document.uri, fullRange, mocContent);
          const success = await vscode.workspace.applyEdit(edit);
          if (!success) {
            console.error("[Mocker] WorkspaceEdit.applyEdit returned false");
          }
        } catch (err) {
          console.error("[Mocker] doc:save error:", err);
        }
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

function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
