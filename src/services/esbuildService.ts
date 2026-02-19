import * as path from "path";

let esbuildModule: typeof import("esbuild") | null = null;

async function getEsbuild(): Promise<typeof import("esbuild")> {
  if (esbuildModule) return esbuildModule;
  try {
    esbuildModule = await import("esbuild");
    return esbuildModule;
  } catch {
    throw new Error(
      "esbuild is not available. Dynamic TSX compilation requires esbuild to be installed in the workspace.",
    );
  }
}

export async function compileTsx(
  tsx: string,
  workspaceRoot: string,
): Promise<{ code: string; error?: string }> {
  try {
    const esbuild = await getEsbuild();
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
      plugins: [aliasPlugin(workspaceRoot)],
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
