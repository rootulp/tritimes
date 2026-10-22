import { describe, expect, it } from "vitest";
import { FAQ_ITEMS, buildFaqJsonLd } from "../faq";

describe("FAQ_ITEMS", () => {
  it("includes a question about where the data comes from", () => {
    const item = FAQ_ITEMS.find(
      (i) => /data/i.test(i.question) && /(come|source|get|scrap)/i.test(i.question),
    );
    expect(item).toBeDefined();
    // The honest answer names the Competitor.com results API as the source.
    expect(item!.answer.toLowerCase()).toContain("competitor.com");
  });

  it("has a non-empty question and answer for every item", () => {
    expect(FAQ_ITEMS.length).toBeGreaterThan(0);
    for (const item of FAQ_ITEMS) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("buildFaqJsonLd", () => {
  it("emits schema.org FAQPage structured data", () => {
    const jsonLd = buildFaqJsonLd();
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("FAQPage");
  });

  it("emits one Question entity per FAQ item with a text Answer", () => {
    const jsonLd = buildFaqJsonLd();
    expect(jsonLd.mainEntity).toHaveLength(FAQ_ITEMS.length);
    jsonLd.mainEntity.forEach((entity, i) => {
      expect(entity["@type"]).toBe("Question");
      expect(entity.name).toBe(FAQ_ITEMS[i].question);
      expect(entity.acceptedAnswer["@type"]).toBe("Answer");
      expect(entity.acceptedAnswer.text).toBe(FAQ_ITEMS[i].answer);
    });
  });
});
