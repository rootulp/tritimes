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
    // Hardcoded so any drift in the djb2 algorithm (here or in the build
    // script copy) is caught — do NOT recompute these from the function.
    expect(shardId("smith-anderson--us-m")).toBe(621);
    expect(shardId("miller-argent--au-m")).toBe(546);
  });
});
