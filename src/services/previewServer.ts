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
): Promise<{ url: string; dispose: () => void }> {
  // If a session already exists for this file, return it
  const existing = activeSessions.get(mocFilePath);
  if (existing) {
    return { url: existing.url, dispose: existing.dispose };
  }

  // State
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
    const linkedPaths = new Set<string>();

    // Scan all nodes for linkedMocPath, contextMenuMocPath, and linkedMocPaths
    for (const node of Object.values(craftState)) {
      const n = node as { props?: Record<string, unknown> };
      const linkedPath = n?.props?.linkedMocPath as string | undefined;
      if (linkedPath) {
        linkedPaths.add(linkedPath);
      }
      const contextMenuPath = n?.props?.contextMenuMocPath as string | undefined;
      if (contextMenuPath) {
        linkedPaths.add(contextMenuPath);
      }
      const linkedMocPathsStr = n?.props?.linkedMocPaths as string | undefined;
      if (linkedMocPathsStr) {
        for (const p of linkedMocPathsStr.split(",")) {
          const trimmed = p.trim();
          if (trimmed) linkedPaths.add(trimmed);
        }
      }
    }

    linkedAbsPaths.clear();
    for (const relPath of linkedPaths) {
      try {
        const absPath = path.resolve(mocDir, relPath);
        linkedAbsPaths.add(absPath);
        const linkedFileUri = vscode.Uri.file(absPath);
        const linkedContent = new TextDecoder().decode(
          await vscode.workspace.fs.readFile(linkedFileUri),
        );
        const linkedDoc = parseMocFile(linkedContent);
        // Remove min-h-screen from linked components (they render inside overlays, not as full pages)
        let linkedTsxSource = linkedDoc.tsxSource.replace(/\bmin-h-screen\b/g, "");
        const linkedTsx = linkedDoc.imports
          ? `${linkedDoc.imports}\n${linkedTsxSource}`
          : linkedTsxSource;
        // Skip empty .moc files entirely (no hash registration = no import map entry)
        if (!linkedTsx.trim()) {
          console.warn(`[Momoc] Skipping empty linked .moc: ${relPath}`);
          continue;
        }
        const hash = crypto.createHash("md5").update(relPath).digest("hex").slice(0, 8);
        linkedHashes.set(relPath, hash);
        const linkedResult = await compileTsx(linkedTsx, workspaceRoot, [
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
  function injectLinkedComponents(tsx: string): string {
    if (linkedHashes.size === 0) return tsx;

    const importLines: string[] = [];
    const usedHashes = new Set<string>();

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
        const hash = linkedHashes.get(linkedPath);
        if (!hash) return `{/* linked: ${rawPath} (not compiled) */}`;
        const componentName = `Linked_${hash}`;
        if (!usedHashes.has(hash)) {
          usedHashes.add(hash);
          importLines.push(`import ${componentName} from "@moc-linked/${hash}";`);
        }
        return `<${componentName} />`;
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

  // Build import map: React CDN + shadcn/ui fallback routes + linked components
  function buildImportMap(): string {
    const imports: Record<string, string> = {
      "react": "https://esm.sh/react@19",
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
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
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
  const server = http.createServer((req, res) => {
    const url = req.url || "/";

    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(buildPreviewHtml());
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
      const js = fallbackJs.get(componentName);
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
      });
      return;
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
      const prevLinkedKeys = new Set(linkedHashes.keys());
      await compileCurrentFile();
      // Full reload if linked set changed (import map in HTML needs update)
      const linkedSetChanged =
        prevLinkedKeys.size !== linkedHashes.size ||
        [...linkedHashes.keys()].some((k) => !prevLinkedKeys.has(k));
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
    const placeholder = String(childArray.find((c: any) => typeof c === "string") || "Select...");
    const icons = childArray.filter((c: any) => c !== null && c !== undefined && typeof c !== "string");
    return <div className={cn("relative inline-flex items-center z-[51]", className)} style={style} onClick={(e: any) => { e.stopPropagation(); inputRef.current?.focus(); }}>
      <input ref={inputRef} type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent py-2 pl-3 pr-8 text-sm shadow-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring" value={comboCtx.search || ""} placeholder={placeholder} onChange={(e: any) => { comboCtx.setSearch(e.target.value); comboCtx.setOpen(true); }} onFocus={() => comboCtx.setOpen(true)} />
      <span className="absolute right-2 pointer-events-none opacity-50">{icons}</span>
    </div>;
  }
  const cls = cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors", v[variant] || v.default, s[size] || s.default, className);
  return <button className={cls} role={role} style={style} {...rest}>{children}</button>;
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
  const { className = "", children, ...rest } = props;
  const cls = cn("text-sm font-medium leading-none", className);
  return <label className={cls} {...rest}>{children}</label>;
}`,

  badge: `import { cn } from "@/components/ui/_cn";
export function Badge(props: any) {
  const { className = "", variant = "default", children, ...rest } = props;
  const v: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground shadow",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
    outline: "text-foreground",
  };
  const cls = cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors", v[variant] || v.default, className);
  return <span className={cls} {...rest}>{children}</span>;
}`,

  separator: `import { cn } from "@/components/ui/_cn";
export function Separator(props: any) {
  const { className = "", orientation = "horizontal", ...rest } = props;
  const base = orientation === "horizontal" ? "shrink-0 bg-border h-[1px] w-full" : "shrink-0 bg-border h-full w-[1px]";
  const cls = cn(base, className);
  return <div role="separator" className={cls} {...rest} />;
}`,

  table: `import { cn } from "@/components/ui/_cn";
export function Table(props: any) {
  const { className = "", children, style, ...rest } = props;
  const cls = cn("w-full caption-bottom text-sm", className);
  return <div className="relative w-full overflow-auto" style={style}><table className={cls} {...rest}>{children}</table></div>;
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
  return <th colSpan={colSpan} rowSpan={rowSpan} className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...rest}>{children}</th>;
}
export function TableCell(props: any) {
  const { className = "", children, colSpan, rowSpan, ...rest } = props;
  return <td colSpan={colSpan} rowSpan={rowSpan} className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...rest}>{children}</td>;
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
  const { className = "", ratio = 16/9, children, ...rest } = props;
  return <div className={cn("relative w-full", className)} style={{ paddingBottom: \`\${(1/ratio)*100}%\` }} {...rest}><div className="absolute inset-0">{children}</div></div>;
}`,

  avatar: `import { cn } from "@/components/ui/_cn";
export function Avatar(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className);
  return <span className={cls} {...rest}>{children}</span>;
}`,

  breadcrumb: `export function Breadcrumb(props: any) {
  const { className = "", children, ...rest } = props;
  return <nav aria-label="breadcrumb" className={className} {...rest}>{children}</nav>;
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
      {children && <span className="text-sm font-medium leading-none select-none">{children}</span>}
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
  const cls = cn("mx-auto flex w-full justify-center", className);
  return <nav role="navigation" aria-label="pagination" className={cls} {...rest}>{children}</nav>;
}`,

  progress: `import { cn } from "@/components/ui/_cn";
export function Progress(props: any) {
  const { className = "", value = 0, ...rest } = props;
  const cls = cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className);
  return <div role="progressbar" className={cls} {...rest}><div className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: \`translateX(-\${100 - (value || 0)}%)\` }} /></div>;
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
  const cls = cn("relative overflow-auto", className);
  return <div className={cls} {...rest}>{children}</div>;
}`,

  skeleton: `import { cn } from "@/components/ui/_cn";
export function Skeleton(props: any) {
  const { className = "", ...rest } = props;
  const cls = cn("animate-pulse rounded-md bg-primary/10", className);
  return <div className={cls} {...rest} />;
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
      {children && <span className="text-sm font-medium leading-none select-none" style={{ ...labelStyle, whiteSpace: "pre-line" }}>{children}</span>}
      {description && <p className="text-[0.8rem] text-muted-foreground" style={{ ...descStyle, whiteSpace: "pre-line" }}>{description}</p>}
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
  const cls = cn("inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", s[size] || s.default, v[variant] || v.default, className);
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
import { createContext, useContext, useState } from "react";
const SelectCtx = createContext<any>(null);
export function Select(props: any) {
  const { children, ...rest } = props;
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  return <SelectCtx.Provider value={{ value, setValue, open, setOpen }}><div className="relative inline-grid" {...rest}>{children}</div></SelectCtx.Provider>;
}
export function SelectTrigger(props: any) {
  const { className = "", children, ...rest } = props;
  const ctx = useContext(SelectCtx);
  const cls = cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className);
  return <button type="button" className={cls} onClick={() => ctx?.setOpen((o: boolean) => !o)} {...rest}>{children}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50"><path d="m6 9 6 6 6-6"/></svg></button>;
}
export function SelectContent(props: any) {
  const { className = "", children, ...rest } = props;
  const ctx = useContext(SelectCtx);
  if (!ctx?.open) return null;
  const cls = cn("absolute top-full left-0 z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-auto rounded-md border border-gray-300 bg-popover p-1 text-popover-foreground shadow-lg", className);
  return <div className={cls} {...rest}>{children}</div>;
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
  return <div className="flex items-center border-b px-3"><input type="text" className={cn("flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground", className)} placeholder={placeholder} value={ctx?.search || ""} onChange={(e: any) => ctx?.setSearch(e.target.value)} /></div>;
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
  return <div className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground", isSelected && "bg-accent text-accent-foreground", className)} onClick={handleClick} {...rest}>{children}</div>;
}
export function CommandSeparator({ className = "", ...rest }: any) {
  return <div className={cn("-mx-1 h-px bg-border", className)} {...rest} />;
}`,

  calendar: `import { cn } from "@/components/ui/_cn";
export function Calendar(props: any) {
  const { className = "", ...rest } = props;
  const cls = cn("p-3 rounded-md border", className);
  return <div className={cls} {...rest}><div className="text-sm font-medium text-center">Calendar</div></div>;
}`,

  resizable: `import { cn } from "@/components/ui/_cn";
export function ResizablePanelGroup(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = cn("flex rounded-lg border", className);
  return <div className={cls} {...rest}>{children}</div>;
}`,

  carousel: `import { cn } from "@/components/ui/_cn";
export function Carousel(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = cn("relative w-full", className);
  return <div className={cls} {...rest}>{children}</div>;
}`,

  // --- Overlay wrapper components (context-based for proper state sharing) ---

  tooltip: `import { createContext, useContext, useState, useRef, useEffect } from "react";
const Ctx = createContext<any>(null);
export function TooltipProvider(props: any) { return <>{props.children}</>; }
export function Tooltip(props: any) {
  const [show, setShow] = useState(false);
  return <Ctx.Provider value={{ show, setShow }}><div className="relative w-fit h-fit">{props.children}</div></Ctx.Provider>;
}
export function TooltipTrigger(props: any) {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
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
  return <div onMouseEnter={() => ctx?.setShow(true)} onMouseLeave={() => ctx?.setShow(false)}>{props.children}</div>;
}
export function TooltipContent(props: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.show) return null;
  const side = props.side || "top";
  const pos: Record<string, string> = {
    top: "left-1/2 -translate-x-1/2 bottom-full mb-2",
    bottom: "left-1/2 -translate-x-1/2 top-full mt-2",
    left: "top-1/2 -translate-y-1/2 right-full mr-2",
    right: "top-1/2 -translate-y-1/2 left-full ml-2",
  };
  const cls = \`absolute \${pos[side] || pos.top} z-50 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md whitespace-nowrap \${props.className || ""}\`.trim();
  return <div className={cls}>{props.children}</div>;
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
  const cls = ("relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg " + (props.className || "")).trim();
  return <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="fixed inset-0 bg-black/80" onClick={() => ctx?.setOpen(false)} /><div className={cls} style={props.style}>{props.children}<button type="button" onClick={() => ctx?.setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">\u2715</button></div></div>;
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
  const cls = ("relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg " + (props.className || "")).trim();
  return <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="fixed inset-0 bg-black/80" /><div className={cls} style={props.style}>{props.children}</div></div>;
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
  const cls = ("fixed z-50 bg-background p-6 shadow-lg " + pos + " " + (props.className || "")).trim();
  return <><div className="fixed inset-0 z-50 bg-black/80" onClick={() => ctx?.setOpen(false)} /><div className={cls} style={props.style}>{props.children}<button type="button" onClick={() => ctx?.setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">\u2715</button></div></>;
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
  const cls = ("fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t bg-background p-6 shadow-lg " + (props.className || "")).trim();
  return <><div className="fixed inset-0 z-50 bg-black/80" onClick={() => ctx?.setOpen(false)} /><div className={cls} style={props.style}>{props.children}<button type="button" onClick={() => ctx?.setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">\u2715</button></div></>;
}`,

  popover: `import { cn } from "@/components/ui/_cn";
import { createContext, useContext, useState } from "react";
import { ComboboxCtx } from "@/components/ui/_combobox";
const Ctx = createContext<any>(null);
export function Popover(props: any) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  return <ComboboxCtx.Provider value={{ open, setOpen, value, setValue, search, setSearch }}><Ctx.Provider value={{ open, setOpen }}><div className="relative inline-grid">{props.children}</div></Ctx.Provider></ComboboxCtx.Provider>;
}
export function PopoverTrigger(props: any) {
  const ctx = useContext(Ctx);
  return <span onClick={() => ctx?.setOpen(!ctx?.open)} style={{ cursor: "pointer", display: "inline-block" }}>{props.children}</span>;
}
export function PopoverContent(props: any) {
  const ctx = useContext(Ctx);
  const comboCtx = useContext(ComboboxCtx);
  if (!ctx?.open) return null;
  const cls = cn("absolute left-0 top-full mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover p-4 text-popover-foreground shadow-md", props.className);
  const handleClose = () => { ctx.setOpen(false); };
  return <><div className="fixed inset-0 z-40" onClick={handleClose} /><div className={cls} style={props.style} onClick={(e: any) => e.stopPropagation()}>{props.children}</div></>;
}`,

  "dropdown-menu": `import { createContext, useContext, useState } from "react";
const Ctx = createContext<any>(null);
export function DropdownMenu(props: any) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}><div className="relative inline-block">{props.children}</div></Ctx.Provider>;
}
export function DropdownMenuTrigger(props: any) {
  const ctx = useContext(Ctx);
  return <span onClick={() => ctx?.setOpen(!ctx?.open)} style={{ cursor: "pointer", display: "inline-block" }}>{props.children}</span>;
}
export function DropdownMenuContent(props: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  const cls = ("absolute left-0 top-full mt-2 z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md " + (props.className || "")).trim();
  return <div className={cls} style={props.style}>{props.children}</div>;
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
  if (!ctx?.pos) return null;
  return <><div className="fixed inset-0 z-40" onClick={() => ctx?.setPos(null)} /><div className="fixed z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md" style={{ left: ctx.pos.x, top: ctx.pos.y }}>{props.children}</div></>;
}`,
};
