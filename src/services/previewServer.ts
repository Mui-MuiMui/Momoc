import * as http from "http";
import * as path from "path";
import * as crypto from "crypto";
import * as vscode from "vscode";
import { compileTsx } from "./esbuildService.js";
import { parseMocFile, extractComponentName } from "./mocParser.js";
import { craftStateToTsx } from "./craftToTsx.js";

interface PreviewSession {
  server: http.Server;
  url: string;
  mocFilePath: string;
  dispose: () => void;
  /** スナップショットゲッターを更新する（既存セッション再利用時） */
  updateSnapshotMap: (getter: () => Record<string, string>) => void;
}

const activeSessions = new Map<string, PreviewSession>();

async function findAvailablePort(basePort: number): Promise<number> {
  const net = await import("net");
  for (let port = basePort; port < basePort + 10; port++) {
    const available = await new Promise<boolean>((resolve) => {
      const srv = net.createServer();
      srv.once("error", () => resolve(false));
      srv.once("listening", () => srv.close(() => resolve(true)));
      srv.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  return 0; // fallback to random port
}

export async function startPreviewServer(
  mocFilePath: string,
  workspaceRoot: string,
  theme: "light" | "dark",
  getSnapshotMap: () => Record<string, string> = () => ({}),
): Promise<{ url: string; dispose: () => void }> {
  // If a session already exists for this file, update snapshot map and return it
  const existing = activeSessions.get(mocFilePath);
  if (existing) {
    existing.updateSnapshotMap(getSnapshotMap);
    return { url: existing.url, dispose: existing.dispose };
  }

  // State
  let currentGetSnapshotMap = getSnapshotMap;
  let currentTheme = theme;
  let cachedComponentJs = "";
  let cachedError = "";
  const sseClients = new Set<http.ServerResponse>();
  const linkedJs = new Map<string, string>(); // hash → compiled JS for linked .moc files
  const linkedHashes = new Map<string, string>(); // relPath → hash
  const linkedAbsPaths = new Set<string>(); // absolute paths of linked .moc files

  // Pre-compile fallback shadcn/ui components → ESM JS
  const fallbackJs = new Map<string, string>();
  for (const [name, source] of Object.entries(FALLBACK_SOURCES)) {
    const result = await compileTsx(source, workspaceRoot, [
      previewExternalPlugin(),
    ]);
    if (result.code) {
      fallbackJs.set(name, result.code);
    }
  }

  // Initial compile of the .moc component
  await compileCurrentFile();

  async function compileCurrentFile(): Promise<void> {
    try {
      const fileUri = vscode.Uri.file(mocFilePath);
      const content = new TextDecoder().decode(
        await vscode.workspace.fs.readFile(fileUri),
      );
      const mocDoc = parseMocFile(content);
      currentTheme = mocDoc.metadata.theme;

      // Compile linked .moc files first (needed for injection)
      linkedJs.clear();
      linkedHashes.clear();
      const craftState = mocDoc.editorData?.craftState;
      if (craftState) {
        await compileLinkedMocFiles(craftState);
      }

      // Regenerate TSX from craftState (SSOT) to ensure latest props are reflected
      let fullTsx: string;
      if (craftState) {
        const componentName = extractComponentName(mocDoc.tsxSource) || "MockPage";
        const memos = mocDoc.editorData?.memos;
        const generated = craftStateToTsx(
          craftState as Record<string, Record<string, unknown>>,
          componentName,
          memos,
        );
        fullTsx = generated.imports
          ? `${generated.imports}\n${generated.tsxSource}`
          : generated.tsxSource;
      } else {
        fullTsx = mocDoc.imports
          ? `${mocDoc.imports}\n${mocDoc.tsxSource}`
          : mocDoc.tsxSource;
      }

      // Inject linked component imports and replace comment placeholders
      fullTsx = injectLinkedComponents(fullTsx);

      // Externalize @/components/ui/*, react, @moc-linked/* — browser resolves via import map
      const result = await compileTsx(fullTsx, workspaceRoot, [
        previewExternalPlugin(),
      ]);
      if (result.error) {
        cachedError = result.error;
        cachedComponentJs = "";
      } else {
        cachedComponentJs = result.code;
        cachedError = "";
      }
    } catch (err) {
      cachedError = err instanceof Error ? err.message : String(err);
      cachedComponentJs = "";
    }
  }

  async function compileLinkedMocFiles(craftState: Record<string, unknown>): Promise<void> {
    const mocDir = path.dirname(mocFilePath);

    // Collect linked paths from a craftState node tree.
    // Returns pairs of [relPathFromMocDir, absPath].
    function collectLinkedPaths(cs: Record<string, unknown>, baseDir: string): [string, string][] {
      const pairs: [string, string][] = [];
      for (const node of Object.values(cs)) {
        const n = node as { props?: Record<string, unknown> };
        for (const key of ["linkedMocPath", "contextMenuMocPath", "hoverCardMocPath"]) {
          const p = n?.props?.[key] as string | undefined;
          if (p) {
            const abs = path.resolve(baseDir, p);
            const rel = path.relative(mocDir, abs).replace(/\\/g, "/");
            pairs.push([rel, abs]);
          }
        }
        const multi = n?.props?.linkedMocPaths as string | undefined;
        if (multi) {
          for (const p of multi.split(",").map((s) => s.trim()).filter(Boolean)) {
            const abs = path.resolve(baseDir, p);
            const rel = path.relative(mocDir, abs).replace(/\\/g, "/");
            pairs.push([rel, abs]);
          }
        }
        // buttonData JSON: scan each button's linkedMocPath
        const buttonDataStr = n?.props?.buttonData as string | undefined;
        if (buttonDataStr) {
          try {
            const btns = JSON.parse(buttonDataStr) as Array<{ linkedMocPath?: string }>;
            for (const btn of btns) {
              if (btn.linkedMocPath) {
                const abs = path.resolve(baseDir, btn.linkedMocPath);
                const rel = path.relative(mocDir, abs).replace(/\\/g, "/");
                pairs.push([rel, abs]);
              }
            }
          } catch { /* ignore */ }
        }
      }
      return pairs;
    }

    // BFS: discover all linked .moc files recursively (handles nested chains A→B→C).
    // visited tracks absPath to prevent infinite loops on circular references.
    const toProcess = new Map<string, string>(); // relPath → absPath
    const visited = new Set<string>();
    const queue: [string, string][] = collectLinkedPaths(craftState, mocDir);

    const snapshotMap = currentGetSnapshotMap();

    while (queue.length > 0) {
      const [relPath, absPath] = queue.shift()!;
      if (visited.has(absPath)) continue;
      visited.add(absPath);
      toProcess.set(relPath, absPath);

      try {
        let cs: Record<string, unknown> | undefined;
        if (snapshotMap[absPath]) {
          cs = JSON.parse(snapshotMap[absPath]) as Record<string, unknown>;
        } else {
          const content = new TextDecoder().decode(
            await vscode.workspace.fs.readFile(vscode.Uri.file(absPath)),
          );
          const doc = parseMocFile(content);
          cs = doc.editorData?.craftState as Record<string, unknown> | undefined;
        }
        if (cs) {
          for (const pair of collectLinkedPaths(cs, path.dirname(absPath))) {
            if (!visited.has(pair[1])) queue.push(pair);
          }
        }
      } catch (err) {
        console.warn(`[Momoc] Failed to scan linked .moc: ${relPath}`, err);
      }
    }

    // Pass 1: parse all linked files and register hashes.
    // All hashes must be registered before inject so nested placeholders resolve correctly.
    linkedAbsPaths.clear();
    const parsedDocs = new Map<string, { tsx: string }>();

    for (const [relPath, absPath] of toProcess) {
      try {
        // スナップショットがあるファイルはウォッチ対象から外す
        // → C.moc を保存してもプレビューが自動更新されない（明示的な再読み込みが必要）
        if (!snapshotMap[absPath]) {
          linkedAbsPaths.add(absPath);
        }
        let linkedTsx: string;
        if (snapshotMap[absPath]) {
          // スナップショット優先: ディスク読み込みをスキップ
          const linkedCraftState = JSON.parse(snapshotMap[absPath]) as Record<string, Record<string, unknown>>;
          const linkedComponentName = path.basename(absPath, ".moc") || "LinkedComponent";
          const linkedGenerated = craftStateToTsx(linkedCraftState, linkedComponentName, undefined);
          const linkedTsxSource = linkedGenerated.tsxSource.replace(/\bmin-h-screen\b/g, "");
          linkedTsx = linkedGenerated.imports
            ? `${linkedGenerated.imports}\n${linkedTsxSource}`
            : linkedTsxSource;
        } else {
          const linkedContent = new TextDecoder().decode(
            await vscode.workspace.fs.readFile(vscode.Uri.file(absPath)),
          );
          const linkedDoc = parseMocFile(linkedContent);
          // Re-generate TSX from craftState (SSOT) so linked .moc always reflects
          // the latest renderContextMenu / renderMenubar output, not stale stored TSX.
          const linkedCraftState = linkedDoc.editorData?.craftState as Record<string, Record<string, unknown>> | undefined;
          if (linkedCraftState) {
            const linkedComponentName = extractComponentName(linkedDoc.tsxSource) || "LinkedComponent";
            const linkedMemos = linkedDoc.editorData?.memos;
            const linkedGenerated = craftStateToTsx(linkedCraftState, linkedComponentName, linkedMemos);
            const linkedTsxSource = linkedGenerated.tsxSource.replace(/\bmin-h-screen\b/g, "");
            linkedTsx = linkedGenerated.imports
              ? `${linkedGenerated.imports}\n${linkedTsxSource}`
              : linkedTsxSource;
          } else {
            // Fallback: use stored TSX if no craftState available
            const linkedTsxSource = linkedDoc.tsxSource.replace(/\bmin-h-screen\b/g, "");
            linkedTsx = linkedDoc.imports
              ? `${linkedDoc.imports}\n${linkedTsxSource}`
              : linkedTsxSource;
          }
        }
        // Skip empty .moc files entirely (no hash registration = no import map entry)
        if (!linkedTsx.trim()) {
          console.warn(`[Momoc] Skipping empty linked .moc: ${relPath}`);
          continue;
        }
        // コンテンツベースのハッシュ: TSX内容が変われば異なるURLになりブラウザキャッシュが無効化される
        const hash = crypto.createHash("md5").update(linkedTsx).digest("hex").slice(0, 8);
        linkedHashes.set(relPath, hash);
        parsedDocs.set(relPath, { tsx: linkedTsx });
      } catch (err) {
        console.warn(`[Momoc] Failed to parse linked .moc: ${relPath}`, err);
      }
    }

    // Pass 2: inject nested linked component references, then compile.
    // injectLinkedComponents uses linkedHashes, so all hashes must be registered first (Pass 1).
    for (const [relPath, { tsx }] of parsedDocs) {
      const hash = linkedHashes.get(relPath);
      if (!hash) continue;
      const absPath = toProcess.get(relPath);
      const fileDir = absPath ? path.dirname(absPath) : undefined;
      try {
        const injected = injectLinkedComponents(tsx, fileDir);
        const linkedResult = await compileTsx(injected, workspaceRoot, [
          previewExternalPlugin(),
        ]);
        if (linkedResult.code) {
          linkedJs.set(hash, linkedResult.code);
        }
      } catch (err) {
        console.warn(`[Momoc] Failed to compile linked .moc: ${relPath}`, err);
      }
    }
  }

  /**
   * Replace `{/* linked: PATH * /}` comment placeholders in TSX source
   * with actual import + component reference so they render in preview.
   */
  function injectLinkedComponents(tsx: string, fileDir?: string): string {
    if (linkedHashes.size === 0) return tsx;

    const importLines: string[] = [];
    const usedHashes = new Set<string>();
    const mocDir = path.dirname(mocFilePath);

    const processed = tsx.replace(
      /\{\/\* linked: (.+?) \*\/\}/g,
      (_match: string, rawPath: string) => {
        // Un-escape JSX entities that escapeJsx may have applied
        const linkedPath = rawPath
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#123;/g, "{")
          .replace(/&#125;/g, "}");
        // If processing a nested file, linkedPath is relative to fileDir.
        // Convert to mocDir-relative path so it matches linkedHashes keys.
        let lookupPath = linkedPath;
        if (fileDir && !path.isAbsolute(linkedPath)) {
          const abs = path.resolve(fileDir, linkedPath);
          lookupPath = path.relative(mocDir, abs).replace(/\\/g, "/");
        }
        const hash = linkedHashes.get(lookupPath);
        if (!hash) return `{/* linked: ${rawPath} (not compiled) */}`;
        const componentName = `Linked_${hash}`;
        if (!usedHashes.has(hash)) {
          usedHashes.add(hash);
          importLines.push(`import ${componentName} from "@moc-linked/${hash}";`);
        }
        return `<div style={{ width: "100%", overflow: "auto", minWidth: 0 }}><${componentName} /></div>`;
      },
    );

    if (importLines.length === 0) return tsx;
    return importLines.join("\n") + "\n" + processed;
  }

  function sendReload(fullReload = false): void {
    const data = JSON.stringify({ theme: currentTheme, fullReload });
    for (const res of sseClients) {
      res.write(`event: reload\ndata: ${data}\n\n`);
    }
  }

  // Build import map: React (esm.sh) + shadcn/ui fallback routes + linked components
  function buildImportMap(): string {
    const imports: Record<string, string> = {
      "react": "https://esm.sh/react@19",
      "react-dom": "https://esm.sh/react-dom@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client",
      "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime",
    };
    for (const name of Object.keys(FALLBACK_SOURCES)) {
      imports[`@/components/ui/${name}`] = `/ui/${name}.js`;
    }
    // Linked .moc components
    for (const [, hash] of linkedHashes) {
      imports[`@moc-linked/${hash}`] = `/linked/${hash}.js`;
    }
    // tailwind-merge for className conflict resolution (cn utility)
    imports["tailwind-merge"] = "https://esm.sh/tailwind-merge@2";
    // lucide-react icons
    imports["lucide-react"] = "https://esm.sh/lucide-react@0.469.0?external=react";
    // sonner toast — fallback implementation for preview
    imports["sonner"] = "/ui/sonner.js";
    return JSON.stringify({ imports }, null, 4);
  }

  function buildPreviewHtml(): string {
    const darkClass = currentTheme === "dark" ? ' class="dark"' : "";
    const errorHtml = cachedError
      ? `<pre id="error" style="color:red;padding:1rem;font-family:monospace;white-space:pre-wrap;">${escapeHtml(cachedError)}</pre>`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Momoc Preview</title>
  <script type="importmap">
  ${buildImportMap()}
  </script>
  <style>
    :root {
      --radius: 0.625rem;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background-color: var(--color-background);
      color: var(--color-foreground);
    }
    /* Toggle: icon fill when pressed */
    [data-toggle-pressed] svg.lucide { fill: currentColor; }
  </style>
  <script src="/tailwindcss-browser.js"></script>
  <style type="text/tailwindcss">
    @import "tailwindcss";
    @theme {
      --color-background: oklch(1 0 0);
      --color-foreground: oklch(0.145 0 0);
      --color-card: oklch(1 0 0);
      --color-card-foreground: oklch(0.145 0 0);
      --color-popover: oklch(1 0 0);
      --color-popover-foreground: oklch(0.145 0 0);
      --color-primary: oklch(0.205 0 0);
      --color-primary-foreground: oklch(0.985 0 0);
      --color-secondary: oklch(0.965 0 0);
      --color-secondary-foreground: oklch(0.205 0 0);
      --color-muted: oklch(0.965 0 0);
      --color-muted-foreground: oklch(0.556 0 0);
      --color-accent: oklch(0.965 0 0);
      --color-accent-foreground: oklch(0.205 0 0);
      --color-destructive: oklch(0.577 0.245 27.325);
      --color-destructive-foreground: oklch(0.577 0.245 27.325);
      --color-border: oklch(0.922 0 0);
      --color-input: oklch(0.922 0 0);
      --color-ring: oklch(0.708 0 0);
      --radius-sm: calc(var(--radius) - 4px);
      --radius-md: calc(var(--radius) - 2px);
      --radius-lg: var(--radius);
      --radius-xl: calc(var(--radius) + 4px);
    }
    .dark {
      --color-background: oklch(0.145 0 0);
      --color-foreground: oklch(0.985 0 0);
      --color-card: oklch(0.145 0 0);
      --color-card-foreground: oklch(0.985 0 0);
      --color-popover: oklch(0.145 0 0);
      --color-popover-foreground: oklch(0.985 0 0);
      --color-primary: oklch(0.985 0 0);
      --color-primary-foreground: oklch(0.205 0 0);
      --color-secondary: oklch(0.269 0 0);
      --color-secondary-foreground: oklch(0.985 0 0);
      --color-muted: oklch(0.269 0 0);
      --color-muted-foreground: oklch(0.708 0 0);
      --color-accent: oklch(0.269 0 0);
      --color-accent-foreground: oklch(0.985 0 0);
      --color-destructive: oklch(0.396 0.141 25.723);
      --color-destructive-foreground: oklch(0.637 0.237 25.331);
      --color-border: oklch(0.269 0 0);
      --color-input: oklch(0.269 0 0);
      --color-ring: oklch(0.439 0 0);
    }
    @layer base {
      thead tr {
        border-bottom: 1px solid var(--color-border);
      }
      tbody tr {
        border-bottom: 1px solid var(--color-border);
      }
      th {
        height: 2.5rem;
        padding: 0 1rem;
        text-align: left;
        vertical-align: middle;
        font-weight: 500;
        color: var(--color-muted-foreground);
      }
      td {
        padding: 0.75rem 1rem;
        vertical-align: middle;
      }
    }
  </style>
</head>
<body${darkClass}>
  ${errorHtml}
  <div id="app"></div>
  <script type="module">
    import { createElement } from "react";
    import { createRoot } from "react-dom/client";

    let root = null;
    async function loadComponent() {
      try {
        const mod = await import("/component.js?" + Date.now());
        const App = mod.default;
        if (!App) {
          console.warn("No default export found in component.js");
          return;
        }
        const appEl = document.getElementById("app");
        const errorEl = document.getElementById("error");
        if (errorEl) errorEl.remove();
        if (!root) root = createRoot(appEl);
        root.render(createElement(App));
      } catch (err) {
        console.error("Failed to load component:", err);
        let errorEl = document.getElementById("error");
        if (!errorEl) {
          errorEl = document.createElement("pre");
          errorEl.id = "error";
          errorEl.style.cssText = "color:red;padding:1rem;font-family:monospace;white-space:pre-wrap;";
          document.body.prepend(errorEl);
        }
        errorEl.textContent = String(err);
      }
    }
    loadComponent();

    const es = new EventSource("/events");
    es.addEventListener("reload", (e) => {
      const data = JSON.parse(e.data);
      if (data.fullReload) {
        location.reload();
        return;
      }
      if (data.theme) {
        document.body.className = data.theme === "dark" ? "dark" : "";
      }
      loadComponent();
    });
  </script>
</body>
</html>`;
  }

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    const url = req.url || "/";

    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(buildPreviewHtml());
      return;
    }

    if (url === "/tailwindcss-browser.js") {
      const twBrowserPath = path.join(__dirname, "tailwindcss-browser.js");
      try {
        const fs = await import("fs");
        const content = fs.readFileSync(twBrowserPath);
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
      return;
    }

    if (url.startsWith("/component.js")) {
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(cachedComponentJs);
      return;
    }

    // Serve linked .moc compiled components: /linked/<hash>.js
    if (url.startsWith("/linked/")) {
      const hash = url.slice(8).replace(/\.js.*$/, "");
      const js = linkedJs.get(hash);
      if (js) {
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        res.end(js);
        return;
      }
    }

    // Serve fallback shadcn/ui components: /ui/<name>.js
    if (url.startsWith("/ui/")) {
      const componentName = url.slice(4).replace(/\.js.*$/, "");
      const effectiveName = componentName;
      const js = fallbackJs.get(effectiveName);
      if (js) {
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        res.end(js);
        return;
      }
    }

    if (url === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write(":ok\n\n");
      sseClients.add(res);
      req.on("close", () => {
        sseClients.delete(res);
        if (sseClients.size === 0) {
          setTimeout(() => {
            if (sseClients.size === 0) {
              dispose();
            }
          }, 5000);
        }
      });
      return;
    }

    // Serve static files (images, etc.) from the .moc file's directory
    {
      const docDir = path.dirname(mocFilePath);
      const filePath = path.join(docDir, url.split("?")[0]);
      // Prevent directory traversal: ensure the resolved path is within docDir
      if (filePath.startsWith(docDir)) {
        try {
          const fileUri = vscode.Uri.file(filePath);
          const content = await vscode.workspace.fs.readFile(fileUri);
          const ext = path.extname(filePath).toLowerCase();
          const mimeMap: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
          };
          const mimeType = mimeMap[ext] ?? "application/octet-stream";
          res.writeHead(200, { "Content-Type": mimeType });
          res.end(Buffer.from(content));
          return;
        } catch {
          // File not found → fall through to 404
        }
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  // Listen on configured port (or random if not set)
  const config = vscode.workspace.getConfiguration("momoc");
  const basePort = config.get<number>("previewBasePort");
  const port = basePort !== undefined ? await findAvailablePort(basePort) : 0;
  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as { port: number };
  const serverUrl = `http://127.0.0.1:${addr.port}`;

  // File watcher: recompile and notify on save (main file or linked .moc files)
  const watcher = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    const isLinkedFile = linkedAbsPaths.has(doc.uri.fsPath);
    if (doc.uri.fsPath === mocFilePath || isLinkedFile) {
      const prevLinkedMap = new Map(linkedHashes); // relPath → hash (コンテンツベース)
      await compileCurrentFile();
      // Full reload if linked set or content changed (import map in HTML needs update)
      const linkedSetChanged =
        prevLinkedMap.size !== linkedHashes.size ||
        [...linkedHashes.entries()].some(([k, v]) => prevLinkedMap.get(k) !== v);
      sendReload(isLinkedFile || linkedSetChanged);
    }
  });

  function dispose(): void {
    watcher.dispose();
    for (const res of sseClients) {
      res.end();
    }
    sseClients.clear();
    server.close();
    activeSessions.delete(mocFilePath);
  }

  const session: PreviewSession = {
    server,
    url: serverUrl,
    mocFilePath,
    dispose,
    updateSnapshotMap: (getter) => { currentGetSnapshotMap = getter; },
  };
  activeSessions.set(mocFilePath, session);

  return { url: serverUrl, dispose };
}

export function getActiveSession(
  mocFilePath: string,
): { url: string; dispose: () => void } | undefined {
  return activeSessions.get(mocFilePath);
}

export function disposeAll(): void {
  for (const session of activeSessions.values()) {
    session.dispose();
  }
  activeSessions.clear();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- esbuild plugin: externalize react, @/components/ui/*, @moc-linked/*, sonner ---

function previewExternalPlugin() {
  return {
    name: "preview-external",
    setup(build: {
      onResolve: (
        opts: { filter: RegExp },
        cb: (args: { path: string }) => { path: string; external: true },
      ) => void;
    }) {
      build.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (args) => {
        return { path: args.path, external: true };
      });
      build.onResolve({ filter: /^@\/components\/ui\// }, (args) => {
        return { path: args.path, external: true };
      });
      build.onResolve({ filter: /^@moc-linked\// }, (args) => {
        return { path: args.path, external: true };
      });
      build.onResolve({ filter: /^sonner$/ }, (args) => {
        return { path: args.path, external: true };
      });
      build.onResolve({ filter: /^lucide-react$/ }, (args) => {
        return { path: args.path, external: true };
      });
      build.onResolve({ filter: /^tailwind-merge$/ }, (args) => {
        return { path: args.path, external: true };
      });
    },
  };
}

// --- shadcn/ui fallback component sources (TSX) ---
// Compiled to ESM JS at server startup, served at /ui/<name>.js

const FALLBACK_SOURCES: Record<string, string> = {
  // Shared cn utility (tailwind-merge wrapper) — used by other fallback components
  _cn: `import { twMerge } from "tailwind-merge";
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(inputs.filter(Boolean).join(" "));
}`,

  // Shared combobox context — used by popover, command, button to share value/open state
  _combobox: `import { createContext } from "react";
export const ComboboxCtx = createContext<any>(null);`,

  button: `import { cn } from "@/components/ui/_cn";
import { useContext, useRef } from "react";
import { ComboboxCtx } from "@/components/ui/_combobox";
export function Button(props: any) {
  const { className = "", variant = "default", size = "default", children, role, style, ...rest } = props;
  const comboCtx = useContext(ComboboxCtx);
  const inputRef = useRef<HTMLInputElement>(null);
  const v: Record<string, string> = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };
  const s: Record<string, string> = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };
  if (role === "combobox" && comboCtx) {
    const childArray = Array.isArray(children) ? children : [children];
    const foundText = childArray.find((c: any) => typeof c === "string");
    const placeholder = foundText != null ? String(foundText).trim() : "";
    const icons = childArray.filter((c: any) => c !== null && c !== undefined && typeof c !== "string");
    const inputCls = cn("flex w-full rounded-md border border-input bg-transparent py-2 pl-3 pr-8 text-sm shadow-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring", !style?.height && "h-9", className);
    return <div className="relative flex items-center z-[51] w-full" style={style} onClick={(e: any) => { e.stopPropagation(); inputRef.current?.focus(); }}>
      <input ref={inputRef} type="text" className={inputCls} style={style?.height ? { height: style.height } : undefined} value={comboCtx.search || ""} placeholder={placeholder} onChange={(e: any) => { comboCtx.setSearch(e.target.value); comboCtx.setOpen(true); }} onFocus={() => comboCtx.setOpen(true)} />
      <span className="absolute right-2 pointer-events-none opacity-50">{icons}</span>
    </div>;
  }
  const cls = cn("inline-flex items-center justify-center gap-2 whitespace-pre-line rounded-md text-sm font-medium transition-colors", v[variant] || v.default, s[size] || s.default, className);
  const hasKbd = typeof children === "string" && children.includes("<kbd>");
  return <button className={cls} role={role} style={style} {...rest} {...(hasKbd ? { dangerouslySetInnerHTML: { __html: children } } : { children })} />;
}`,

  input: `import { cn } from "@/components/ui/_cn";
export function Input(props: any) {
  const { className = "", style, ...rest } = props;
  const cls = cn("flex rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", !style?.width && "w-full", !style?.height && "h-9", className);
  return <input className={cls} style={style} {...rest} />;
}`,

  card: `import { cn } from "@/components/ui/_cn";
export function Card(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = cn("rounded-xl border bg-card text-card-foreground shadow", className);
  return <div className={cls} {...rest}>{children}</div>;
}`,

  label: `import { cn } from "@/components/ui/_cn";
export function Label(props: any) {
  const { className = "", style, children, ...rest } = props;
  const cls = cn("text-sm font-medium leading-none", className);
  const hasKbd = typeof children === "string" && children.includes("<kbd>");
  return <label className={cls} style={{ whiteSpace: "pre-line", ...style }} {...rest} {...(hasKbd ? { dangerouslySetInnerHTML: { __html: children } } : { children })} />;
}`,

  badge: `import { cn } from "@/components/ui/_cn";
export function Badge(props: any) {
  const { className = "", variant = "default", style, children, ...rest } = props;
  const v: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground shadow",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
    outline: "text-foreground",
  };
  const cls = cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors", v[variant] || v.default, className);
  const hasKbd = typeof children === "string" && children.includes("<kbd>");
  return <span className={cls} style={{ whiteSpace: "pre-line", ...style }} {...(hasKbd ? { dangerouslySetInnerHTML: { __html: children } } : { children })} />;
}`,

  separator: `import { cn } from "@/components/ui/_cn";
export function Separator(props: any) {
  const { className = "", orientation = "horizontal", ...rest } = props;
  const base = orientation === "horizontal" ? "shrink-0 bg-border relative z-[1] h-[1px] w-full" : "shrink-0 bg-border relative z-[1] h-full w-[1px]";
  const cls = cn(base, className);
  return <div role="separator" className={cls} {...rest} />;
}`,

  table: `import { cn } from "@/components/ui/_cn";
import { useEffect, useRef } from "react";
export function Table(props: any) {
  const { className = "", children, style, ...rest } = props;
  const { width, height, minWidth, ...tableStyle } = style || {};
  const wrapperStyle = Object.fromEntries(Object.entries({ width, height }).filter(([, v]) => v != null));
  const innerStyle = Object.fromEntries(Object.entries({ minWidth, ...tableStyle }).filter(([, v]) => v != null));
  const cls = cn("caption-bottom text-sm border-separate", className);
  const mergedInnerStyle = { borderSpacing: 0, ...(wrapperStyle.width ? { width: "100%" } : {}), ...innerStyle };
  const tableRef = useRef<HTMLTableElement>(null);
  useEffect(() => {
    if (!tableRef.current) return;
    // Compute cumulative top for each sticky header row and apply
    // Only update cells that already have position:sticky with a top value (stickyHeader cells)
    // pinnedLeft-only cells (left sticky, no top) must not be affected
    const rows = Array.from(tableRef.current.querySelectorAll("tr"));
    let top = 0;
    for (const tr of rows) {
      const cells = Array.from(tr.querySelectorAll("th, td")) as HTMLElement[];
      if (cells.length === 0) break;
      const stickyCells = cells.filter(c => c.style.position === "sticky" && c.style.top !== "");
      if (stickyCells.length === 0) break;
      stickyCells.forEach(c => { c.style.top = top + "px"; });
      top += tr.getBoundingClientRect().height;
    }
  });
  const hasWrapperWidth = !!wrapperStyle.width;
  return <div className={hasWrapperWidth ? "block relative overflow-auto" : "inline-block relative overflow-auto"} style={Object.keys(wrapperStyle).length ? wrapperStyle : undefined}><table ref={tableRef} className={cls} style={mergedInnerStyle} {...rest}>{children}</table></div>;
}
export function TableHeader(props: any) {
  const { className = "", children, ...rest } = props;
  return <thead className={cn("[&_tr]:border-b", className)} {...rest}>{children}</thead>;
}
export function TableBody(props: any) {
  const { className = "", children, ...rest } = props;
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...rest}>{children}</tbody>;
}
export function TableRow(props: any) {
  const { className = "", children, ...rest } = props;
  return <tr className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...rest}>{children}</tr>;
}
export function TableHead(props: any) {
  const { className = "", children, colSpan, rowSpan, ...rest } = props;
  return <th colSpan={colSpan} rowSpan={rowSpan} className={cn("p-0 align-top text-left font-normal", className)} {...rest}>{children}</th>;
}
export function TableCell(props: any) {
  const { className = "", children, colSpan, rowSpan, ...rest } = props;
  return <td colSpan={colSpan} rowSpan={rowSpan} className={cn("p-0 align-top", className)} {...rest}>{children}</td>;
}
export function TableCaption(props: any) {
  const { className = "", children, ...rest } = props;
  return <caption className={cn("mt-4 text-sm text-muted-foreground", className)} {...rest}>{children}</caption>;
}`,

  // Phase 1: Simple components
  accordion: `import { cn } from "@/components/ui/_cn";
import { createContext, useContext, useState } from "react";
const AccCtx = createContext<any>(null);
const ItemCtx = createContext<string>("");
export function Accordion(props: any) {
  const { type = "single", className = "", children, collapsible, ...rest } = props;
  const [openItems, setOpenItems] = useState<string[]>([]);
  const toggle = (value: string) => {
    setOpenItems((prev: string[]) => {
      if (prev.includes(value)) {
        return prev.filter((v: string) => v !== value);
      }
      return type === "multiple" ? [...prev, value] : [value];
    });
  };
  const cls = cn("w-full", className);
  return <AccCtx.Provider value={{ openItems, toggle }}><div className={cls} {...rest}>{children}</div></AccCtx.Provider>;
}
export function AccordionItem(props: any) {
  const { value, className = "", children, ...rest } = props;
  const cls = cn("border-b", className);
  return <ItemCtx.Provider value={value}><div className={cls} {...rest}>{children}</div></ItemCtx.Provider>;
}
export function AccordionTrigger(props: any) {
  const { className = "", children, ...rest } = props;
  const ctx = useContext(AccCtx);
  const value = useContext(ItemCtx);
  const isOpen = ctx?.openItems?.includes(value);
  const cls = cn("flex w-full items-center justify-between py-4 text-sm font-medium transition-all hover:underline", className);
  return <button type="button" className={cls} onClick={() => ctx?.toggle(value)} {...rest}>{children}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={\`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 \${isOpen ? "rotate-180" : ""}\`}><path d="m6 9 6 6 6-6"/></svg></button>;
}
export function AccordionContent(props: any) {
  const { className = "", children, ...rest } = props;
  const ctx = useContext(AccCtx);
  const value = useContext(ItemCtx);
  const isOpen = ctx?.openItems?.includes(value);
  if (!isOpen) return null;
  const cls = cn("overflow-hidden text-sm pb-4 pt-0", className);
  return <div className={cls} {...rest}>{children}</div>;
}`,

  alert: `import { cn } from "@/components/ui/_cn";
export function Alert(props: any) {
  const { className = "", variant = "default", children, ...rest } = props;
  const v: Record<string, string> = {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
  };
  const cls = cn("relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7", v[variant] || v.default, className);
  return <div role="alert" className={cls} {...rest}>{children}</div>;
}`,

  "aspect-ratio": `import { cn } from "@/components/ui/_cn";
export function AspectRatio(props: any) {
  const { className = "", ratio = 16/9, width, height, children, style: parentStyle, ...rest } = props;
  const widthControlled = width && width !== "auto";
  const heightControlled = !widthControlled && height && height !== "auto";
  const style = widthControlled
    ? { width, height: \`calc(\${width} * \${1 / ratio})\`, alignSelf: "flex-start" }
    : heightControlled
    ? { height, width: \`calc(\${height} * \${ratio})\`, alignSelf: "flex-start" }
    : { aspectRatio: ratio, alignSelf: "flex-start" };
  return <div className={cn("relative", !widthControlled && !heightControlled && "w-full", className)} style={{ ...style, ...parentStyle }} {...rest}>{children}</div>;
}`,

  avatar: `import { cn } from "@/components/ui/_cn";
const SIZE_CLASSES: Record<string, string> = { sm: "h-8 w-8", default: "h-10 w-10", lg: "h-16 w-16" };
export function Avatar(props: any) {
  const { className = "", src, fallback = "AB", size = "default", style, ...rest } = props;
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.default;
  const cls = cn("relative flex shrink-0 rounded-full", sizeClass, className);
  return (
    <span className={cls} style={style} {...rest}>
      {src ? (
        <img src={src} alt={fallback} className="aspect-square h-full w-full overflow-hidden rounded-full" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
          {fallback}
        </span>
      )}
    </span>
  );
}`,

  breadcrumb: `export function Breadcrumb({ className = "", children, style, ...rest }) {
  return <nav aria-label="breadcrumb" className={className} style={style}>{children}</nav>;
}
export function BreadcrumbList({ className = "", children, ...rest }) {
  return <ol className={"flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5 " + className}>{children}</ol>;
}
export function BreadcrumbItem({ className = "", children, ...rest }) {
  return <li className={"inline-flex items-center gap-1.5 " + className} {...rest}>{children}</li>;
}
export function BreadcrumbLink({ className = "", href = "#", children, onClick, ...rest }) {
  const handleClick = onClick ?? ((e) => e.preventDefault());
  return <a href={href} onClick={handleClick} className={"hover:text-foreground transition-colors " + className}>{children}</a>;
}
export function BreadcrumbPage({ className = "", children, ...rest }) {
  return <span aria-current="page" className={"font-normal text-foreground " + className}>{children}</span>;
}
export function BreadcrumbSeparator({ className = "", children, ...rest }) {
  return <li aria-hidden="true" className={"[&>svg]:size-3.5 " + className}>{children ?? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>}</li>;
}
export function BreadcrumbEllipsis({ className = "", ...rest }) {
  return <span role="presentation" aria-hidden="true" className={"flex h-9 w-9 items-center justify-center " + className} {...rest}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg><span className="sr-only">More</span></span>;
}`,

  checkbox: `import { cn } from "@/components/ui/_cn";
import { useState } from "react";
export function Checkbox(props: any) {
  const { className = "", style, checked: initialChecked = false, disabled, children, ...rest } = props;
  const [checked, setChecked] = useState(initialChecked);
  const toggle = () => !disabled && setChecked((v: boolean) => !v);
  return (
    <label className={cn("flex items-center space-x-2 cursor-pointer", disabled && "cursor-not-allowed opacity-50", className)} style={style} onClick={toggle}>
      <span role="checkbox" aria-checked={checked}
        className={cn("flex items-center justify-center h-4 w-4 shrink-0 rounded-sm border border-primary shadow", checked && "bg-primary text-primary-foreground")}
        {...rest}
      >
        {checked && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>}
      </span>
      {children && <span className="text-sm font-medium leading-none select-none" style={{ whiteSpace: "pre-line" }}>{children}</span>}
    </label>
  );
}`,

  collapsible: `import { createContext, useContext, useState } from "react";
const CollCtx = createContext<any>(null);
export function Collapsible(props: any) {
  const { className = "", children, defaultOpen = false, ...rest } = props;
  const [open, setOpen] = useState(defaultOpen);
  return <CollCtx.Provider value={{ open, toggle: () => setOpen((o: boolean) => !o) }}><div className={className} {...rest}>{children}</div></CollCtx.Provider>;
}
export function CollapsibleTrigger(props: any) {
  const { className = "", children, "data-variant": variant, ...rest } = props;
  const ctx = useContext(CollCtx);
  const open = ctx?.open;
  if (variant === "plus-minus") {
    const icon = open
      ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/></svg>
      : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
    return <button type="button" className={className} onClick={() => ctx?.toggle()} {...rest}>{icon}</button>;
  }
  const deg = open ? (variant === "arrow" ? 90 : 180) : 0;
  return <button type="button" className={className} onClick={() => ctx?.toggle()} {...rest}><span style={{ display: "inline-flex", transform: "rotate(" + deg + "deg)", transition: "transform 0.2s ease" }}>{children}</span></button>;
}
export function CollapsibleContent(props: any) {
  const { className = "", children, ...rest } = props;
  const ctx = useContext(CollCtx);
  if (!ctx?.open) return null;
  return <div className={className} {...rest}>{children}</div>;
}`,

  pagination: `import { cn } from "@/components/ui/_cn";
export function Pagination(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = cn("flex w-full", className);
  return <nav role="navigation" aria-label="pagination" className={cls} {...rest}>{children}</nav>;
}
export function PaginationContent(props: any) {
  const { className = "", children, ...rest } = props;
  return <ul className={cn("flex flex-row items-center gap-1", className)} {...rest}>{children}</ul>;
}
export function PaginationItem(props: any) {
  const { children, ...rest } = props;
  return <li {...rest}>{children}</li>;
}
export function PaginationLink(props: any) {
  const { className = "", isActive, children, href, ...rest } = props;
  const cls = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 w-9 cursor-pointer",
    isActive ? cn("border border-input bg-background shadow-sm", className) : cn("hover:bg-accent hover:text-accent-foreground", className),
  );
  return <a href={href || "#"} className={cls} aria-current={isActive ? "page" : undefined} {...rest}>{children}</a>;
}
export function PaginationPrevious(props: any) {
  const { className = "", href, ...rest } = props;
  const cls = cn("inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground", className);
  return <a href={href || "#"} className={cls} aria-label="Go to previous page" {...rest}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg><span>Previous</span></a>;
}
export function PaginationNext(props: any) {
  const { className = "", href, ...rest } = props;
  const cls = cn("inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground", className);
  return <a href={href || "#"} className={cls} aria-label="Go to next page" {...rest}><span>Next</span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg></a>;
}`,

  "date-picker": `import { cn } from "@/components/ui/_cn";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function formatDate(date, fmt) {
  const yyyy = String(date.getFullYear());
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return fmt.replace("yyyy", yyyy).replace("MM", MM).replace("dd", dd).replace("HH", HH).replace("mm", mm);
}
export function DatePicker(props) {
  const {
    mode = "date",
    dateFormat = "yyyy/MM/dd",
    placeholder = "日付を選択...",
    editable = false,
    disabled = false,
    width = "auto",
    height = "auto",
    className = "",
    style: parentStyle,
    calendarBorderClass = "",
    calendarShadowClass = "",
    todayBgClass = "",
    todayTextClass = "",
    todayBorderClass = "",
    todayShadowClass = "",
    selectedBgClass = "",
    selectedTextClass = "",
    selectedBorderClass = "",
    selectedShadowClass = "",
    buttonBgClass = "",
    hoverBgClass = "",
    ...rest
  } = props;
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [hoveredDay, setHoveredDay] = useState(null);
  const today = new Date();
  const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1).getDay();
  const monthName = displayMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const isToday = (d) => d === today.getDate() && displayMonth.getMonth() === today.getMonth() && displayMonth.getFullYear() === today.getFullYear();
  const isSelected = (d) => selectedDate !== null && d === selectedDate.getDate() && displayMonth.getMonth() === selectedDate.getMonth() && displayMonth.getFullYear() === selectedDate.getFullYear();
  const handleDayClick = (d) => {
    const date = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d, hour, minute, 0);
    setSelectedDate(date);
    if (mode === "date") { setInputValue(formatDate(date, dateFormat)); setOpen(false); }
  };
  const handleConfirm = () => {
    if (selectedDate) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, minute, 0);
      const fmt = dateFormat.includes("HH") ? dateFormat : dateFormat + " HH:mm";
      setInputValue(formatDate(date, fmt));
    }
    setOpen(false);
  };
  const prevMonth = () => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
  const nextMonth = () => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));
  const todayCls = cn("border", todayBorderClass || "border-primary", todayBgClass || "bg-primary", todayTextClass || "text-primary-foreground", todayShadowClass);
  const selectedCls = cn("border", selectedBorderClass || "border-primary", selectedBgClass || "bg-primary", selectedTextClass || "text-primary-foreground", selectedShadowClass || "shadow-sm");
  const getDayCls = (d) => {
    if (isSelected(d)) return cn("inline-flex items-center justify-center rounded-md text-sm h-8 w-8", selectedCls);
    if (isToday(d)) return cn("inline-flex items-center justify-center rounded-md text-sm h-8 w-8", todayCls);
    return cn("inline-flex items-center justify-center rounded-md text-sm h-8 w-8", hoverBgClass ? (hoveredDay === d ? hoverBgClass : "") : "hover:bg-accent hover:text-accent-foreground");
  };
  const wrapperRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const [calPos, setCalPos] = useState<{top:number;left:number;triggerTop:number} | null>(null);
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    setCalPos({ top: r.bottom + 4, left: r.left, triggerTop: r.top });
  }, [open]);
  useLayoutEffect(() => {
    if (!calPos || !calRef.current) return;
    const el = calRef.current;
    const h = el.offsetHeight, w = el.offsetWidth;
    let { top, left } = calPos;
    if (top + h > window.innerHeight) top = calPos.triggerTop - h - 4;
    if (left + w > window.innerWidth) left = Math.max(4, window.innerWidth - w - 4);
    if (top < 0) top = 4;
    el.style.top = top + "px";
    el.style.left = left + "px";
  }, [calPos]);
  return (
    <div ref={wrapperRef} className={cn(className)} style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined, ...parentStyle }} {...rest}>
      <div className={cn("flex w-full rounded-md border border-input overflow-hidden", height !== "auto" ? "h-full" : "h-9", disabled && "opacity-50 cursor-not-allowed")}>
        <input type="text" value={inputValue} readOnly={!editable} placeholder={placeholder} disabled={disabled}
          onChange={(e) => editable && setInputValue(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-3 py-1 placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed" />
        <button type="button" disabled={disabled} onClick={() => !disabled && setOpen((v) => !v)}
          className={cn("flex items-center justify-center px-2.5 border-l border-input hover:bg-accent transition-colors", buttonBgClass)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
        </button>
      </div>
      {open && calPos && createPortal(<>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div ref={calRef} className={cn("fixed z-[9999] min-w-[280px] rounded-md border bg-popover p-3", calendarBorderClass, calendarShadowClass || "shadow-md")} style={{ top: calPos.top, left: calPos.left }}>
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={prevMonth} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 hover:bg-accent hover:text-accent-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="text-sm font-medium">{monthName}</div>
              <button type="button" onClick={nextMonth} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 hover:bg-accent hover:text-accent-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0">
              {DAYS.map((d) => (<div key={d} className="text-center text-xs text-muted-foreground p-1 font-medium">{d}</div>))}
              {cells.map((d, i) => (
                <div key={i} className="text-center p-0">
                  {d !== null ? (
                    <button type="button" className={getDayCls(d)} onClick={() => handleDayClick(d)}
                      onMouseEnter={() => hoverBgClass && setHoveredDay(d)} onMouseLeave={() => hoverBgClass && setHoveredDay(null)}>
                      {d}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {mode === "datetime" && (
              <div className="mt-3 border-t pt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">時刻:</span>
                <input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Math.max(0, Math.min(23, Number(e.target.value))))}
                  className="w-14 rounded border border-input bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                <span className="text-sm font-medium">:</span>
                <input type="number" min={0} max={59} value={minute} onChange={(e) => setMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="w-14 rounded border border-input bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                <button type="button" onClick={handleConfirm}
                  className={cn("ml-auto rounded px-3 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90", buttonBgClass && cn(buttonBgClass, "text-foreground"))}>
                  OK
                </button>
              </div>
            )}
          </div>
        </>, document.body)}
    </div>
  );
}`,

  progress: `import { cn } from "@/components/ui/_cn";
export function Progress(props: any) {
  const { className = "", value = 0, indicatorClass = "", ...rest } = props;
  const cls = cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className);
  return <div role="progressbar" className={cls} {...rest}><div className={cn("h-full w-full flex-1 transition-all", indicatorClass || "bg-primary")} style={{ transform: \`translateX(-\${100 - (value || 0)}%)\` }} /></div>;
}`,

  "radio-group": `import { cn } from "@/components/ui/_cn";
import { createContext, useContext, useState } from "react";
const Ctx = createContext<any>(null);
export function RadioGroup(props: any) {
  const { className = "", style, value: initialValue = "", children, defaultValue, onValueChange, ...rest } = props;
  const [value, setValue] = useState(initialValue || defaultValue || "");
  const cls = cn("grid gap-2", className);
  return <Ctx.Provider value={{ value, setValue }}><div role="radiogroup" className={cls} style={style} {...rest}>{children}</div></Ctx.Provider>;
}
export function RadioGroupItem(props: any) {
  const { value: itemValue, id, className = "", ...rest } = props;
  const ctx = useContext(Ctx);
  const checked = ctx?.value === itemValue;
  return (
    <button type="button" role="radio" aria-checked={checked} data-state={checked ? "checked" : "unchecked"} id={id}
      onClick={() => ctx?.setValue(itemValue)}
      className={cn("aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring", checked && "bg-primary", className)}
      {...rest}
    >
      {checked && <span className="flex items-center justify-center"><span className="h-2 w-2 rounded-full bg-primary-foreground" /></span>}
    </button>
  );
}`,

  "scroll-area": `import { cn } from "@/components/ui/_cn";
export function ScrollArea(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = cn("relative overflow-auto rounded-md border", className);
  return <div className={cls} {...rest}>{children}</div>;
}`,

  slider: `import { cn } from "@/components/ui/_cn";
import { useState, useRef } from "react";
export function Slider(props: any) {
  const { className = "", value: initialValue = [50], min = 0, max = 100, step = 1, onValueChange, disabled, fillClassName = "", trackClassName = "", ...rest } = props;
  const initVal = Array.isArray(initialValue) ? initialValue[0] : initialValue;
  const [value, setValue] = useState(initVal);
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;
  const updateFromX = (clientX: number) => {
    if (!trackRef.current || disabled) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    const newVal = Math.min(max, Math.max(min, Math.round((raw - min) / step) * step + min));
    setValue(newVal);
    onValueChange?.([newVal]);
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    updateFromX(e.clientX);
    const onMove = (ev: MouseEvent) => updateFromX(ev.clientX);
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  const cls = cn("relative flex w-full touch-none select-none items-center", disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer", className);
  return (
    <div className={cls} onMouseDown={onMouseDown} {...rest}>
      <div ref={trackRef} className={\`relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20 \${trackClassName}\`}>
        <div className={\`absolute h-full bg-primary \${fillClassName}\`} style={{ width: \`\${pct}%\` }} />
      </div>
      <div className="absolute block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors" style={{ left: \`calc(\${pct}% - 8px)\` }} />
    </div>
  );
}`,

  switch: `import { cn } from "@/components/ui/_cn";
import { useState } from "react";
const KBD_STYLE = "pointer-events:none;display:inline-flex;height:1.25rem;align-items:center;gap:0.25rem;border-radius:0.25rem;border:1px solid;padding-left:0.375rem;padding-right:0.375rem;font-family:monospace;font-size:0.625rem;font-weight:500;background:var(--muted,#f1f5f9);color:var(--muted-foreground,#64748b);user-select:none";
function kbdHtml(text: string): string {
  if (!text.includes("<kbd>")) return text;
  return text.replace(/<kbd>(.*?)<\\/kbd>/g, function(_: string, inner: string) {
    const escaped = inner.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return '<kbd style="' + KBD_STYLE + '">' + escaped + '</kbd>';
  });
}
export function Switch(props: any) {
  const { className = "", checked: initialChecked = false, disabled, description = "", invalid = false, size = "default", variant = "default", checkedClassName = "", uncheckedClassName = "", cardBorderColor = "", cardBgColor = "", descriptionColor = "", labelColor = "", children, ...rest } = props;
  const [checked, setChecked] = useState(initialChecked);
  const toggle = () => !disabled && setChecked((v: boolean) => !v);
  const isSm = size === "sm";
  const btnSize = isSm ? "h-4 w-7" : "h-5 w-9";
  const thumbSize = isSm ? "h-3 w-3" : "h-4 w-4";
  const thumbTranslate = isSm ? "translate-x-3" : "translate-x-4";
  const btnCls = cn("peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors", btnSize, checked ? "bg-primary" : "bg-input", disabled && "cursor-not-allowed opacity-50", invalid && "ring-2 ring-destructive", className, checked ? checkedClassName : uncheckedClassName);
  const cardStyle = {
    ...(cardBorderColor && { borderColor: cardBorderColor }),
    ...(cardBgColor && { backgroundColor: cardBgColor }),
  };
  const descStyle = descriptionColor ? { color: descriptionColor } : undefined;
  const labelStyle = labelColor ? { color: labelColor } : {};
  const switchBtn = (
    <button type="button" role="switch" aria-checked={checked} aria-invalid={invalid ? "true" : undefined} disabled={disabled} className={btnCls} onClick={toggle} {...rest}>
      <span className={cn("pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform", thumbSize, checked ? thumbTranslate : "translate-x-0")} />
    </button>
  );
  const labelContent = (children || description) && (
    <div className="flex flex-col">
      {children && <span className="text-sm font-medium leading-none select-none" style={{ ...labelStyle, whiteSpace: "pre-line" }} {...(typeof children === "string" && children.includes("<kbd>") ? { dangerouslySetInnerHTML: { __html: kbdHtml(children) } } : { children })} />}
      {description && <p className="text-[0.8rem] text-muted-foreground" style={{ ...descStyle, whiteSpace: "pre-line" }} {...(description.includes("<kbd>") ? { dangerouslySetInnerHTML: { __html: kbdHtml(description) } } : { children: description })} />}
    </div>
  );
  if (variant === "card") {
    return (
      <div className="flex w-full items-center justify-between gap-4 rounded-lg border p-4" style={Object.keys(cardStyle).length > 0 ? cardStyle : undefined}>
        {labelContent}
        {switchBtn}
      </div>
    );
  }
  return (
    <label className={cn("flex items-center space-x-2", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      {switchBtn}
      {labelContent}
    </label>
  );
}`,

  tabs: `import { createContext, useContext, useState } from "react";
import { cn } from "@/components/ui/_cn";
const TabsCtx = createContext<any>(null);
export function Tabs({ defaultValue, orientation = "horizontal", className = "", children, ...rest }: any) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsCtx.Provider value={{ value, setValue, orientation }}>
      <div className={className} data-orientation={orientation} {...rest}>{children}</div>
    </TabsCtx.Provider>
  );
}
export function TabsList({ className = "", children, ...rest }: any) {
  const ctx = useContext(TabsCtx);
  const base = ctx?.orientation === "vertical"
    ? "flex flex-col items-stretch bg-muted p-1 rounded-md"
    : "inline-flex items-center bg-muted p-1 rounded-md w-full";
  return <div className={cn(base, className)} {...rest}>{children}</div>;
}
export function TabsTrigger({ value, className = "", children, ...rest }: any) {
  const ctx = useContext(TabsCtx);
  const isActive = ctx?.value === value;
  const base = "inline-flex items-center justify-center gap-1 px-3 py-1 text-sm font-medium rounded-sm transition-all cursor-pointer";
  const prefix = "data-[state=active]:";
  const parts = className.split(" ").filter(Boolean);
  const activeExtra = parts.filter((c: string) => c.startsWith(prefix)).map((c: string) => c.slice(prefix.length)).join(" ");
  const restCls = parts.filter((c: string) => !c.startsWith(prefix)).join(" ");
  return (
    <button type="button"
      className={cn(base, isActive ? cn("bg-background text-foreground shadow", activeExtra) : "text-muted-foreground hover:text-foreground", restCls)}
      onClick={() => ctx?.setValue(value)} {...rest}>{children}</button>
  );
}
export function TabsContent({ value, className = "", children, ...rest }: any) {
  const ctx = useContext(TabsCtx);
  if (ctx?.value !== value) return null;
  return <div className={cn("mt-2", className)} {...rest}>{children}</div>;
}`,

  textarea: `import { cn } from "@/components/ui/_cn";
export function Textarea(props: any) {
  const { className = "", style, ...rest } = props;
  const cls = cn("flex rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", !style?.width && "w-full", !style?.height && "min-h-[60px]", className);
  return <textarea className={cls} style={style} {...rest} />;
}`,

  toggle: `import { cn } from "@/components/ui/_cn";
import * as Icons from "lucide-react";
import { useState } from "react";
export function Toggle(props: any) {
  const { className = "", variant = "default", size = "default", pressed: initialPressed, disabled, icon, children, ...rest } = props;
  const [pressed, setPressed] = useState(initialPressed ?? false);
  const v: Record<string, string> = {
    default: "bg-transparent",
    outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
  };
  const s: Record<string, string> = {
    default: "h-9 px-3 min-w-9",
    sm: "h-8 px-2 min-w-8",
    lg: "h-10 px-3 min-w-10",
  };
  const IconComponent = icon ? (Icons as any)[icon] : null;
  const cls = cn("inline-flex items-center justify-center gap-2 whitespace-pre-line rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", s[size] || s.default, v[variant] || v.default, className);
  return <button type="button" aria-pressed={pressed} data-state={pressed ? "on" : "off"} data-toggle-pressed={pressed || undefined} data-disabled={disabled || undefined} disabled={disabled} onClick={() => setPressed((p: boolean) => !p)} className={cls} {...rest}>{IconComponent && <IconComponent className="h-4 w-4" />}{children}</button>;
}`,

  "toggle-group": `import { cn } from "@/components/ui/_cn";
import { createContext, useContext, useState } from "react";
const TGCtx = createContext<any>({ variant: "default", size: "default", disabled: false });
export function ToggleGroup(props: any) {
  const { className = "", children, orientation = "horizontal", disabled = false, variant = "default", size = "default", ...rest } = props;
  const cls = cn(
    "flex items-center justify-center",
    orientation === "vertical" ? "flex-col" : "flex-row gap-1",
    disabled ? "opacity-50 pointer-events-none" : "",
    className
  );
  return (
    <TGCtx.Provider value={{ variant, size, disabled }}>
      <div role="group" className={cls} {...rest}>{children}</div>
    </TGCtx.Provider>
  );
}
export function ToggleGroupItem(props: any) {
  const { className = "", children, value, disabled: itemDisabled, ...rest } = props;
  const ctx = useContext(TGCtx);
  const variant = props.variant ?? ctx.variant;
  const size = props.size ?? ctx.size;
  const disabled = itemDisabled ?? ctx.disabled;
  const [pressed, setPressed] = useState(false);
  const v: Record<string, string> = {
    default: "bg-transparent",
    outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
  };
  const s: Record<string, string> = {
    default: "h-9 px-3 min-w-9",
    sm: "h-8 px-2 min-w-8",
    lg: "h-10 px-3 min-w-10",
  };
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    s[size] || s.default,
    v[variant] || v.default,
    className
  );
  return <button type="button" aria-pressed={pressed} data-state={pressed ? "on" : "off"} data-disabled={disabled || undefined} disabled={disabled} onClick={() => !disabled && setPressed((p: boolean) => !p)} className={cls} {...rest}>{children}</button>;
}`,

  // Phase 2: Complex components
  select: `import { cn } from "@/components/ui/_cn";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
const SelectCtx = createContext<any>(null);
export function Select(props: any) {
  const { children, style, ...rest } = props;
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wrapperCls = style?.width ? "block" : "inline-grid";
  return <SelectCtx.Provider value={{ value, setValue, open, setOpen, triggerRef }}><div className={wrapperCls} style={style} {...rest}>{children}</div></SelectCtx.Provider>;
}
export function SelectTrigger(props: any) {
  const { className = "", children, ...rest } = props;
  const ctx = useContext(SelectCtx);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (ref.current) ctx.triggerRef.current = ref.current; }, []);
  const cls = cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className);
  return <button ref={ref} type="button" className={cls} onClick={() => ctx?.setOpen((o: boolean) => !o)} {...rest}>{children}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50"><path d="m6 9 6 6 6-6"/></svg></button>;
}
export function SelectContent(props: any) {
  const { className = "", children, style, ...rest } = props;
  const ctx = useContext(SelectCtx);
  const [pos, setPos] = useState<{top:number;left:number;width:number;triggerTop:number} | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ctx?.open || !ctx.triggerRef.current) return;
    const r = ctx.triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width, triggerTop: r.top });
  }, [ctx?.open]);
  useLayoutEffect(() => {
    if (!pos || !contentRef.current) return;
    const el = contentRef.current;
    const h = el.offsetHeight, w = el.offsetWidth;
    let { top, left } = pos;
    if (top + h > window.innerHeight) top = pos.triggerTop - h - 4;
    if (left + w > window.innerWidth) left = Math.max(4, window.innerWidth - w - 4);
    if (top < 0) top = 4;
    el.style.top = top + "px";
    el.style.left = left + "px";
  }, [pos]);
  if (!ctx?.open || !pos) return null;
  const effectiveWidth = style?.width ?? \`\${pos.width}px\`;
  const cls = cn("fixed z-[9999] max-h-60 min-w-[8rem] overflow-auto rounded-md border border-gray-300 bg-popover p-1 text-popover-foreground shadow-lg", className);
  return createPortal(<><div className="fixed inset-0 z-[9998]" onClick={() => ctx.setOpen(false)} /><div ref={contentRef} className={cls} style={{ top: pos.top, left: pos.left, width: effectiveWidth, ...style }} {...rest}>{children}</div></>, document.body);
}
export function SelectItem(props: any) {
  const { value, className = "", children, ...rest } = props;
  const ctx = useContext(SelectCtx);
  const isSelected = ctx?.value === value;
  const cls = cn("relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground", isSelected && "bg-accent", className);
  return <div className={cls} onClick={() => { ctx?.setValue(value); ctx?.setOpen(false); }} {...rest}>{children}{isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2 h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>}</div>;
}
export function SelectValue(props: any) {
  const { placeholder = "", className = "" } = props;
  const ctx = useContext(SelectCtx);
  if (ctx?.value) return <span className={className}>{ctx.value}</span>;
  return <span className={cn("text-muted-foreground", className)}>{placeholder}</span>;
}`,

  command: `import { cn } from "@/components/ui/_cn";
import { createContext, useContext, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { ComboboxCtx } from "@/components/ui/_combobox";
const Ctx = createContext<any>(null);
export function Command({ children, className = "", ...rest }: any) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const cls = cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className);
  return <Ctx.Provider value={{ search, setSearch, visibleCount, setVisibleCount }}><div className={cls} {...rest}>{children}</div></Ctx.Provider>;
}
export function CommandInput({ className = "", placeholder = "", ...rest }: any) {
  const comboCtx = useContext(ComboboxCtx);
  if (comboCtx) return null;
  const ctx = useContext(Ctx);
  return <div className={cn("flex items-center border-b px-3", className)}><Search className="mr-2 h-4 w-4 shrink-0 opacity-50" /><input type="text" className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder={placeholder} value={ctx?.search || ""} onChange={(e: any) => ctx?.setSearch(e.target.value)} /></div>;
}
export function CommandList({ children, className = "", ...rest }: any) {
  return <div className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)} {...rest}>{children}</div>;
}
export function CommandEmpty({ children, className = "", ...rest }: any) {
  const ctx = useContext(Ctx);
  const comboCtx = useContext(ComboboxCtx);
  const search = comboCtx?.search || ctx?.search || "";
  if (!search || ctx?.visibleCount > 0) return null;
  return <div className={cn("py-6 text-center text-sm", className)} {...rest}>{children}</div>;
}
export function CommandGroup({ children, className = "", heading, ...rest }: any) {
  return <div className={cn("overflow-hidden p-1 text-foreground", className)} {...rest}>{heading && <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{heading}</div>}{children}</div>;
}
export function CommandItem({ children, value = "", className = "", onSelect, ...rest }: any) {
  const ctx = useContext(Ctx);
  const comboCtx = useContext(ComboboxCtx);
  const search = comboCtx?.search || ctx?.search || "";
  const visible = !search || String(value).toLowerCase().includes(search.toLowerCase());
  useEffect(() => {
    if (!ctx) return;
    if (visible) {
      ctx.setVisibleCount((c: number) => c + 1);
      return () => ctx.setVisibleCount((c: number) => Math.max(0, c - 1));
    }
  }, [visible]);
  if (!visible) return null;
  const isSelected = comboCtx?.value === value;
  const handleClick = () => {
    onSelect?.(value);
    if (comboCtx) { comboCtx.setValue(value); comboCtx.setSearch(value); comboCtx.setOpen(false); }
  };
  return <div className={cn("relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground", isSelected && "bg-accent text-accent-foreground", className)} onClick={handleClick} {...rest}>{children}{isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2 h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>}</div>;
}
export function CommandSeparator({ className = "", ...rest }: any) {
  return <div className={cn("-mx-1 h-px bg-border", className)} {...rest} />;
}`,

  calendar: `import { cn } from "@/components/ui/_cn";
export function Calendar(props: any) {
  const { className = "", style, todayBgClass = "", todayTextClass = "" } = props;
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const monthName = today.toLocaleString("default", { month: "long", year: "numeric" });
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div className={cn("p-3 rounded-md border", className)} style={style}>
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 hover:bg-accent hover:text-accent-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-sm font-medium">{monthName}</div>
        <button type="button" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 hover:bg-accent hover:text-accent-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {days.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground p-1 font-medium">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className="text-center p-0">
            {d !== null ? (
              <button type="button" className={cn("inline-flex items-center justify-center rounded-md text-sm h-8 w-8", d === currentDay ? cn(todayBgClass || "bg-primary", todayTextClass || "text-primary-foreground") : "hover:bg-accent hover:text-accent-foreground")}>
                {d}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}`,

  resizable: `import { createContext, useContext, useRef } from "react";
import { cn } from "@/components/ui/_cn";
const PanelCtx = createContext(null);
export function ResizablePanelGroup(props) {
  const { className = "", children, direction = "horizontal", style, ...rest } = props;
  const isVertical = direction === "vertical";
  const cls = cn("flex", isVertical ? "flex-col" : "flex-row", className);
  return (
    <PanelCtx.Provider value={{ isVertical }}>
      <div className={cls} style={{ width: "100%", height: "100%", ...style }} {...rest}>{children}</div>
    </PanelCtx.Provider>
  );
}
export function ResizablePanel(props) {
  const { className = "", children, defaultSize = 50, style, ...rest } = props;
  const flexVal = (style && style.flex) ? style.flex : (defaultSize + " " + defaultSize + " 0%");
  return (
    <div className={cn("overflow-auto min-w-0 min-h-0", className)} style={{ ...style, flex: flexVal }} {...rest}>
      {children}
    </div>
  );
}
export function ResizableHandle(props) {
  const { className = "", withHandle = false, ...rest } = props;
  const ctx = useContext(PanelCtx);
  const isVertical = ctx ? ctx.isVertical : false;
  const ref = useRef(null);
  function onPointerDown(e) {
    e.preventDefault();
    const el = ref.current; if (!el) return;
    const prev = el.previousElementSibling;
    const next = el.nextElementSibling;
    if (!prev || !next) return;
    const parent = el.parentElement;
    const parentSize = isVertical ? parent.getBoundingClientRect().height : parent.getBoundingClientRect().width;
    const prevFlex0 = parseFloat(prev.style.flex) || 50;
    const nextFlex0 = parseFloat(next.style.flex) || 50;
    const startPos = isVertical ? e.clientY : e.clientX;
    el.setPointerCapture(e.pointerId);
    function onMove(ev) {
      const deltaPct = ((isVertical ? ev.clientY : ev.clientX) - startPos) / parentSize * 100;
      const newPrev = Math.max(5, Math.min(prevFlex0 + nextFlex0 - 5, prevFlex0 + deltaPct));
      const newNext = (prevFlex0 + nextFlex0) - newPrev;
      prev.style.flex = newPrev + " " + newPrev + " 0%";
      next.style.flex = newNext + " " + newNext + " 0%";
    }
    function onUp() {
      el.releasePointerCapture(e.pointerId);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }
  return (
    <div ref={ref}
      className={cn("flex-shrink-0 flex items-center justify-center select-none",
        isVertical ? "h-[4px] w-full cursor-row-resize" : "w-[4px] h-full cursor-col-resize",
        className || "bg-border")}
      onPointerDown={onPointerDown} {...rest}>
      {withHandle && (
        <div style={{
          width: isVertical ? "32px" : "3px",
          height: isVertical ? "3px" : "24px",
          borderRadius: "2px",
          background: "hsl(var(--border))",
          opacity: 0.7
        }} />
      )}
    </div>
  );
}`,

  carousel: `import { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/components/ui/_cn";
const CarouselCtx = createContext<any>(null);
export function Carousel({ opts = {}, orientation = "horizontal", className = "", children, ...rest }: any) {
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const loop = !!(opts?.loop);
  const scrollPrev = () => setCurrent((i: number) => loop ? (i - 1 + count) % count : Math.max(0, i - 1));
  const scrollNext = () => setCurrent((i: number) => loop ? (i + 1) % count : Math.min(count - 1, i + 1));
  const canPrev = loop || current > 0;
  const canNext = loop || current < count - 1;
  const handleWheel = (e: any) => {
    e.preventDefault();
    const delta = orientation === "vertical" ? e.deltaY : e.deltaX || e.deltaY;
    if (delta > 0) scrollNext(); else if (delta < 0) scrollPrev();
  };
  return (
    <CarouselCtx.Provider value={{ current, setCurrent, count, setCount, scrollPrev, scrollNext, canPrev, canNext, orientation }}>
      <div className={cn("relative", className)} data-orientation={orientation} onWheel={handleWheel} {...rest}>
        {children}
        {count > 1 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
            {Array.from({ length: count }, (_: any, i: number) => (
              <button key={i} type="button" onClick={() => setCurrent(i)}
                className={cn("h-1.5 w-1.5 rounded-full transition-colors", i === current ? "bg-primary" : "bg-primary/30")} />
            ))}
          </div>
        )}
      </div>
    </CarouselCtx.Provider>
  );
}
export function CarouselContent({ className = "", children, ...rest }: any) {
  const ctx = useContext(CarouselCtx);
  const items = Array.isArray(children) ? children : children ? [children] : [];
  useEffect(() => { ctx?.setCount(items.length); }, [items.length]);
  return (
    <div className={cn("overflow-hidden w-full h-full", className)} {...rest}>
      {items.map((item: any, i: number) => (
        <div key={i} className="h-full" style={{ display: i === ctx?.current ? undefined : "none" }}>{item}</div>
      ))}
    </div>
  );
}
export function CarouselItem({ className = "", children, ...rest }: any) {
  return <div className={cn("min-w-0 shrink-0 grow-0 h-full w-full", className)} {...rest}>{children}</div>;
}
export function CarouselPrevious({ className = "", ...rest }: any) {
  const ctx = useContext(CarouselCtx);
  const isVertical = ctx?.orientation === "vertical";
  return (
    <button type="button" disabled={!ctx?.canPrev}
      className={cn(
        "absolute inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow hover:bg-accent disabled:opacity-40",
        isVertical ? "top-2 left-1/2 -translate-x-1/2" : "left-2 top-1/2 -translate-y-1/2",
        className,
      )}
      onClick={() => ctx?.scrollPrev()} {...rest}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {isVertical ? <path d="m18 15-6-6-6 6"/> : <path d="m15 18-6-6 6-6"/>}
      </svg>
    </button>
  );
}
export function CarouselNext({ className = "", ...rest }: any) {
  const ctx = useContext(CarouselCtx);
  const isVertical = ctx?.orientation === "vertical";
  return (
    <button type="button" disabled={!ctx?.canNext}
      className={cn(
        "absolute inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow hover:bg-accent disabled:opacity-40",
        isVertical ? "bottom-8 left-1/2 -translate-x-1/2" : "right-2 top-1/2 -translate-y-1/2",
        className,
      )}
      onClick={() => ctx?.scrollNext()} {...rest}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {isVertical ? <path d="m6 9 6 6 6-6"/> : <path d="m9 18 6-6-6-6"/>}
      </svg>
    </button>
  );
}`,

  "button-group": `import { cn } from "@/components/ui/_cn";
export function ButtonGroup(props: any) {
  const { orientation = "horizontal", className = "", style, children } = props;
  const cls = orientation === "vertical"
    ? "flex flex-col w-fit [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none"
    : "flex w-fit [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none";
  return <div role="group" className={cn(cls, className)} style={style}>{children}</div>;
}`,

  // --- Overlay wrapper components (context-based for proper state sharing) ---

  tooltip: `import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
const Ctx = createContext<any>(null);
export function TooltipProvider(props: any) { return <>{props.children}</>; }
export function Tooltip(props: any) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  return <Ctx.Provider value={{ show, setShow, triggerRef }}><div className="w-fit h-fit">{props.children}</div></Ctx.Provider>;
}
export function TooltipTrigger(props: any) {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ctx.triggerRef.current = ref.current;
    const el = ref.current;
    if (!el || props.trigger !== "focus") return;
    const show = () => ctx?.setShow(true);
    const hide = () => ctx?.setShow(false);
    el.addEventListener("focusin", show);
    el.addEventListener("focusout", hide);
    return () => { el.removeEventListener("focusin", show); el.removeEventListener("focusout", hide); };
  }, [props.trigger, ctx]);
  if (props.trigger === "focus") {
    return <div ref={ref}>{props.children}</div>;
  }
  return <div ref={ref} onMouseEnter={() => ctx?.setShow(true)} onMouseLeave={() => ctx?.setShow(false)}>{props.children}</div>;
}
export function TooltipContent(props: any) {
  const ctx = useContext(Ctx);
  const [pos, setPos] = useState<{top:number;left:number} | null>(null);
  const side = props.side || "top";
  useLayoutEffect(() => {
    if (!ctx?.show || !ctx.triggerRef.current) return;
    const r = ctx.triggerRef.current.getBoundingClientRect();
    const gap = 8;
    if (side === "top") setPos({ top: r.top - gap, left: r.left + r.width / 2 });
    else if (side === "bottom") setPos({ top: r.bottom + gap, left: r.left + r.width / 2 });
    else if (side === "left") setPos({ top: r.top + r.height / 2, left: r.left - gap });
    else setPos({ top: r.top + r.height / 2, left: r.right + gap });
  }, [ctx?.show, side]);
  if (!ctx?.show || !pos) return null;
  const transformMap: Record<string, string> = {
    top: "translate(-50%, -100%)", bottom: "translate(-50%, 0)", left: "translate(-100%, -50%)", right: "translate(0, -50%)"
  };
  const cls = \`fixed z-[9999] rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md whitespace-pre-wrap w-max \${props.className || ""}\`.trim();
  const hasKbd = typeof props.children === "string" && props.children.includes("<kbd>");
  return createPortal(<div className={cls} style={{ top: pos.top, left: pos.left, transform: transformMap[side] }} {...(hasKbd ? { dangerouslySetInnerHTML: { __html: props.children } } : { children: props.children })} />, document.body);
}`,

  dialog: `import { createContext, useContext, useState } from "react";
const Ctx = createContext<any>(null);
export function Dialog(props: any) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
}
export function DialogTrigger(props: any) {
  const ctx = useContext(Ctx);
  return <span onClick={() => ctx?.setOpen(true)} style={{ cursor: "pointer", display: "inline-block" }}>{props.children}</span>;
}
export function DialogContent(props: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  const cls = ("relative z-[10000] w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg " + (props.className || "")).trim();
  return <div className="fixed inset-0 z-[10000] flex items-center justify-center"><div className="fixed inset-0 bg-black/80" onClick={() => ctx?.setOpen(false)} /><div className={cls} style={props.style}>{props.children}<button type="button" onClick={() => ctx?.setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">\u2715</button></div></div>;
}`,

  "alert-dialog": `import { createContext, useContext, useState } from "react";
const Ctx = createContext<any>(null);
export function AlertDialog(props: any) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
}
export function AlertDialogTrigger(props: any) {
  const ctx = useContext(Ctx);
  return <span onClick={() => ctx?.setOpen(true)} style={{ cursor: "pointer", display: "inline-block" }}>{props.children}</span>;
}
export function AlertDialogContent(props: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  const cls = ("relative z-[10000] w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg " + (props.className || "")).trim();
  return <div className="fixed inset-0 z-[10000] flex items-center justify-center"><div className="fixed inset-0 bg-black/80" /><div className={cls} style={props.style}>{props.children}</div></div>;
}
export function AlertDialogAction(props: any) {
  const ctx = useContext(Ctx);
  return <button type="button" onClick={() => ctx?.setOpen(false)} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">{props.children}</button>;
}
export function AlertDialogCancel(props: any) {
  const ctx = useContext(Ctx);
  return <button type="button" onClick={() => ctx?.setOpen(false)} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">{props.children}</button>;
}`,

  sheet: `import { createContext, useContext, useState } from "react";
const Ctx = createContext<any>(null);
export function Sheet(props: any) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
}
export function SheetTrigger(props: any) {
  const ctx = useContext(Ctx);
  return <span onClick={() => ctx?.setOpen(true)} style={{ cursor: "pointer", display: "inline-block" }}>{props.children}</span>;
}
export function SheetContent(props: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  const side = props.side || "right";
  const posMap: Record<string, string> = {
    right: "inset-y-0 right-0 w-3/4 max-w-sm border-l",
    left: "inset-y-0 left-0 w-3/4 max-w-sm border-r",
    top: "inset-x-0 top-0 border-b",
    bottom: "inset-x-0 bottom-0 border-t",
  };
  const pos = posMap[side] || posMap.right;
  const cls = ("fixed z-[10000] bg-background p-6 shadow-lg " + pos + " " + (props.className || "")).trim();
  return <><div className="fixed inset-0 z-[10000] bg-black/80" onClick={() => ctx?.setOpen(false)} /><div className={cls} style={props.style}>{props.children}<button type="button" onClick={() => ctx?.setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">\u2715</button></div></>;
}`,

  drawer: `import { createContext, useContext, useState } from "react";
const Ctx = createContext<any>(null);
export function Drawer(props: any) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
}
export function DrawerTrigger(props: any) {
  const ctx = useContext(Ctx);
  return <span onClick={() => ctx?.setOpen(true)} style={{ cursor: "pointer", display: "inline-block" }}>{props.children}</span>;
}
export function DrawerContent(props: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  const cls = ("fixed inset-x-0 bottom-0 z-[10000] rounded-t-xl border-t bg-background p-6 shadow-lg " + (props.className || "")).trim();
  return <><div className="fixed inset-0 z-[10000] bg-black/80" onClick={() => ctx?.setOpen(false)} /><div className={cls} style={props.style}>{props.children}<button type="button" onClick={() => ctx?.setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">\u2715</button></div></>;
}`,

  popover: `import { cn } from "@/components/ui/_cn";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ComboboxCtx } from "@/components/ui/_combobox";
const Ctx = createContext<any>(null);
export function Popover(props: any) {
  const { style, className, children } = props;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLElement | null>(null);
  return <ComboboxCtx.Provider value={{ open, setOpen, value, setValue, search, setSearch }}><Ctx.Provider value={{ open, setOpen, triggerRef }}><div className={cn("inline-grid", className)} style={style}>{children}</div></Ctx.Provider></ComboboxCtx.Provider>;
}
export function PopoverTrigger(props: any) {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) { const child = ref.current.firstElementChild as HTMLElement | null; ctx.triggerRef.current = child ?? ref.current; } }, []);
  return <span ref={ref} onClick={() => ctx?.setOpen(!ctx?.open)} style={{ cursor: "pointer", display: "block", ...props.style }}>{props.children}</span>;
}
export function PopoverContent(props: any) {
  const ctx = useContext(Ctx);
  const [pos, setPos] = useState<{top:number;left:number;width:number;triggerTop:number} | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ctx?.open || !ctx.triggerRef.current) return;
    const r = ctx.triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width, triggerTop: r.top });
  }, [ctx?.open]);
  useLayoutEffect(() => {
    if (!pos || !contentRef.current) return;
    const el = contentRef.current;
    const h = el.offsetHeight, w = el.offsetWidth;
    let { top, left } = pos;
    if (top + h > window.innerHeight) top = pos.triggerTop - h - 4;
    if (left + w > window.innerWidth) left = Math.max(4, window.innerWidth - w - 4);
    if (top < 0) top = 4;
    el.style.top = top + "px";
    el.style.left = left + "px";
  }, [pos]);
  if (!ctx?.open || !pos) return null;
  const effectiveWidth = props.style?.width ?? \`\${pos.width}px\`;
  const cls = cn("fixed z-[9999] rounded-md border border-gray-300 bg-popover p-4 text-popover-foreground shadow-md", props.className);
  return createPortal(<><div className="fixed inset-0 z-[9998]" onClick={() => ctx.setOpen(false)} /><div ref={contentRef} className={cls} style={{ top: pos.top, left: pos.left, width: effectiveWidth, ...props.style }} onClick={(e: any) => e.stopPropagation()}>{props.children}</div></>, document.body);
}`,

  "dropdown-menu": `import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
const Ctx = createContext<any>(null);
export function DropdownMenu(props: any) {
  const [open, setOpen] = useState(false);
  const { style, ...rest } = props;
  const triggerRef = useRef<HTMLElement | null>(null);
  return <Ctx.Provider value={{ open, setOpen, triggerRef }}><div className="inline-block" style={style} {...rest}>{props.children}</div></Ctx.Provider>;
}
export function DropdownMenuTrigger(props: any) {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) ctx.triggerRef.current = ref.current; }, []);
  const cls = props.className || "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground";
  return <span ref={ref} className={cls} onClick={() => ctx?.setOpen(!ctx?.open)} style={{ cursor: "pointer", display: "inline-flex" }}>{props.children}</span>;
}
export function DropdownMenuContent(props: any) {
  const ctx = useContext(Ctx);
  const [pos, setPos] = useState<{top:number;left:number} | null>(null);
  useLayoutEffect(() => {
    if (!ctx?.open || !ctx.triggerRef.current) return;
    const r = ctx.triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left });
  }, [ctx?.open]);
  if (!ctx?.open || !pos) return null;
  const cls = ("fixed z-[9999] " + (props.className || "min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md")).trim();
  return createPortal(<><div className="fixed inset-0 z-[9998]" onClick={() => ctx.setOpen(false)} /><div className={cls} style={{ top: pos.top, left: pos.left, ...props.style }}>{props.children}</div></>, document.body);
}
export function DropdownMenuItem(props: any) {
  const base = "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent";
  const children = Array.isArray(props.children) ? props.children : [props.children];
  const label = children.filter((c: any) => typeof c === "string" || (c && c.type !== DropdownMenuShortcut));
  const shortcut = children.filter((c: any) => c && c.type === DropdownMenuShortcut);
  return <div className={props.className ? "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none " + props.className : base}><span className="flex-1">{label}</span>{shortcut}</div>;
}
export function DropdownMenuCheckboxItem(props: any) {
  const [checked, setChecked] = useState(!!props.checked);
  const base = "relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent";
  const children = Array.isArray(props.children) ? props.children : [props.children];
  const label = children.filter((c: any) => typeof c === "string" || (c && c.type !== DropdownMenuShortcut));
  const shortcut = children.filter((c: any) => c && c.type === DropdownMenuShortcut);
  return <div className={props.className ? "relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none " + props.className : base} onClick={() => setChecked((v: boolean) => !v)}><span className={"absolute left-2 flex h-3.5 w-3.5 items-center justify-center" + (props.checkTextClass ? " " + props.checkTextClass : "")}>{checked ? "✓" : ""}</span><span className="flex-1">{label}</span>{shortcut}</div>;
}
export function DropdownMenuSeparator() { return <div className="my-1 h-px bg-border" />; }
export function DropdownMenuLabel(props: any) {
  return <div className="px-2 py-1.5 text-xs font-semibold">{props.children}</div>;
}
export function DropdownMenuShortcut(props: any) {
  const cls = props.className || "ml-auto text-xs tracking-widest text-muted-foreground";
  return <span className={cls}>{props.children}</span>;
}`,

  sonner: `export function toast(message: any, options?: any) {
  const text = typeof message === "string" ? message : message?.description || String(message);
  const pos = options?.position || "bottom-right";
  const isTop = pos.startsWith("top");
  const isLeft = pos.endsWith("-left");
  const el = document.createElement("div");
  el.textContent = text;
  Object.assign(el.style, {
    position: "fixed",
    [isTop ? "top" : "bottom"]: "2rem",
    [isLeft ? "left" : "right"]: "2rem",
    zIndex: "9999",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    lineHeight: "1.4",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    border: "1px solid var(--color-border)",
    background: "var(--color-background)",
    color: "var(--color-foreground)",
    maxWidth: "24rem",
    transition: "opacity 0.3s",
  });
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
export function Toaster() { return null; }`,

  "context-menu": `import { createContext, useContext, useState } from "react";
const Ctx = createContext<any>(null);
export function ContextMenu(props: any) {
  const [pos, setPos] = useState<any>(null);
  return <Ctx.Provider value={{ pos, setPos }}>{props.children}</Ctx.Provider>;
}
export function ContextMenuTrigger(props: any) {
  const ctx = useContext(Ctx);
  return <div onContextMenu={(e: any) => { e.preventDefault(); ctx?.setPos({ x: e.clientX, y: e.clientY }); }}>{props.children}</div>;
}
export function ContextMenuContent(props: any) {
  const ctx = useContext(Ctx);
  const cls = props.className || "min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md";
  if (!ctx) return <div className={cls} style={props.style}>{props.children}</div>;
  if (!ctx.pos) return null;
  return <><div className="fixed inset-0 z-40" onClick={() => ctx.setPos(null)} /><div className={"fixed z-50 " + cls} style={{ ...props.style, left: ctx.pos.x, top: ctx.pos.y }}>{props.children}</div></>;
}
export function ContextMenuItem(props: any) {
  const base = "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent";
  return <div className={props.className ? props.className + " relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none" : base}>{props.children}</div>;
}
export function ContextMenuCheckboxItem(props: any) {
  const [checked, setChecked] = useState(!!props.checked);
  const base = "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent";
  return <div className={props.className ? props.className + " relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none" : base} onClick={() => setChecked((v: boolean) => !v)}><span className={"absolute left-2 flex h-3.5 w-3.5 items-center justify-center" + (props.checkTextClass ? " " + props.checkTextClass : "")}>{checked ? "✓" : ""}</span>{props.children}</div>;
}
export function ContextMenuSeparator() { return <div className="my-1 h-px bg-border" />; }
export function ContextMenuLabel(props: any) {
  return <div className="px-2 py-1.5 text-xs font-semibold">{props.children}</div>;
}`,

  "hover-card": `import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
const Ctx = createContext<any>(null);
export function HoverCard(props: any) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  return <Ctx.Provider value={{ show, setShow, triggerRef }}><div className="inline-block">{props.children}</div></Ctx.Provider>;
}
export function HoverCardTrigger(props: any) {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) ctx.triggerRef.current = ref.current; }, []);
  return <span ref={ref} onMouseEnter={() => ctx?.setShow(true)} onMouseLeave={() => ctx?.setShow(false)} style={{ cursor: "pointer", display: "inline-block" }}>{props.children}</span>;
}
export function HoverCardContent(props: any) {
  const ctx = useContext(Ctx);
  const [pos, setPos] = useState<{top:number;left:number} | null>(null);
  const side = props.side || "bottom";
  useLayoutEffect(() => {
    if (!ctx?.show || !ctx.triggerRef.current) return;
    const r = ctx.triggerRef.current.getBoundingClientRect();
    const gap = 8;
    if (side === "bottom") setPos({ top: r.bottom + gap, left: r.left });
    else if (side === "top") setPos({ top: r.top - gap, left: r.left });
    else if (side === "right") setPos({ top: r.top, left: r.right + gap });
    else setPos({ top: r.top, left: r.left - gap });
  }, [ctx?.show, side]);
  if (!ctx?.show || !pos) return null;
  const defaultCls = "min-w-[200px] rounded-md border bg-popover p-4 text-popover-foreground shadow-md";
  const transform = side === "top" ? "translateY(-100%)" : side === "left" ? "translateX(-100%)" : undefined;
  const cls = ("fixed z-[9999] " + (props.className || defaultCls)).trim();
  return createPortal(<div className={cls} style={{ top: pos.top, left: pos.left, transform, ...props.style }} onMouseEnter={() => ctx?.setShow(true)} onMouseLeave={() => ctx?.setShow(false)}>{props.children}</div>, document.body);
}`,

  "data-table": `import { cn } from "@/components/ui/_cn";
import { useState } from "react";
function parseColDefs(cols) {
  if (!Array.isArray(cols)) return [];
  return cols;
}
function getHeader(col) { return col.header ?? col.id ?? col.accessorKey ?? ""; }
function getCell(col, row) {
  if (typeof col.cell === "function") {
    try { return col.cell({ row: { original: row, getValue: (k) => row[k] } }); } catch { return null; }
  }
  if (col.accessorKey) return String(row[col.accessorKey] ?? "");
  return null;
}
export function DataTable(props) {
  const {
    columns = [], data = [],
    filterType = "none", pageable = false, pageSize = 10,
    selectable = false, columnToggle = false, stickyHeader = false, pinnedLeft = 0,
    className = "", headerBgClass = "", hoverRowClass = "", selectedRowClass = "",
    headerTextClass = "", headerHoverTextClass = "", headerBorderClass = "", tableBorderClass = "",
    sortIconClass = "", filterIconClass = "",
    style: parentStyle, width, height, ...rest
  } = props;
  const cols = parseColDefs(columns);
  const pageSizeNum = Math.max(1, Number(pageSize) || 10);
  const pinnedLeftNum = Math.max(0, Number(pinnedLeft) || 0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [filterValue, setFilterValue] = useState("");
  const [filterCol, setFilterCol] = useState("all");
  const [headerFilters, setHeaderFilters] = useState({});
  const [activeHeaderFilter, setActiveHeaderFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [hiddenCols, setHiddenCols] = useState(new Set());
  const [showColToggle, setShowColToggle] = useState(false);
  let rows = [...data];
  if (filterType === "bar" && filterValue) {
    rows = rows.filter(row => {
      if (filterCol === "all") return cols.filter(c => c.accessorKey).some(c => String(row[c.accessorKey] ?? "").toLowerCase().includes(filterValue.toLowerCase()));
      return String(row[filterCol] ?? "").toLowerCase().includes(filterValue.toLowerCase());
    });
  }
  if (filterType === "header") {
    for (const [k, v] of Object.entries(headerFilters)) {
      if (v) rows = rows.filter(row => String(row[k] ?? "").toLowerCase().includes(v.toLowerCase()));
    }
  }
  if (sortCol) {
    rows = [...rows].sort((a, b) => {
      const av = String(a[sortCol] ?? ""), bv = String(b[sortCol] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSizeNum));
  const displayRows = pageable ? rows.slice((page - 1) * pageSizeNum, page * pageSizeNum) : rows;
  const visibleCols = cols.filter(c => !hiddenCols.has(c.id ?? c.accessorKey ?? c.key));
  const containerStyle = { ...parentStyle };
  if (width && width !== "auto") containerStyle.width = /^\\d+(\\.\\d+)?$/.test(String(width)) ? String(width) + "px" : String(width);
  if (height && height !== "auto") containerStyle.height = /^\\d+(\\.\\d+)?$/.test(String(height)) ? String(height) + "px" : String(height);
  const headerSt = stickyHeader ? { position: "sticky", top: 0, zIndex: 2 } : {};
  function getPinnedStyle(colIdx) {
    if (colIdx >= pinnedLeftNum) return {};
    let left = selectable ? 40 : 0;
    for (let i = 0; i < colIdx; i++) left += (visibleCols[i]?.size ?? 120);
    return { position: "sticky", left, zIndex: 1 };
  }
  function handleSort(key) {
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
  }
  const borderCls = tableBorderClass || "border-border";
  return <div className={cn("flex flex-col gap-2", className)} style={containerStyle}>
    {(filterType === "bar" || columnToggle) && <div className="flex items-center gap-2">
      {filterType === "bar" && <>
        <select className="rounded border border-border bg-background px-2 py-1 text-xs" value={filterCol} onChange={e => setFilterCol(e.target.value)}>
          <option value="all">All</option>
          {cols.filter(c => c.accessorKey).map(c => <option key={c.accessorKey} value={c.accessorKey}>{getHeader(c)}</option>)}
        </select>
        <input type="text" placeholder="Filter..." className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs" value={filterValue} onChange={e => setFilterValue(e.target.value)} />
      </>}
      {columnToggle && <div className="relative ml-auto">
        <button type="button" className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-accent" onClick={() => setShowColToggle(v => !v)}>Columns ▾</button>
        {showColToggle && <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded border border-border bg-background p-2 shadow-md">
          {cols.map(c => { const k = c.id ?? c.accessorKey ?? ""; return <label key={k} className="flex cursor-pointer items-center gap-1 py-0.5 text-xs"><input type="checkbox" checked={!hiddenCols.has(k)} onChange={() => setHiddenCols(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; })} />{getHeader(c)}</label>; })}
        </div>}
      </div>}
    </div>}
    <div className={cn("overflow-auto rounded-md border", borderCls)}>
      <table className="min-w-full caption-bottom border-collapse text-sm">
        <thead className={cn(headerBgClass || "bg-background")} style={headerSt}>
          <tr>
            {selectable && <th className={cn("w-10 px-2 py-2 text-left border-b", headerTextClass, headerBorderClass)} style={{ width: 40 }}><input type="checkbox" checked={displayRows.length > 0 && selectedRows.size === displayRows.length} onChange={() => selectedRows.size === displayRows.length ? setSelectedRows(new Set()) : setSelectedRows(new Set(displayRows.map((_, i) => i)))} /></th>}
            {visibleCols.map((col, ci) => {
              const key = col.id ?? col.accessorKey ?? String(ci);
              const isSorted = sortCol === key;
              return <th key={key} className={cn("px-3 py-2 text-left text-xs font-medium border-b", headerTextClass || "text-muted-foreground", headerBorderClass, ci < pinnedLeftNum && (headerBgClass || "bg-background"), col.enableSorting && \`cursor-pointer select-none \${headerHoverTextClass ? \`hover:\${headerHoverTextClass}\` : "hover:text-foreground"}\`)} style={{ ...(col.size ? { width: col.size, minWidth: col.size } : {}), ...getPinnedStyle(ci) }} onClick={() => col.enableSorting && handleSort(key)}>
                <div className="flex items-center gap-1">
                  <span>{getHeader(col)}</span>
                  {col.enableSorting && <span className={cn(sortIconClass || "text-muted-foreground/60")}>{isSorted ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>}
                  {filterType === "header" && col.accessorKey && <button type="button" className={cn("ml-auto rounded p-0.5 text-xs hover:opacity-100", filterIconClass ? "" : "opacity-40", filterIconClass || "text-muted-foreground", activeHeaderFilter === key && "text-primary opacity-100")} onClick={e => { e.stopPropagation(); setActiveHeaderFilter(v => v === key ? null : key); }}>⌕</button>}
                </div>
                {filterType === "header" && activeHeaderFilter === key && <input type="text" placeholder="Filter..." className="mt-1 w-full rounded border border-border bg-background px-1 py-0.5 text-xs font-normal" value={headerFilters[key] ?? ""} onChange={e => setHeaderFilters(p => ({ ...p, [key]: e.target.value }))} onClick={e => e.stopPropagation()} autoFocus />}
              </th>;
            })}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, ri) => {
            const isSelected = selectedRows.has(ri);
            return <tr key={ri} className={cn("border-b transition-colors group", borderCls, hoverRowClass ? \`hover:\${hoverRowClass}\` : "hover:bg-muted/50", isSelected && (selectedRowClass || "bg-muted"))}>
              {selectable && <td className="w-10 px-2 py-2" style={{ width: 40 }}><input type="checkbox" checked={isSelected} onChange={() => { const next = new Set(selectedRows); next.has(ri) ? next.delete(ri) : next.add(ri); setSelectedRows(next); }} /></td>}
              {visibleCols.map((col, ci) => {
                const key = col.id ?? col.accessorKey ?? String(ci);
                return <td key={key} className={cn("px-3 py-2 text-sm transition-colors", ci < pinnedLeftNum && "bg-background", ci < pinnedLeftNum && (hoverRowClass ? \`group-hover:\${hoverRowClass}\` : "group-hover:bg-muted/50"), ci < pinnedLeftNum && isSelected && (selectedRowClass || "bg-muted"))} style={{ ...(col.size ? { width: col.size, minWidth: col.size } : {}), ...getPinnedStyle(ci) }}>{getCell(col, row)}</td>;
              })}
            </tr>;
          })}
          {displayRows.length === 0 && <tr><td colSpan={visibleCols.length + (selectable ? 1 : 0)} className="px-3 py-8 text-center text-sm text-muted-foreground">No results.</td></tr>}
        </tbody>
      </table>
    </div>
    {pageable && <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{selectable ? \`\${selectedRows.size} of \${totalRows} row(s) selected.\` : \`\${totalRows} row(s)\`}</span>
      <div className="flex items-center gap-1">
        <button type="button" className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
        <button type="button" className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
        <span className="px-2">Page {page} of {totalPages}</span>
        <button type="button" className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
        <button type="button" className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
      </div>
    </div>}
  </div>;
}`,
};
