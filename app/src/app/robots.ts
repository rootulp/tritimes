import type { MetadataRoute } from "next";

const SITE_URL = "https://tritimes.org";

// AI *training* crawlers that have produced spikes of unique-URL traffic on
// data-heavy sites. Blocking them keeps render spend bounded and the site's
// content out of unattributed model training corpora.
//
// Deliberately NOT blocked: AI *search* and user-triggered agents
// (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-Web). They power cited
// answers in ChatGPT Search / Perplexity — a referral channel, not a training
// corpus — and their fetch volume is demand-driven rather than a full-graph
// crawl. Result pages render dynamically with no ISR-write cost, so the
// original spend concern no longer applies to them.
const BLOCKED_AI_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "Google-Extended",
  "FacebookBot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "Diffbot",
  "ImagesiftBot",
  "Omgilibot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      ...BLOCKED_AI_AGENTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
