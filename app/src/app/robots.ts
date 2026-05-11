import type { MetadataRoute } from "next";

const SITE_URL = "https://tritimes.org";

// AI training crawlers that have produced spikes of unique-URL traffic on
// data-heavy sites. Blocking them keeps ISR writes bounded and the site's
// content out of unattributed model training corpora.
const BLOCKED_AI_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
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
