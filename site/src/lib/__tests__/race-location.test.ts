import { describe, expect, it } from "vitest";
import { deriveLocationFromRaceName, getRaceLocation } from "../raceLocation";

describe("deriveLocationFromRaceName", () => {
  it("strips the year and IRONMAN 70.3 prefix", () => {
    expect(deriveLocationFromRaceName("2026 IRONMAN 70.3 Subic Bay Philippines")).toBe(
      "Subic Bay Philippines",
    );
    expect(deriveLocationFromRaceName("2026 IRONMAN 70.3 Alghero")).toBe("Alghero");
  });

  it("strips the year and IRONMAN prefix", () => {
    expect(deriveLocationFromRaceName("2013 IRONMAN Austria")).toBe("Austria");
    expect(deriveLocationFromRaceName("2026 IRONMAN Hamburg")).toBe("Hamburg");
  });

  it("keeps multi-word remainders intact", () => {
    expect(deriveLocationFromRaceName("2025 IRONMAN 70.3 Western Sydney")).toBe(
      "Western Sydney",
    );
  });

  it("returns null when the name does not start with a year", () => {
    expect(deriveLocationFromRaceName("IRONMAN Hamburg")).toBeNull();
  });

  it("returns null for non-IRONMAN race names", () => {
    expect(deriveLocationFromRaceName("2018 5150 Mont-Tremblant")).toBeNull();
    expect(deriveLocationFromRaceName("2014 Victoria Olympic")).toBeNull();
    expect(deriveLocationFromRaceName("2016 Timberman Triathlon")).toBeNull();
  });

  it("returns null when extra words sit between the year and the prefix", () => {
    expect(deriveLocationFromRaceName("2021 June IRONMAN 70.3 Eagleman")).toBeNull();
  });

  it("returns null when nothing follows the prefix", () => {
    expect(deriveLocationFromRaceName("2024 IRONMAN")).toBeNull();
    expect(deriveLocationFromRaceName("2024 IRONMAN 70.3")).toBeNull();
  });

  it("returns null for championship names (remainder is not a location)", () => {
    expect(deriveLocationFromRaceName("2024 IRONMAN World Championship")).toBeNull();
    expect(deriveLocationFromRaceName("2024 IRONMAN World Championship - Men")).toBeNull();
    expect(deriveLocationFromRaceName("2023 IRONMAN 70.3 World Championship (Women)")).toBeNull();
    expect(
      deriveLocationFromRaceName("2019 IRONMAN 70.3 European Championship Elsinore"),
    ).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(deriveLocationFromRaceName("")).toBeNull();
  });
});

describe("getRaceLocation", () => {
  it("prefers the manifest location when present", () => {
    expect(
      getRaceLocation({ name: "2026 IRONMAN Hamburg", location: "Hamburg, Germany" }),
    ).toBe("Hamburg, Germany");
  });

  it("falls back to the name-derived location when the manifest location is empty", () => {
    expect(
      getRaceLocation({ name: "2026 IRONMAN 70.3 Subic Bay Philippines", location: "" }),
    ).toBe("Subic Bay Philippines");
  });

  it("ignores whitespace-only manifest locations", () => {
    expect(getRaceLocation({ name: "2013 IRONMAN Austria", location: "  " })).toBe("Austria");
  });

  it("returns null when neither source yields a location", () => {
    expect(getRaceLocation({ name: "2014 Victoria Olympic", location: "" })).toBeNull();
  });
});
