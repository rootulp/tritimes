import { SITE_URL } from "@/lib/site";

// AI training crawlers (see app/src/app/robots.ts for the rationale).
const BLOCKED_AI_AGENTS = [
  "GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Bytespider", "Amazonbot", "Applebot-Extended",
  "Google-Extended", "FacebookBot", "Meta-ExternalAgent", "cohere-ai", "Diffbot", "ImagesiftBot", "Omgilibot",
];

export function GET() {
  const lines = ["User-Agent: *", "Allow: /", "Disallow: /api/", ""];
  for (const agent of BLOCKED_AI_AGENTS) lines.push(`User-Agent: ${agent}`, "Disallow: /", "");
  lines.push(`Host: ${SITE_URL}`, `Sitemap: ${SITE_URL}/sitemap.xml`, "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain" } });
}
