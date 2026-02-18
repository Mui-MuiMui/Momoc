import * as esbuild from "esbuild";
import * as path from "path";

let buildContext: esbuild.BuildContext | null = null;

export async function compileTsx(
  tsx: string,
  workspaceRoot: string,
): Promise<{ code: string; error?: string }> {
  try {
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

function aliasPlugin(workspaceRoot: string): esbuild.Plugin {
  return {
    name: "alias-resolve",
    setup(build) {
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
  if (buildContext) {
    await buildContext.dispose();
    buildContext = null;
  }
}
