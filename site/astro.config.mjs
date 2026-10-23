import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";

const manifest = new URL("./.cache/search-partitions.json", import.meta.url);
const fineSearchBuckets = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, "utf8")) : [];

export default defineConfig({
  site: "https://www.tritimes.org",
  // /race/foo → race/foo.html, which Cloudflare serves at /race/foo with no
  // trailing-slash redirect (matching the current URLs).
  build: { format: "file" },
  trailingSlash: "never",
  // Hover/touch prefetch makes same-site navigations near-instant.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
    define: { __FINE_SEARCH_BUCKETS__: JSON.stringify(fineSearchBuckets) },
  },
});
