import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname, ".."),
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Prefix-sharded search indexes, fetched by the browser (and by
        // /api/search as a self-fetch). Served as raw gzip bytes (no
        // Content-Encoding) — clients decompress them explicitly.
        source: "/search-shards/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=604800",
          },
          {
            key: "Content-Type",
            value: "application/gzip",
          },
        ],
      },
      {
        // Sharded athlete profiles, fetched at render time by the edge-runtime
        // athlete page. Served as raw gzip bytes (Content-Type: application/gzip,
        // NO Content-Encoding) and decompressed explicitly by the edge code —
        // same as the search shards above. A hand-set Content-Encoding: gzip is
        // NOT honored by Vercel's CDN on public/ assets, so relying on HTTP-layer
        // auto-decompression delivered raw gzip to res.json() and 404'd every
        // athlete (see app/src/lib/athlete-shards.ts).
        source: "/athlete-shards/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=604800",
          },
          {
            key: "Content-Type",
            value: "application/gzip",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
