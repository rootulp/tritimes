import { describe, it, expect } from "vitest";
import {
  filtersToQueryString,
  parseFiltersFromParams,
  courseHref,
} from "../races-url";

describe("filtersToQueryString", () => {
  it("returns an empty string when all filters are at their defaults", () => {
    expect(filtersToQueryString({ distance: "All", year: "All", query: "" })).toBe("");
  });

  it("treats a whitespace-only query as empty", () => {
    expect(filtersToQueryString({ distance: "All", year: "All", query: "   " })).toBe("");
  });

  it("serializes a non-default distance", () => {
    expect(filtersToQueryString({ distance: "140.6", year: "All", query: "" })).toBe(
      "distance=140.6",
    );
  });

  it("serializes a non-default year", () => {
    expect(filtersToQueryString({ distance: "All", year: "2024", query: "" })).toBe("year=2024");
  });

  it("serializes and URL-encodes the query under the q param", () => {
    expect(filtersToQueryString({ distance: "All", year: "All", query: "São Paulo" })).toBe(
      "q=S%C3%A3o+Paulo",
    );
  });

  it("stores the query verbatim so a controlled input keeps mid-word spaces", () => {
    expect(filtersToQueryString({ distance: "All", year: "All", query: "new york" })).toBe(
      "q=new+york",
    );
  });

  it("serializes all non-default filters in distance, year, q order", () => {
    expect(
      filtersToQueryString({ distance: "140.6", year: "2024", query: "wisconsin" }),
    ).toBe("distance=140.6&year=2024&q=wisconsin");
  });
});

describe("parseFiltersFromParams", () => {
  it("falls back to defaults when no params are present", () => {
    expect(parseFiltersFromParams(new URLSearchParams(""))).toEqual({
      distance: "All",
      year: "All",
      query: "",
    });
  });

  it("reads distance, year, and q", () => {
    expect(
      parseFiltersFromParams(new URLSearchParams("distance=140.6&year=2024&q=wisconsin")),
    ).toEqual({ distance: "140.6", year: "2024", query: "wisconsin" });
  });

  it("ignores an invalid distance value", () => {
    expect(parseFiltersFromParams(new URLSearchParams("distance=marathon")).distance).toBe("All");
  });

  it("decodes an encoded query", () => {
    expect(parseFiltersFromParams(new URLSearchParams("q=S%C3%A3o+Paulo")).query).toBe(
      "São Paulo",
    );
  });

  it("round-trips with filtersToQueryString", () => {
    const filters = { distance: "70.3", year: "2023", query: "lake placid" };
    const restored = parseFiltersFromParams(new URLSearchParams(filtersToQueryString(filters)));
    expect(restored).toEqual(filters);
  });
});

describe("courseHref", () => {
  it("builds a /races link with distance and the course name as the query", () => {
    expect(courseHref("140.6", "Wisconsin")).toBe("/races?distance=140.6&q=Wisconsin");
  });

  it("URL-encodes the course name", () => {
    expect(courseHref("70.3", "St. George")).toBe("/races?distance=70.3&q=St.+George");
  });
});
