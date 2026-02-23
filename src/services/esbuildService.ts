import { readFileSync } from "fs";
import * as path from "path";
import * as esbuild from "esbuild-wasm";

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  // esbuild-wasm の browser.js は worker:false 時に 'self' を参照する。
  // Node.js の CJS スコープでは self がグローバルに見えないため polyfill する。
  if (typeof (globalThis as Record<string, unknown>)["self"] === "undefined") {
    (globalThis as Record<string, unknown>)["self"] = globalThis;
  }
  // __dirname はバンドル後 out/ を指すため out/esbuild.wasm を読み込む。
  const wasmPath = path.join(__dirname, "esbuild.wasm");
  const wasmBuffer = readFileSync(wasmPath);
  await esbuild.initialize({
    wasmModule: new WebAssembly.Module(wasmBuffer),
    worker: false,
  });
  initialized = true;
}

export async function compileTsx(
  tsx: string,
  workspaceRoot: string,
  additionalPlugins?: { name: string; setup: (build: unknown) => void }[],
): Promise<{ code: string; error?: string }> {
  try {
    await ensureInitialized();
    const result = await esbuild.build({
      stdin: {
        contents: tsx,
        loader: "tsx",
        resolveDir: workspaceRoot,
        sourcefile: "component.tsx",
      },
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      jsx: "automatic",
      write: false,
      external: ["react", "react-dom", "react/jsx-runtime"],
      plugins: [...(additionalPlugins || []), aliasPlugin(workspaceRoot)],
    });

    if (result.errors.length > 0) {
      return {
        code: "",
        error: result.errors.map((e) => e.text).join("\n"),
      };
    }

    const code = result.outputFiles?.[0]?.text || "";
    return { code };
  } catch (err) {
    return {
      code: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function aliasPlugin(workspaceRoot: string) {
  return {
    name: "alias-resolve",
    setup(build: { onResolve: (opts: { filter: RegExp }, cb: (args: { path: string }) => { path: string }) => void }) {
      build.onResolve({ filter: /^@\// }, (args) => {
        const resolved = path.resolve(
          workspaceRoot,
          "src",
          args.path.slice(2),
        );
        return { path: resolved };
      });
    },
  };
}

export async function dispose(): Promise<void> {
  // No persistent context to dispose in current implementation
}
