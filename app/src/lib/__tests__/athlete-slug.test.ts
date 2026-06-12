import { describe, it, expect } from "vitest";
import { slugifyAthlete } from "@/lib/athlete-slug";
import { createRequire } from "module";
const nodeRequire = createRequire(import.meta.url);
const buildShards = nodeRequire("../../../../scripts/build-athlete-shards.js");

describe("slugifyAthlete", () => {
  it("builds slugs as name--country-genderInitial", () => {
    expect(slugifyAthlete("Smith Anderson", "US", "Male")).toBe("smith-anderson--us-m");
    expect(slugifyAthlete("Ann Lee", "US", "Female")).toBe("ann-lee--us-f");
  });

  it("strips diacritics and collapses non-alphanumerics", () => {
    expect(slugifyAthlete("José Núñez-Día", "MX", "Male")).toBe("jose-nunez-dia--mx-m");
    expect(slugifyAthlete("  O'Brien, Jr. ", "IE", "Male")).toBe("o-brien-jr--ie-m");
  });

  it("matches the build script's slugifyAthlete (parity anchor)", () => {
    const cases: Array<[string, string, string]> = [
      ["Smith Anderson", "US", "Male"],
      ["Garcia Araceli del Rocío", "MX", "Female"],
      ["Martin Kodewitz", "DE", "Male"],
    ];
    for (const [name, iso, gender] of cases) {
      expect(slugifyAthlete(name, iso, gender)).toBe(buildShards.slugifyAthlete(name, iso, gender));
    }
  });

  it("returns null when any input needed for the slug is missing", () => {
    expect(slugifyAthlete("", "US", "Male")).toBeNull();
    expect(slugifyAthlete("Ann Lee", "", "Female")).toBeNull();
    expect(slugifyAthlete("Ann Lee", "US", "")).toBeNull();
    // Name made only of punctuation slugifies to an empty base.
    expect(slugifyAthlete("---", "US", "Male")).toBeNull();
  });
});
