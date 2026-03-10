import * as vscode from "vscode";
import * as path from "node:path";
import * as crypto from "node:crypto";
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
import type { MocDocument, MocEditorData, ExtensionToWebviewMessage, WebviewToExtensionMessage, CustomComponentEntry } from "../shared/types.js";
import { isWebToExtMessage } from "../shared/types.js";
import { DEFAULT_METADATA, MOC_VERSION } from "../shared/constants.js";

export class MocEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "momoc.mocEditor";

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
  public static postToWebview(message: ExtensionToWebviewMessage): boolean {
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

    // Track contents we have applied to detect save echoes (multiple saves may overlap)
    const pendingSaveContents = new Set<string>();

    const changeDocumentSubscription =
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() !== document.uri.toString()) return;
        if (e.contentChanges.length === 0) return;           // Non-content events
        const currentText = document.getText();
        if (pendingSaveContents.delete(currentText)) return;    // Echo from our own save
        // Genuine external change – re-parse and send webview-compatible JSON
        const webviewJson = this.fileToWebviewJson(currentText);
        if (webviewJson) {
          webviewPanel.webview.postMessage({
            type: "doc:externalChange",
            payload: { content: webviewJson },
          });
        }
      });

    webviewPanel.webview.onDidReceiveMessage(async (rawMessage) => {
      if (!isWebToExtMessage(rawMessage)) {
        console.warn("[Momoc] Unknown or invalid message from webview:", rawMessage);
        return;
      }
      const message = rawMessage;

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

        // Send current history limit setting
        const historyLimit = vscode.workspace.getConfiguration("momoc").get<number>("historyLimit", 50);
        webviewPanel.webview.postMessage({
          type: "settings:update",
          payload: { historyLimit },
        });
        return;
      }

      await this.handleWebviewMessage(message, document, webviewPanel, pendingSaveContents);
    });

    const changeConfigSubscription =
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("momoc.historyLimit")) {
          const historyLimit = vscode.workspace.getConfiguration("momoc").get<number>("historyLimit", 50);
          webviewPanel.webview.postMessage({
            type: "settings:update",
            payload: { historyLimit },
          });
        }
      });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      changeConfigSubscription.dispose();
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
        intent: mocDoc.metadata.intent,
        layoutMode: mocDoc.metadata.layout,
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
    let parsedIntent: string | undefined;
    let parsedLayoutMode: "flow" | "absolute" | undefined;
    try {
      const parsed = JSON.parse(webviewJson);
      craftState = parsed.craftState || {};
      memos = Array.isArray(parsed.memos) ? parsed.memos : [];
      if (parsed.viewport) {
        viewport = parsed.viewport;
      }
      if (typeof parsed.intent === "string") {
        parsedIntent = parsed.intent;
      }
      if (parsed.layoutMode === "flow" || parsed.layoutMode === "absolute") {
        parsedLayoutMode = parsed.layoutMode;
      }
    } catch {
      // If JSON parsing fails, return as-is
      return webviewJson;
    }

    // Component name is always "MockPage" to avoid invalid JS identifiers
    // (e.g. file names starting with digits like "123_page.moc").
    // The preview uses mod.default so the name has no runtime significance.
    const componentName = "MockPage";

    // Generate TSX from Craft.js state (pass memos for @moc-memo comments)
    let imports: string;
    let tsxSource: string;
    try {
      ({ imports, tsxSource } = craftStateToTsx(craftState as Record<string, unknown>, componentName, memos));
    } catch (err) {
      vscode.window.showErrorMessage(`TSX の生成に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
      imports = "";
      tsxSource = `export default function ${componentName}() {\n  return <div />;\n}`;
    }

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
      intent: parsedIntent ?? existingMeta?.intent ?? "",
      theme: existingMeta?.theme || DEFAULT_METADATA.theme,
      layout: parsedLayoutMode ?? existingMeta?.layout ?? DEFAULT_METADATA.layout,
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
    message: WebviewToExtensionMessage,
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    pendingSaveContents: Set<string>,
  ): Promise<void> {
    switch (message.type) {
      case "doc:save": {
        try {
          if (!message.payload?.content) {
            console.error("[Momoc] doc:save received empty content");
            break;
          }

          // Convert webview JSON → .moc TSX format
          const mocContent = this.webviewJsonToFile(message.payload.content, document.fileName);

          // Register content before async applyEdit so concurrent saves are all tracked
          pendingSaveContents.add(mocContent);

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
            console.error("[Momoc] WorkspaceEdit.applyEdit returned false");
            pendingSaveContents.delete(mocContent);
          }
        } catch (err) {
          console.error("[Momoc] doc:save error:", err);
        }
        break;
      }

      case "doc:requestBuild": {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) break;

        const result = await compileTsx(message.payload.tsx, workspaceRoot);
        if (result.error) {
          webviewPanel.webview.postMessage({
            type: "build:error",
            payload: { componentId: message.payload.componentId, error: result.error },
          } satisfies ExtensionToWebviewMessage);
        } else {
          webviewPanel.webview.postMessage({
            type: "build:result",
            payload: { componentId: message.payload.componentId, jsCode: result.code },
          } satisfies ExtensionToWebviewMessage);
        }
        break;
      }

      case "shadcn:install": {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) break;

        const initialized = await isProjectInitialized(workspaceRoot);
        if (!initialized) {
          await initShadcn(workspaceRoot);
          break;
        }

        const componentMap = getShadcnComponentMap();
        for (const comp of message.payload.components) {
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
        mocDoc.metadata.selection = message.payload;
        break;
      }

      case "command:openBrowserPreview": {
        await vscode.commands.executeCommand("momoc.openBrowserPreview");
        break;
      }

      case "command:exportImage": {
        webviewPanel.webview.postMessage({ type: "capture:start" });
        break;
      }

      case "capture:complete": {
        const { dataUrl } = message.payload;

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
        const { error } = message.payload;
        vscode.window.showErrorMessage(
          vscode.l10n.t("Image capture failed: {0}", error),
        );
        break;
      }

      case "resolve:imageUri": {
        const { src } = message.payload;
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
            payload: { relativePath, targetProp: message.payload?.targetProp },
          });
        }
        break;
      }

      case "browse:imageFile": {
        const docDir = vscode.Uri.joinPath(document.uri, "..");
        const result = await vscode.window.showOpenDialog({
          defaultUri: docDir,
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { "Image Files": ["jpg", "jpeg", "png", "gif", "webp", "svg"] },
        });
        if (result && result[0]) {
          const selectedPath = result[0].fsPath;
          const docDirPath = path.dirname(document.uri.fsPath);
          const relativePath = path.relative(docDirPath, selectedPath).replace(/\\/g, "/");
          webviewPanel.webview.postMessage({
            type: "browse:imageFile:result",
            payload: { relativePath, targetProp: message.payload?.targetProp },
          });
        }
        break;
      }

      case "resolve:mocFile": {
        const { path: mocPath } = message.payload;
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

      case "customComponent:getAll": {
        const entries = this.context.workspaceState.get<CustomComponentEntry[]>("customComponents", []);
        webviewPanel.webview.postMessage({
          type: "customComponent:all",
          payload: entries,
        } satisfies ExtensionToWebviewMessage);
        break;
      }

      case "customComponent:import": {
        const result = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { "Moc Files": ["moc"] },
        });
        if (!result || !result[0]) break;

        const selectedUri = result[0];
        // 自己参照チェック
        if (selectedUri.fsPath === document.uri.fsPath) {
          webviewPanel.webview.postMessage({
            type: "customComponent:importResult",
            payload: { error: "現在開いているファイルは埋め込めません。" },
          } satisfies ExtensionToWebviewMessage);
          break;
        }

        try {
          const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(selectedUri));
          const mocDoc = parseMocFile(content);

          if (mocDoc.metadata.layout !== "absolute") {
            webviewPanel.webview.postMessage({
              type: "customComponent:importResult",
              payload: { error: "ページモードの .moc ファイルは埋め込めません。コンポーネントモードのファイルを選択してください。" },
            } satisfies ExtensionToWebviewMessage);
            break;
          }

          const craftState = mocDoc.editorData?.craftState;
          if (!craftState) {
            webviewPanel.webview.postMessage({
              type: "customComponent:importResult",
              payload: { error: "エディタデータが見つかりませんでした。" },
            } satisfies ExtensionToWebviewMessage);
            break;
          }

          const fileName = path.basename(selectedUri.fsPath, ".moc");
          const entry: CustomComponentEntry = {
            id: crypto.randomUUID(),
            name: fileName,
            path: selectedUri.fsPath,
            craftState: JSON.stringify(craftState),
            layoutMode: mocDoc.metadata.layout,
            importedAt: Date.now(),
          };

          const entries = this.context.workspaceState.get<CustomComponentEntry[]>("customComponents", []);
          entries.push(entry);
          await this.context.workspaceState.update("customComponents", entries);

          webviewPanel.webview.postMessage({
            type: "customComponent:importResult",
            payload: entry,
          } satisfies ExtensionToWebviewMessage);
        } catch (err) {
          webviewPanel.webview.postMessage({
            type: "customComponent:importResult",
            payload: { error: `読み込みに失敗しました: ${err instanceof Error ? err.message : String(err)}` },
          } satisfies ExtensionToWebviewMessage);
        }
        break;
      }

      case "customComponent:reload": {
        const { id } = message.payload;
        const entries = this.context.workspaceState.get<CustomComponentEntry[]>("customComponents", []);
        const idx = entries.findIndex((e) => e.id === id);
        if (idx === -1) {
          webviewPanel.webview.postMessage({
            type: "customComponent:reloadResult",
            payload: { id, entry: null },
          } satisfies ExtensionToWebviewMessage);
          break;
        }

        try {
          const fileUri = vscode.Uri.file(entries[idx].path);
          const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(fileUri));
          const mocDoc = parseMocFile(content);
          const craftState = mocDoc.editorData?.craftState;
          if (craftState) {
            entries[idx] = { ...entries[idx], craftState: JSON.stringify(craftState) };
            await this.context.workspaceState.update("customComponents", entries);
          }
          webviewPanel.webview.postMessage({
            type: "customComponent:reloadResult",
            payload: { id, entry: entries[idx] },
          } satisfies ExtensionToWebviewMessage);
        } catch {
          webviewPanel.webview.postMessage({
            type: "customComponent:reloadResult",
            payload: { id, entry: null },
          } satisfies ExtensionToWebviewMessage);
        }
        break;
      }

      case "customComponent:remove": {
        const { id } = message.payload;
        const entries = this.context.workspaceState.get<CustomComponentEntry[]>("customComponents", []);
        const filtered = entries.filter((e) => e.id !== id);
        await this.context.workspaceState.update("customComponents", filtered);
        webviewPanel.webview.postMessage({
          type: "customComponent:removeResult",
          payload: { id },
        } satisfies ExtensionToWebviewMessage);
        break;
      }

      case "customComponent:updatePath": {
        const { id } = message.payload;
        const entries = this.context.workspaceState.get<CustomComponentEntry[]>("customComponents", []);
        const idx = entries.findIndex((e) => e.id === id);
        if (idx === -1) {
          webviewPanel.webview.postMessage({
            type: "customComponent:updatePathResult",
            payload: { id, entry: null },
          } satisfies ExtensionToWebviewMessage);
          break;
        }

        const result = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { "Moc Files": ["moc"] },
        });
        if (!result || !result[0]) break;

        try {
          const selectedUri = result[0];
          const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(selectedUri));
          const mocDoc = parseMocFile(content);

          if (mocDoc.metadata.layout !== "absolute") {
            webviewPanel.webview.postMessage({
              type: "customComponent:updatePathResult",
              payload: { id, entry: null },
            } satisfies ExtensionToWebviewMessage);
            vscode.window.showErrorMessage("ページモードの .moc ファイルは使用できません。");
            break;
          }

          const craftState = mocDoc.editorData?.craftState;
          if (!craftState) {
            webviewPanel.webview.postMessage({
              type: "customComponent:updatePathResult",
              payload: { id, entry: null },
            } satisfies ExtensionToWebviewMessage);
            break;
          }

          const fileName = path.basename(selectedUri.fsPath, ".moc");
          entries[idx] = {
            ...entries[idx],
            name: fileName,
            path: selectedUri.fsPath,
            craftState: JSON.stringify(craftState),
            layoutMode: mocDoc.metadata.layout,
          };
          await this.context.workspaceState.update("customComponents", entries);

          webviewPanel.webview.postMessage({
            type: "customComponent:updatePathResult",
            payload: { id, entry: entries[idx] },
          } satisfies ExtensionToWebviewMessage);
        } catch {
          webviewPanel.webview.postMessage({
            type: "customComponent:updatePathResult",
            payload: { id, entry: null },
          } satisfies ExtensionToWebviewMessage);
        }
        break;
      }
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
  <title>Momoc</title>
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

