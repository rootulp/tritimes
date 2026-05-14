import { describe, expect, it } from "vitest";
import { getGlobalSearchViewState } from "../GlobalSearchBar";

describe("getGlobalSearchViewState", () => {
  it("keeps the panel closed before a searchable query", () => {
    expect(getGlobalSearchViewState("j", [], true)).toBe("closed");
  });

  it("shows loading while a searchable query is in flight", () => {
    expect(getGlobalSearchViewState("jo", [], true)).toBe("loading");
  });

  it("shows an empty state after a completed search with no matches", () => {
    expect(getGlobalSearchViewState("zz", [], false)).toBe("empty");
  });

  it("shows results once matches are available", () => {
    expect(
      getGlobalSearchViewState(
        "jo",
        [
          {
            slug: "john-smith",
            fullName: "John Smith",
            country: "United States",
            countryISO: "US",
            raceCount: 4,
          },
        ],
        false,
      ),
    ).toBe("results");
  });
});
