// Frequently-asked-questions content for the /faq page.
//
// Q&A data and the schema.org FAQPage builder live here (not in the page
// component) so they can be unit-tested and so the page stays a thin renderer.
// This module intentionally has no dependency on the heavy corpus in data.ts.

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Where does TriTimes get its data?",
    answer:
      "TriTimes reads results from the same Competitor.com results API (labs-v2.competitor.com) that powers IRONMAN's own official results pages. It is not HTML-scraping the results table, and it is not a public or documented third-party API — it's the same undocumented endpoint the official site itself uses to load results. For each event we read the ironman.com results page once to find that event's ID, then fetch its results as JSON.",
  },
  {
    question: "Is TriTimes affiliated with IRONMAN?",
    answer:
      "No. TriTimes is an independent, unofficial project and is not affiliated with, endorsed by, or sponsored by The IRONMAN Group or Competitor.com. All race data belongs to its respective owners.",
  },
  {
    question: "Why is a result missing or incorrect?",
    answer:
      "TriTimes mirrors what the official results publish, so missing splits, misspelled names, or wrong age groups usually originate in the source data. If a result looks wrong or a race is missing, let us know through the Feedback link in the footer and we'll take a look.",
  },
];

export interface FaqJsonLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

export function buildFaqJsonLd(): FaqJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
