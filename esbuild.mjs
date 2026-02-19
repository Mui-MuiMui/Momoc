import * as esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  outfile: "out/extension.js",
  external: ["vscode", "esbuild", "ts-morph"],
  sourcemap: !production,
  minify: production,
  treeShaking: true,
  target: "node24",
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("[esbuild] Watching for changes...");
  } else {
    await esbuild.build(buildOptions);
    console.log("[esbuild] Build complete.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
