import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/unit/**/*.test.ts"],
    exclude: ["test/e2e/**/*"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "webview-ui/src"),
    },
  },
});
