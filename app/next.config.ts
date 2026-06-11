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
        source: "/athlete-index.tsv.gz",
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
        // Sharded athlete profiles, fetched server-side at render time. Served
        // as raw gzip bytes (no Content-Encoding) — the server gunzips them.
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
