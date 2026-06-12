import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Traced-bundle hygiene: `@/lib/data` reads the whole data corpus
 * (data/*.csv.gz, data/histograms/*, athlete-index.tsv.gz) with fs globs, so
 * Next's output file tracing copies ~190MB into the bundle of every function
 * whose import graph reaches it. Functions that ship that corpus cold-boot in
 * ~4.5s on Vercel (issue #216).
 *
 * `instrumentation.ts` is bundled into EVERY Node function, so it must never
 * reach data.ts. The other entries are routes that only need races.json (or
 * nothing) and must stay thin. This regression has happened twice — #97 added
 * the import for index warming and #214 removed the index but left getRaces.
 */

const SRC_ROOT = path.resolve(__dirname, "..", "..");

// Entry files whose transitive import graph must NOT include lib/data.ts.
const THIN_ENTRYPOINTS = [
  "instrumentation.ts", // bundled into every Node function
  "app/sitemap.ts", // needs races.json only
  "app/races/page.tsx", // needs races.json only
  "app/api/search/route.ts", // search shards are self-fetched over HTTP
  "app/athlete/[slug]/page.tsx", // edge runtime: must stay fs-free entirely
];

const FORBIDDEN = path.join(SRC_ROOT, "lib", "data.ts");

// Matches static imports/re-exports and dynamic import() specifiers.
const IMPORT_RE = /(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function resolveSpecifier(spec: string, fromDir: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) {
    base = path.join(SRC_ROOT, spec.slice(2));
  } else if (spec.startsWith(".")) {
    base = path.resolve(fromDir, spec);
  } else {
    return null; // bare specifier (node_modules / node builtins)
  }
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function transitiveImports(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(file, "utf-8");
    for (const match of source.matchAll(IMPORT_RE)) {
      const resolved = resolveSpecifier(match[1] ?? match[2], path.dirname(file));
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

describe("function trace hygiene", () => {
  it.each(THIN_ENTRYPOINTS)("%s does not (transitively) import lib/data.ts", (rel) => {
    const entry = path.join(SRC_ROOT, rel);
    expect(fs.existsSync(entry), `${rel} should exist`).toBe(true);
    const graph = transitiveImports(entry);
    expect(
      graph.has(FORBIDDEN),
      `${rel} reaches lib/data.ts — its fs globs pull the ~190MB data corpus ` +
        `into this function's traced bundle (issue #216). Import @/lib/races ` +
        `(or another thin module) instead.`,
    ).toBe(false);
  });

  // Sanity check that the walker actually follows imports: the result page
  // legitimately reads the corpus through lib/data.ts.
  it("race result page DOES reach lib/data.ts (walker sanity check)", () => {
    const graph = transitiveImports(
      path.join(SRC_ROOT, "app/race/[slug]/result/[id]/page.tsx"),
    );
    expect(graph.has(FORBIDDEN)).toBe(true);
  });
});
