import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  define: { __FINE_SEARCH_BUCKETS__: JSON.stringify(["ro", "sm", "rob", "robe"]) },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.ts"] },
});
