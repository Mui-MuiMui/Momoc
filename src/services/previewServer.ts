import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { compileTsx } from "./esbuildService.js";
import { parseMocFile } from "./mocParser.js";

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

  // Initial compile
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

      const result = await compileTsx(fullTsx, workspaceRoot, [
        shadcnFallbackPlugin(workspaceRoot),
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

  function sendReload(): void {
    const data = JSON.stringify({ theme: currentTheme });
    for (const res of sseClients) {
      res.write(`event: reload\ndata: ${data}\n\n`);
    }
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
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client",
      "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime"
    }
  }
  </script>
  <style>
    :root {
      --background: oklch(1 0 0);
      --foreground: oklch(0.145 0 0);
      --card: oklch(1 0 0);
      --card-foreground: oklch(0.145 0 0);
      --popover: oklch(1 0 0);
      --popover-foreground: oklch(0.145 0 0);
      --primary: oklch(0.205 0 0);
      --primary-foreground: oklch(0.985 0 0);
      --secondary: oklch(0.965 0 0);
      --secondary-foreground: oklch(0.205 0 0);
      --muted: oklch(0.965 0 0);
      --muted-foreground: oklch(0.556 0 0);
      --accent: oklch(0.965 0 0);
      --accent-foreground: oklch(0.205 0 0);
      --destructive: oklch(0.577 0.245 27.325);
      --destructive-foreground: oklch(0.577 0.245 27.325);
      --border: oklch(0.922 0 0);
      --input: oklch(0.922 0 0);
      --ring: oklch(0.708 0 0);
      --radius: 0.625rem;
    }
    .dark {
      --background: oklch(0.145 0 0);
      --foreground: oklch(0.985 0 0);
      --card: oklch(0.145 0 0);
      --card-foreground: oklch(0.985 0 0);
      --popover: oklch(0.145 0 0);
      --popover-foreground: oklch(0.985 0 0);
      --primary: oklch(0.985 0 0);
      --primary-foreground: oklch(0.205 0 0);
      --secondary: oklch(0.269 0 0);
      --secondary-foreground: oklch(0.985 0 0);
      --muted: oklch(0.269 0 0);
      --muted-foreground: oklch(0.708 0 0);
      --accent: oklch(0.269 0 0);
      --accent-foreground: oklch(0.985 0 0);
      --destructive: oklch(0.396 0.141 25.723);
      --destructive-foreground: oklch(0.637 0.237 25.331);
      --border: oklch(0.269 0 0);
      --input: oklch(0.269 0 0);
      --ring: oklch(0.439 0 0);
    }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background-color: var(--background);
      color: var(--foreground);
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

// --- shadcn/ui fallback components for workspaces without shadcn/ui installed ---

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
};

function shadcnFallbackPlugin(workspaceRoot: string) {
  return {
    name: "shadcn-fallback",
    setup(build: {
      onResolve: (
        opts: { filter: RegExp },
        cb: (args: { path: string }) => { path: string; namespace?: string } | undefined,
      ) => void;
      onLoad: (
        opts: { filter: RegExp; namespace: string },
        cb: (args: { path: string }) => { contents: string; loader: string },
      ) => void;
    }) {
      build.onResolve({ filter: /^@\/components\/ui\// }, (args) => {
        const componentPath = args.path.slice(2);
        const resolved = path.resolve(workspaceRoot, "src", componentPath);

        const extensions = [".tsx", ".ts", ".jsx", ".js"];
        for (const ext of extensions) {
          if (fs.existsSync(resolved + ext)) {
            return { path: resolved + ext };
          }
        }
        if (fs.existsSync(resolved)) {
          return { path: resolved };
        }
        for (const ext of extensions) {
          const indexPath = path.join(resolved, "index" + ext);
          if (fs.existsSync(indexPath)) {
            return { path: indexPath };
          }
        }

        // Fall back to built-in component
        const componentName = path.basename(args.path);
        if (FALLBACK_SOURCES[componentName]) {
          return { path: args.path, namespace: "shadcn-fallback" };
        }

        return undefined;
      });

      build.onLoad(
        { filter: /.*/, namespace: "shadcn-fallback" },
        (args) => {
          const componentName = path.basename(args.path);
          return {
            contents: FALLBACK_SOURCES[componentName] || "export {};",
            loader: "tsx",
          };
        },
      );
    },
  };
}
