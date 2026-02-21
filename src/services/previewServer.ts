import * as http from "http";
import * as path from "path";
import * as crypto from "crypto";
import * as vscode from "vscode";
import { compileTsx } from "./esbuildService.js";
import { parseMocFile } from "./mocParser.js";
import { craftStateToTsx } from "./craftToTsx.js";

interface PreviewSession {
  server: http.Server;
  url: string;
  mocFilePath: string;
  dispose: () => void;
}

const activeSessions = new Map<string, PreviewSession>();

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

  // Pre-compile fallback shadcn/ui components → ESM JS
  const fallbackJs = new Map<string, string>();
  for (const [name, source] of Object.entries(FALLBACK_SOURCES)) {
    const result = await compileTsx(source, workspaceRoot);
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

      const fullTsx = mocDoc.imports
        ? `${mocDoc.imports}\n${mocDoc.tsxSource}`
        : mocDoc.tsxSource;

      // Externalize @/components/ui/* — browser resolves via import map
      const result = await compileTsx(fullTsx, workspaceRoot, [
        shadcnExternalPlugin(),
      ]);
      if (result.error) {
        cachedError = result.error;
        cachedComponentJs = "";
      } else {
        cachedComponentJs = result.code;
        cachedError = "";
      }

      // Compile linked .moc files referenced via linkedMocPath
      linkedJs.clear();
      if (mocDoc.craftState) {
        await compileLinkedMocFiles(mocDoc.craftState);
      }
    } catch (err) {
      cachedError = err instanceof Error ? err.message : String(err);
      cachedComponentJs = "";
    }
  }

  async function compileLinkedMocFiles(craftState: Record<string, unknown>): Promise<void> {
    const mocDir = path.dirname(mocFilePath);
    const linkedPaths = new Set<string>();

    // Scan all nodes for linkedMocPath and contextMenuMocPath
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
    }

    for (const relPath of linkedPaths) {
      try {
        const absPath = path.resolve(mocDir, relPath);
        const hash = crypto.createHash("md5").update(relPath).digest("hex").slice(0, 8);
        const linkedFileUri = vscode.Uri.file(absPath);
        const linkedContent = new TextDecoder().decode(
          await vscode.workspace.fs.readFile(linkedFileUri),
        );
        const linkedDoc = parseMocFile(linkedContent);
        const linkedTsx = linkedDoc.imports
          ? `${linkedDoc.imports}\n${linkedDoc.tsxSource}`
          : linkedDoc.tsxSource;
        const linkedResult = await compileTsx(linkedTsx, workspaceRoot, [
          shadcnExternalPlugin(),
        ]);
        if (linkedResult.code) {
          linkedJs.set(hash, linkedResult.code);
        }
      } catch (err) {
        console.warn(`[Mocker] Failed to compile linked .moc: ${relPath}`, err);
      }
    }
  }

  function sendReload(): void {
    const data = JSON.stringify({ theme: currentTheme });
    for (const res of sseClients) {
      res.write(`event: reload\ndata: ${data}\n\n`);
    }
  }

  // Build import map: React CDN + shadcn/ui fallback routes
  function buildImportMap(): string {
    const imports: Record<string, string> = {
      "react": "https://esm.sh/react@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client",
      "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime",
    };
    for (const name of Object.keys(FALLBACK_SOURCES)) {
      imports[`@/components/ui/${name}`] = `/ui/${name}.js`;
    }
    // sonner toast — provide a no-op stub for preview
    imports["sonner"] = "data:text/javascript,export function toast(){}";
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
  <title>Mocker Preview</title>
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

  // Listen on random port
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as { port: number };
  const serverUrl = `http://127.0.0.1:${addr.port}`;

  // File watcher: recompile and notify on save
  const watcher = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    if (doc.uri.fsPath === mocFilePath) {
      await compileCurrentFile();
      sendReload();
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

// --- esbuild plugin: externalize @/components/ui/* for browser import map resolution ---

function shadcnExternalPlugin() {
  return {
    name: "shadcn-external",
    setup(build: {
      onResolve: (
        opts: { filter: RegExp },
        cb: (args: { path: string }) => { path: string; external: true },
      ) => void;
    }) {
      build.onResolve({ filter: /^@\/components\/ui\// }, (args) => {
        return { path: args.path, external: true };
      });
      build.onResolve({ filter: /^sonner$/ }, (args) => {
        return { path: args.path, external: true };
      });
    },
  };
}

// --- shadcn/ui fallback component sources (TSX) ---
// Compiled to ESM JS at server startup, served at /ui/<name>.js

const FALLBACK_SOURCES: Record<string, string> = {
  button: `export function Button(props: any) {
  const { className = "", variant = "default", size = "default", children, ...rest } = props;
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
  const cls = \`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors \${v[variant] || v.default} \${s[size] || s.default} \${className}\`.trim();
  return <button className={cls} {...rest}>{children}</button>;
}`,

  input: `export function Input(props: any) {
  const { className = "", ...rest } = props;
  const cls = \`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 \${className}\`.trim();
  return <input className={cls} {...rest} />;
}`,

  card: `export function Card(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`rounded-xl border bg-card text-card-foreground shadow \${className}\`.trim();
  return <div className={cls} {...rest}>{children}</div>;
}`,

  label: `export function Label(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`text-sm font-medium leading-none \${className}\`.trim();
  return <label className={cls} {...rest}>{children}</label>;
}`,

  badge: `export function Badge(props: any) {
  const { className = "", variant = "default", children, ...rest } = props;
  const v: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground shadow",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
    outline: "text-foreground",
  };
  const cls = \`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors \${v[variant] || v.default} \${className}\`.trim();
  return <span className={cls} {...rest}>{children}</span>;
}`,

  separator: `export function Separator(props: any) {
  const { className = "", orientation = "horizontal", ...rest } = props;
  const cls = orientation === "horizontal"
    ? \`shrink-0 bg-border h-[1px] w-full \${className}\`.trim()
    : \`shrink-0 bg-border h-full w-[1px] \${className}\`.trim();
  return <div role="separator" className={cls} {...rest} />;
}`,

  table: `export function Table(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`w-full caption-bottom text-sm \${className}\`.trim();
  return <div className="relative w-full overflow-auto"><table className={cls} {...rest}>{children}</table></div>;
}`,

  // Phase 1: Simple components
  accordion: `export function Accordion(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`w-full \${className}\`.trim();
  return <div className={cls} {...rest}>{children}</div>;
}`,

  alert: `export function Alert(props: any) {
  const { className = "", variant = "default", children, ...rest } = props;
  const v: Record<string, string> = {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive dark:border-destructive",
  };
  const cls = \`relative w-full rounded-lg border px-4 py-3 text-sm \${v[variant] || v.default} \${className}\`.trim();
  return <div role="alert" className={cls} {...rest}>{children}</div>;
}`,

  "aspect-ratio": `export function AspectRatio(props: any) {
  const { className = "", ratio = 16/9, children, ...rest } = props;
  return <div className={\`relative w-full \${className}\`.trim()} style={{ paddingBottom: \`\${(1/ratio)*100}%\` }} {...rest}><div className="absolute inset-0">{children}</div></div>;
}`,

  avatar: `export function Avatar(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full \${className}\`.trim();
  return <span className={cls} {...rest}>{children}</span>;
}`,

  breadcrumb: `export function Breadcrumb(props: any) {
  const { className = "", children, ...rest } = props;
  return <nav aria-label="breadcrumb" className={className} {...rest}>{children}</nav>;
}`,

  checkbox: `export function Checkbox(props: any) {
  const { className = "", checked, disabled, ...rest } = props;
  const cls = \`peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 \${checked ? "bg-primary text-primary-foreground" : ""} \${className}\`.trim();
  return <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} className={cls} {...rest} />;
}`,

  collapsible: `export function Collapsible(props: any) {
  const { className = "", children, ...rest } = props;
  return <div className={className} {...rest}>{children}</div>;
}`,

  pagination: `export function Pagination(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`mx-auto flex w-full justify-center \${className}\`.trim();
  return <nav role="navigation" aria-label="pagination" className={cls} {...rest}>{children}</nav>;
}`,

  progress: `export function Progress(props: any) {
  const { className = "", value = 0, ...rest } = props;
  const cls = \`relative h-2 w-full overflow-hidden rounded-full bg-primary/20 \${className}\`.trim();
  return <div role="progressbar" className={cls} {...rest}><div className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: \`translateX(-\${100 - (value || 0)}%)\` }} /></div>;
}`,

  "radio-group": `export function RadioGroup(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`grid gap-2 \${className}\`.trim();
  return <div role="radiogroup" className={cls} {...rest}>{children}</div>;
}`,

  "scroll-area": `export function ScrollArea(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`relative overflow-auto \${className}\`.trim();
  return <div className={cls} {...rest}>{children}</div>;
}`,

  skeleton: `export function Skeleton(props: any) {
  const { className = "", ...rest } = props;
  const cls = \`animate-pulse rounded-md bg-primary/10 \${className}\`.trim();
  return <div className={cls} {...rest} />;
}`,

  slider: `export function Slider(props: any) {
  const { className = "", value = [50], min = 0, max = 100, ...rest } = props;
  const v = Array.isArray(value) ? value[0] : value;
  const pct = ((v - min) / (max - min)) * 100;
  const cls = \`relative flex w-full touch-none select-none items-center \${className}\`.trim();
  return <div className={cls} {...rest}><div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20"><div className="absolute h-full bg-primary" style={{ width: \`\${pct}%\` }} /></div></div>;
}`,

  switch: `export function Switch(props: any) {
  const { className = "", checked, disabled, ...rest } = props;
  const cls = \`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors \${checked ? "bg-primary" : "bg-input"} \${disabled ? "cursor-not-allowed opacity-50" : ""} \${className}\`.trim();
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} className={cls} {...rest}><span className={\`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform \${checked ? "translate-x-4" : "translate-x-0"}\`} /></button>;
}`,

  tabs: `export function Tabs(props: any) {
  const { className = "", children, ...rest } = props;
  return <div className={className} {...rest}>{children}</div>;
}`,

  textarea: `export function Textarea(props: any) {
  const { className = "", ...rest } = props;
  const cls = \`flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 \${className}\`.trim();
  return <textarea className={cls} {...rest} />;
}`,

  toggle: `export function Toggle(props: any) {
  const { className = "", variant = "default", pressed, children, ...rest } = props;
  const v: Record<string, string> = {
    default: "bg-transparent",
    outline: "border border-input bg-transparent shadow-sm",
  };
  const cls = \`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground h-9 px-3 min-w-9 \${pressed ? "bg-accent text-accent-foreground" : ""} \${v[variant] || v.default} \${className}\`.trim();
  return <button type="button" aria-pressed={pressed} className={cls} {...rest}>{children}</button>;
}`,

  "toggle-group": `export function ToggleGroup(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`flex items-center justify-center gap-1 \${className}\`.trim();
  return <div role="group" className={cls} {...rest}>{children}</div>;
}`,

  // Phase 2: Complex components
  select: `export function Select(props: any) {
  const { className = "", children, ...rest } = props;
  return <div className={className} {...rest}>{children}</div>;
}`,

  calendar: `export function Calendar(props: any) {
  const { className = "", ...rest } = props;
  const cls = \`p-3 rounded-md border \${className}\`.trim();
  return <div className={cls} {...rest}><div className="text-sm font-medium text-center">Calendar</div></div>;
}`,

  resizable: `export function ResizablePanelGroup(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`flex rounded-lg border \${className}\`.trim();
  return <div className={cls} {...rest}>{children}</div>;
}`,

  carousel: `export function Carousel(props: any) {
  const { className = "", children, ...rest } = props;
  const cls = \`relative w-full \${className}\`.trim();
  return <div className={cls} {...rest}>{children}</div>;
}`,

  // Overlay wrapper components
  tooltip: `import { useState } from "react";
export function TooltipProvider(props: any) { return <>{props.children}</>; }
export function Tooltip(props: any) {
  const [show, setShow] = useState(false);
  return <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>{typeof props.children === "function" ? props.children({ open: show }) : props.children}{show && <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50"><div data-slot="tooltip-content" className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md">{/* tooltip content injected */}</div></div>}</div>;
}
export function TooltipTrigger(props: any) { return <>{props.children}</>; }
export function TooltipContent(props: any) { return <div className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md">{props.children}</div>; }`,

  dialog: `import { useState } from "react";
export function Dialog(props: any) {
  const [open, setOpen] = useState(false);
  return <div data-slot="dialog">{typeof props.children === "object" && Array.isArray(props.children) ? props.children.map((c: any, i: number) => {
    if (c?.props?.["data-slot"] === "dialog-trigger" || c?.type?.displayName === "DialogTrigger") return <span key={i} onClick={() => setOpen(true)}>{c}</span>;
    if (open) return <div key={i} className="fixed inset-0 z-50 flex items-center justify-center"><div className="fixed inset-0 bg-black/80" onClick={() => setOpen(false)} /><div className="relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">{c}<button onClick={() => setOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">✕</button></div></div>;
    return null;
  }) : props.children}</div>;
}
export function DialogTrigger(props: any) { return <>{props.children}</>; }
export function DialogContent(props: any) { return <div>{props.children}</div>; }`,

  "alert-dialog": `import { useState } from "react";
export function AlertDialog(props: any) { return <div>{props.children}</div>; }
export function AlertDialogTrigger(props: any) { return <>{props.children}</>; }
export function AlertDialogContent(props: any) { return <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">{props.children}</div>; }
export function AlertDialogAction(props: any) { return <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">{props.children}</button>; }
export function AlertDialogCancel(props: any) { return <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">{props.children}</button>; }`,

  sheet: `export function Sheet(props: any) { return <div>{props.children}</div>; }
export function SheetTrigger(props: any) { return <>{props.children}</>; }
export function SheetContent(props: any) { return <div className="fixed inset-y-0 right-0 z-50 w-3/4 max-w-sm border-l bg-background p-6 shadow-lg">{props.children}</div>; }`,

  drawer: `export function Drawer(props: any) { return <div>{props.children}</div>; }
export function DrawerTrigger(props: any) { return <>{props.children}</>; }
export function DrawerContent(props: any) { return <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-lg border-t bg-background p-6 shadow-lg">{props.children}</div>; }`,

  popover: `export function Popover(props: any) { return <div className="relative inline-block">{props.children}</div>; }
export function PopoverTrigger(props: any) { return <>{props.children}</>; }
export function PopoverContent(props: any) { return <div className="z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md">{props.children}</div>; }`,

  "dropdown-menu": `export function DropdownMenu(props: any) { return <div className="relative inline-block">{props.children}</div>; }
export function DropdownMenuTrigger(props: any) { return <>{props.children}</>; }
export function DropdownMenuContent(props: any) { return <div className="z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md">{props.children}</div>; }`,

  "context-menu": `export function ContextMenu(props: any) { return <div>{props.children}</div>; }
export function ContextMenuTrigger(props: any) { return <>{props.children}</>; }
export function ContextMenuContent(props: any) { return <div className="z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md">{props.children}</div>; }`,
};
