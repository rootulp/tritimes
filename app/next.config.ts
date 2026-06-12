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
        // Sharded athlete profiles, fetched at render time by the edge-runtime
        // athlete page. The files are pre-gzipped on disk; declaring
        // Content-Encoding makes fetch decompress them at the HTTP layer, so
        // the edge code needs no zlib/DecompressionStream (the latter doesn't
        // exist in Next's edge sandbox).
        source: "/athlete-shards/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=604800",
          },
          {
            key: "Content-Type",
            value: "application/json",
          },
          {
            key: "Content-Encoding",
            value: "gzip",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
