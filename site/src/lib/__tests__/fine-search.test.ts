import { describe, expect, it } from "vitest";
import { partitionSearchLines, shouldPartitionSearch } from "../../../scripts/build-fine-search";

describe("fine search data generation", () => {
  it("splits alias prefixes through the surname initial, preserving ordinary thresholds", () => {
    for (const prefix of ["alex", "alex ", "tom", "tom "]) expect(shouldPartitionSearch(prefix, 1000)).toBe(true);
    for (const prefix of ["tom e", "alex o", "ro"]) expect(shouldPartitionSearch(prefix, 1000)).toBe(false);
    expect(shouldPartitionSearch("ro", 128 * 1024)).toBe(true);
  });
  it("includes given-name aliases in deeper partitions", () => {
    const alex = "alexander-ogura--us-m\tAlexander Ogura\tUS\tUS\t1";
    const tom = "thomas-edwards--us-m\tThomas Edwards\tUS\tUS\t1";
    expect(partitionSearchLines([alex], "alex").get("alex ")).toEqual([alex]);
    expect(partitionSearchLines([tom], "to").get("tom")).toEqual([tom]);
    expect(partitionSearchLines([tom], "tom").get("tom ")).toEqual([tom]);
  });
  it("partitions full names and rotated hyphenated tokens without duplicate athletes", () => {
    const lines = [
      "a\tRóbert Rootul\tUS\tUS\t1",
      "b\tSarah Rootul-Robert\tUS\tUS\t1",
    ];
    const parts = partitionSearchLines(lines, "ro");
    expect([...parts.keys()].sort()).toEqual(["rob", "roo"]);
    expect(parts.get("rob")).toEqual(lines);
    expect(parts.get("roo")).toEqual(lines);
  });

  it("preserves parent order and handles a third character that is a space", () => {
    const line = "x\tRo Smith\tUS\tUS\t1";
    expect(partitionSearchLines([line], "ro").get("ro ")).toEqual([line]);
  });

  it("can split an oversized child again using a longer prefix", () => {
    const line = "x\tRobert Smith\tUS\tUS\t1";
    expect(partitionSearchLines([line], "rob").get("robe")).toEqual([line]);
  });
});
