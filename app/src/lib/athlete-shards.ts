import { gunzipSync, strFromU8 } from "fflate";
import { AthleteProfile } from "./types";

// Edge-compatible athlete-shard access for /athlete/[slug] (runtime = "edge").
// Uses only fetch + fflate (pure-JS gunzip) — no fs/path/zlib and no
// DecompressionStream — so it runs on the Edge runtime as well as Node
// (`next dev` / vitest). Keep Node-only modules (like data.ts) out of this
// file's import graph.
//
// The shards ship as raw gzip bytes (Content-Type: application/gzip, NO
// Content-Encoding — see next.config.ts) and are decompressed here explicitly,
// mirroring the search shards. Two earlier approaches both 404'd every real
// athlete in production:
//   1. Serving them with a hand-set `Content-Encoding: gzip` and relying on
//      fetch to auto-decompress at the HTTP layer. Vercel's CDN does not honor
//      that header on public/ assets, so the edge fetch received raw gzip and
//      res.json() threw.
//   2. Decompressing with DecompressionStream — Next's edge runtime rejects it
//      ("A Node.js API is used (DecompressionStream) which is not supported in
//      the Edge Runtime"), so it threw at render time.
// fflate is pure JS (typed arrays only), so it works in the edge runtime.

export const SHARD_COUNT = 1024;

/**
 * Deterministic djb2 hash of an athlete slug → shard bucket.
 * MUST stay identical to scripts/build-athlete-shards.js (same algorithm,
 * same SHARD_COUNT) — see athlete-shards.test.ts for the parity anchor.
 */
export function shardId(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  }
  return h % SHARD_COUNT;
}

// Sharded, self-contained athlete profiles built at build time by
// scripts/build-athlete-shards.js and served as static assets under
// /athlete-shards/. A request fetches only the one shard it needs (~145KB)
// from the CDN — no 80MB profiles parse, no per-race CSV parsing. Shards are
// NOT bundled into the function; they ship as static files fetched over HTTP.
const shardCache = new Map<number, Record<string, AthleteProfile>>();

// Origin to fetch our own static shard assets from. On Vercel, VERCEL_URL is
// the current deployment's host; locally it's the dev/start server.
function shardOrigin(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// The shard bytes may arrive still-gzipped or already decompressed, depending
// on whether the HTTP layer honored the on-disk gzip:
//   - Vercel's CDN serves the raw .gz bytes (Content-Encoding is not applied to
//     public/ assets), so we receive gzip and must inflate it ourselves.
//   - Some servers (e.g. `next start`) transfer-decompress the response, so we
//     receive plain JSON already.
// Detect the gzip magic (0x1f 0x8b) and only inflate when it's actually there,
// so the same code path works in both environments.
function shardBytesToText(buf: Uint8Array): string {
  const isGzip = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  return strFromU8(isGzip ? gunzipSync(buf) : buf);
}

async function decompressShard(res: Response): Promise<Record<string, AthleteProfile>> {
  const buf = new Uint8Array(await res.arrayBuffer());
  return JSON.parse(shardBytesToText(buf)) as Record<string, AthleteProfile>;
}

async function loadAthleteShard(id: number): Promise<Record<string, AthleteProfile>> {
  const cached = shardCache.get(id);
  if (cached) return cached;

  // On protected (preview) deployments the self-fetch is unauthenticated and
  // would 401; send the automation-bypass secret when Vercel provides it.
  // No-op in production, where deployments aren't protected.
  const headers: Record<string, string> = {};
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;
  // force-cache keeps this fetch in Next's data cache across requests.
  const res = await fetch(`${shardOrigin()}/athlete-shards/${id}.json.gz`, {
    cache: "force-cache",
    headers,
  });

  if (!res.ok) {
    // Every shard 0..1023 is built and deployed, so a non-ok status is a load
    // failure (network blip, cold CDN, 401 before bypass), NOT "athlete does
    // not exist". Throw so the page renders a retryable error instead of a
    // false 404 that tells a real athlete they aren't in the data. We don't
    // cache it, so the next request retries.
    throw new Error(`athlete shard ${id} fetch failed: ${res.status}`);
  }

  // Decompress + parse can also throw (truncated download, corrupt bytes).
  // Let it propagate for the same reason — a load failure must never be
  // silently converted into "not found".
  const shard = await decompressShard(res);
  shardCache.set(id, shard);
  return shard;
}

export async function getAthleteProfile(slug: string): Promise<AthleteProfile | null> {
  // A missing slug within a successfully-loaded shard is the ONLY genuine
  // "not found" (→ null → notFound() → 404). Load failures throw above.
  const shard = await loadAthleteShard(shardId(slug));
  return shard[slug] ?? null;
}
