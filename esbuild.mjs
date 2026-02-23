import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  outfile: "out/extension.js",
  external: ["vscode", "ts-morph"],
  // esbuild-wasm の Node.js 版 (lib/main.js) はバンドルを検出して例外を投げる。
  // alias でブラウザ版 (lib/browser.js) を指定してバンドルに含める。
  // browser.js は wasmModule + worker:false に対応しており、Node.js 24 でも動作する。
  alias: {
    "esbuild-wasm": "./node_modules/esbuild-wasm/lib/browser.js",
  },
  sourcemap: !production,
  minify: production,
  treeShaking: true,
  target: "node24",
};

function copyWasm() {
  mkdirSync("out", { recursive: true });
  copyFileSync("node_modules/esbuild-wasm/esbuild.wasm", "out/esbuild.wasm");
  console.log("[esbuild] Copied esbuild.wasm to out/");
}

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("[esbuild] Watching for changes...");
    copyWasm();
  } else {
    await esbuild.build(buildOptions);
    console.log("[esbuild] Build complete.");
    copyWasm();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
