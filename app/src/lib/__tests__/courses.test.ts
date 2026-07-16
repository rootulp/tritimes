import { describe, it, expect } from "vitest";
// getCourseInfo reads the manifest through getRaces(); __setRacesForTest
// injects a synthetic manifest so the test never touches data/races.json.
import { courseSlugOf, getCourseInfo, __setRacesForTest } from "../races";

describe("courseSlugOf", () => {
  it("strips a trailing -YYYY", () => {
    expect(courseSlugOf("im703-swansea-2026")).toBe("im703-swansea");
    expect(courseSlugOf("im-vitoria-2019")).toBe("im-vitoria");
  });
});

describe("getCourseInfo", () => {
  const manifest = [
    { slug: "im703-swansea-2024", name: "2024 IRONMAN 70.3 Swansea", date: "2024-07-14", location: "Swansea, Wales, UK", finishers: 1500 },
    { slug: "im703-swansea-2026", name: "2026 IRONMAN 70.3 Swansea", date: "2026-07-12", location: "Swansea, Wales, UK", finishers: 1744 },
    { slug: "im-frankfurt-2005", name: "2005 IRONMAN Frankfurt", date: "2005-07-03", location: "", finishers: 2000 },
  ];

  it("groups editions of one course newest-first with a year-stripped name", () => {
    __setRacesForTest(manifest);
    const info = getCourseInfo("im703-swansea");
    expect(info).toBeDefined();
    expect(info!.name).toBe("IRONMAN 70.3 Swansea");
    expect(info!.location).toBe("Swansea, Wales, UK");
    expect(info!.distance).toBe("70.3");
    expect(info!.editions.map((e) => e.year)).toEqual(["2026", "2024"]);
    expect(info!.editions[0].slug).toBe("im703-swansea-2026");
    expect(info!.editions[0].finishers).toBe(1744);
  });

  it("classifies non-703 slugs as 140.6", () => {
    __setRacesForTest(manifest);
    expect(getCourseInfo("im-frankfurt")!.distance).toBe("140.6");
  });

  it("returns undefined for an unknown course", () => {
    __setRacesForTest(manifest);
    expect(getCourseInfo("does-not-exist")).toBeUndefined();
  });
});
