// Data files ship as raw gzip bytes (Content-Type: application/gzip, no
// Content-Encoding), so the browser decompresses them explicitly.

/** Fetch and parse a gzipped JSON data file. Resolves null on 404. */
export async function fetchGzJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok || !res.body) throw new Error(`Failed to load ${url}: ${res.status}`);
  const text = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
  return JSON.parse(text) as T;
}
