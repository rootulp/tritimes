import { describe, it, expect } from "vitest";
import { shardId, SHARD_COUNT } from "@/lib/data";

describe("shardId", () => {
  it("is deterministic and within range", () => {
    const slugs = [
      "smith-anderson--us-m",
      "miller-argent--au-m",
      "garcia-araceli-del-rocio--mx-f",
      "",
    ];
    for (const slug of slugs) {
      const id = shardId(slug);
      expect(id).toBe(shardId(slug));
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(SHARD_COUNT);
      expect(Number.isInteger(id)).toBe(true);
    }
  });

  it("matches pinned values (build/runtime parity anchor)", () => {
    expect(SHARD_COUNT).toBe(1024);
    expect(shardId("smith-anderson--us-m")).toBe(djb2Ref("smith-anderson--us-m"));
    expect(shardId("miller-argent--au-m")).toBe(djb2Ref("miller-argent--au-m"));
  });
});

// Reference implementation duplicated in the test to lock the algorithm.
function djb2Ref(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  }
  return h % 1024;
}
