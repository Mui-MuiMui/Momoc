import * as vscode from "vscode";
import * as path from "node:path";
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

  /** Singleton instance for command access */
  private static instance: MocEditorProvider;

  /** Active webview panel (most recently focused) */
  private activeWebviewPanel: vscode.WebviewPanel | undefined;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MocEditorProvider(context);
    MocEditorProvider.instance = provider;
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

  /** Send a message to the active webview panel */
  public static postToWebview(message: { type: string; payload?: unknown }): boolean {
    const panel = MocEditorProvider.instance?.activeWebviewPanel;
    if (panel) {
      panel.webview.postMessage(message);
      return true;
    }
    return false;
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
        vscode.Uri.joinPath(document.uri, ".."),
        ...(vscode.workspace.workspaceFolders?.map((f) => f.uri) ?? []),
      ],
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Track active webview panel
    this.activeWebviewPanel = webviewPanel;
    webviewPanel.onDidChangeViewState(() => {
      if (webviewPanel.active) {
        this.activeWebviewPanel = webviewPanel;
      }
    });

    // Track content we last applied to detect save echoes
    let lastAppliedContent = "";

    const changeDocumentSubscription =
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() !== document.uri.toString()) return;
        if (e.contentChanges.length === 0) return;           // Non-content events
        const currentText = document.getText();
        if (currentText === lastAppliedContent) return;       // Echo from our own save
        // Genuine external change – re-parse and send webview-compatible JSON
        const webviewJson = this.fileToWebviewJson(currentText);
        if (webviewJson) {
          webviewPanel.webview.postMessage({
            type: "doc:externalChange",
            payload: { content: webviewJson },
          });
        }
      });

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "doc:save") {
        const payload = message.payload as { content: string };
        if (payload?.content) {
          lastAppliedContent = this.webviewJsonToFile(payload.content, document.fileName);
        }
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
      if (this.activeWebviewPanel === webviewPanel) {
        this.activeWebviewPanel = undefined;
      }
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
      const json: Record<string, unknown> = {
        version: 1,
        craftState: mocDoc.editorData.craftState,
        memos: mocDoc.editorData.memos,
      };
      // Restore viewport from editorData, or fall back to metadata
      if (mocDoc.editorData.viewport) {
        json.viewport = mocDoc.editorData.viewport;
      } else {
        const vp = mocDoc.metadata.viewport;
        const dimMatch = vp.match(/^(\d+)x(\d+)$/);
        if (dimMatch) {
          json.viewport = { mode: "custom", width: Number(dimMatch[1]), height: Number(dimMatch[2]) };
        }
      }
      return JSON.stringify(json);
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
    let viewport: MocEditorData["viewport"];
    try {
      const parsed = JSON.parse(webviewJson);
      craftState = parsed.craftState || {};
      memos = Array.isArray(parsed.memos) ? parsed.memos : [];
      if (parsed.viewport) {
        viewport = parsed.viewport;
      }
    } catch {
      // If JSON parsing fails, return as-is
      return webviewJson;
    }

    // Derive component name from file name
    const baseName = fileName.replace(/^.*[\\/]/, "").replace(/\.moc$/, "");
    const componentName = baseName || "MockPage";

    // Generate TSX from Craft.js state (pass memos for @moc-memo comments)
    const { imports, tsxSource } = craftStateToTsx(craftState as Record<string, unknown>, componentName, memos);

    // Build @moc-memo tags from full memos (simplified for AI readability)
    const mocMemos = memos
      .filter((m) => m.targetNodeId && (m.title || m.body))
      .map((m) => ({
        targetId: m.targetNodeId!,
        text: m.title ? (m.body ? `${m.title}: ${m.body}` : m.title) : m.body,
      }));

    // Retrieve or create metadata
    const existingMeta = this.documentMetadata.get(docKey);

    // Compute human-readable viewport from webview data
    let metaViewport = existingMeta?.viewport || DEFAULT_METADATA.viewport;
    if (viewport) {
      const presets = ["desktop", "tablet", "mobile"];
      if (presets.includes(viewport.mode)) {
        metaViewport = viewport.mode;
      } else {
        metaViewport = `${viewport.width}x${viewport.height}`;
      }
    }

    const metadata = {
      version: existingMeta?.version || MOC_VERSION,
      intent: existingMeta?.intent || "",
      theme: existingMeta?.theme || DEFAULT_METADATA.theme,
      layout: existingMeta?.layout || DEFAULT_METADATA.layout,
      viewport: metaViewport,
      memos: mocMemos,
      selection: undefined,
    };

    // Build the full .moc document
    const mocDoc: MocDocument = {
      metadata,
      imports,
      tsxSource,
      rawContent: "",
      editorData: { craftState, memos, viewport },
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

      case "command:openBrowserPreview": {
        await vscode.commands.executeCommand("mocker.openBrowserPreview");
        break;
      }

      case "command:exportImage": {
        webviewPanel.webview.postMessage({ type: "capture:start" });
        break;
      }

      case "capture:complete": {
        const { dataUrl } = message.payload as { dataUrl: string };

        const defaultUri = vscode.Uri.file(
          document.fileName.replace(/\.moc$/, ".png"),
        );

        const saveUri = await vscode.window.showSaveDialog({
          defaultUri,
          filters: { "PNG Image": ["png"] },
        });

        if (saveUri) {
          const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
          const buffer = Buffer.from(base64, "base64");
          await vscode.workspace.fs.writeFile(saveUri, buffer);
          vscode.window.showInformationMessage(
            vscode.l10n.t("Image saved: {0}", saveUri.fsPath),
          );
        }
        break;
      }

      case "capture:error": {
        const { error } = message.payload as { error: string };
        vscode.window.showErrorMessage(
          vscode.l10n.t("Image capture failed: {0}", error),
        );
        break;
      }

      case "resolve:imageUri": {
        const { src } = message.payload as { src: string };
        let fileUri: vscode.Uri;
        if (path.isAbsolute(src)) {
          fileUri = vscode.Uri.file(src);
        } else {
          const docDir = vscode.Uri.joinPath(document.uri, "..");
          fileUri = vscode.Uri.joinPath(docDir, src);
        }
        const webviewUri = webviewPanel.webview.asWebviewUri(fileUri);
        webviewPanel.webview.postMessage({
          type: "resolve:imageUri:result",
          payload: { src, uri: webviewUri.toString() },
        });
        break;
      }

      case "browse:mocFile": {
        const browsePayload = message.payload as { currentPath?: string; targetProp?: string };
        const docDir = vscode.Uri.joinPath(document.uri, "..");
        const result = await vscode.window.showOpenDialog({
          defaultUri: docDir,
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { "Moc Files": ["moc"] },
        });
        if (result && result[0]) {
          const selectedPath = result[0].fsPath;
          const docDirPath = path.dirname(document.uri.fsPath);
          const relativePath = path.relative(docDirPath, selectedPath).replace(/\\/g, "/");
          webviewPanel.webview.postMessage({
            type: "browse:mocFile:result",
            payload: { relativePath, targetProp: browsePayload?.targetProp },
          });
        }
        break;
      }

      case "resolve:mocFile": {
        const { path: mocPath } = message.payload as { path: string };
        let filePath: string;
        if (path.isAbsolute(mocPath)) {
          filePath = mocPath;
        } else {
          const docDir = path.dirname(document.uri.fsPath);
          filePath = path.join(docDir, mocPath);
        }
        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
          webviewPanel.webview.postMessage({
            type: "resolve:mocFile:result",
            payload: { path: mocPath, exists: true },
          });
        } catch {
          webviewPanel.webview.postMessage({
            type: "resolve:mocFile:result",
            payload: { path: mocPath, exists: false },
          });
        }
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data: blob: https: http:; connect-src ${webview.cspSource} https: http: data: blob:;">
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

