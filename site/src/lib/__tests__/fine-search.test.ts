import { describe, expect, it } from "vitest";
import { partitionSearchLines } from "../../../scripts/build-fine-search";

describe("fine search data generation", () => {
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
