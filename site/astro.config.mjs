import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://tritimes.org",
  // /race/foo → race/foo.html, which Cloudflare serves at /race/foo with no
  // trailing-slash redirect (matching the current URLs).
  build: { format: "file" },
  trailingSlash: "never",
  // Hover/touch prefetch makes same-site navigations near-instant.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [preact()],
  vite: { plugins: [tailwindcss()] },
});
