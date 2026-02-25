#!/usr/bin/env node

// Discovers Ironman race event IDs from ironman.com results pages or
// labs-v2.competitor.com group pages.
// Zero dependencies — requires Node.js 18+.
//
// Usage:
//   node discover.js <url>
//
// Examples:
//   node discover.js https://www.ironman.com/im703-new-york-results
//   node discover.js https://labs-v2.competitor.com/results/event/abc-123

const BASE_URL = "https://labs-v2.competitor.com";
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

function extractGroupUUID(html) {
  // Look for labs-v2.competitor.com/results/event/{uuid} in iframes or links
  const patterns = [
    /labs-v2\.competitor\.com\/results\/event\/([0-9a-f-]{36})/i,
    /labs-v2\.competitor\.com\/results\/event\/([0-9a-f-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractSubevents(nextData) {
  // Navigate the __NEXT_DATA__ structure to find subevents
  // The structure varies but typically lives under props.pageProps
  const pageProps = nextData?.props?.pageProps;
  if (!pageProps) return [];

  // Try common locations for subevent data
  const candidates = [
    pageProps.subevents,
    pageProps.event?.subevents,
    pageProps.data?.subevents,
    pageProps.eventGroup?.subevents,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  // Deep search for arrays containing objects with wtc_eventid
  return findSubeventsDeep(nextData);
}

function findSubeventsDeep(obj, depth = 0) {
  if (depth > 10 || obj == null) return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj[0]?.wtc_eventid) return obj;
    for (const item of obj) {
      const found = findSubeventsDeep(item, depth + 1);
      if (found.length > 0) return found;
    }
  } else if (typeof obj === "object") {
    for (const val of Object.values(obj)) {
      const found = findSubeventsDeep(val, depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
}

async function discoverFromGroupPage(groupUUID) {
  const url = `${BASE_URL}/results/event/${groupUUID}`;
  console.error(`Fetching group page: ${url}`);
  const html = await fetchHTML(url);
  const nextData = extractNextData(html);
  if (!nextData) {
    throw new Error("Could not find __NEXT_DATA__ in group page");
  }

  const subevents = extractSubevents(nextData);
  if (subevents.length === 0) {
    // If no subevents found, dump the keys for debugging
    console.error("Could not find subevents. __NEXT_DATA__ pageProps keys:",
      Object.keys(nextData?.props?.pageProps || {}));
    throw new Error("No subevents found in group page data");
  }

  return subevents.map((se) => ({
    eventId: se.wtc_eventid || se.id,
    name: (se.wtc_name || se.label || se.wtc_eventname || se.name || "Unknown").replace(/: Triathlon$/, ""),
    date: se.wtc_eventdate || se.date || "",
    year: se.wtc_eventdate ? new Date(se.wtc_eventdate).getFullYear() : null,
  }));
}

async function discoverFromIronmanPage(ironmanUrl) {
  console.error(`Fetching ironman.com page: ${ironmanUrl}`);
  const html = await fetchHTML(ironmanUrl);
  const groupUUID = extractGroupUUID(html);
  if (!groupUUID) {
    throw new Error("Could not find labs-v2.competitor.com group UUID in page");
  }
  console.error(`Found group UUID: ${groupUUID}`);
  return discoverFromGroupPage(groupUUID);
}

async function discover(url) {
  // Direct labs-v2 group URL
  const groupMatch = url.match(/labs-v2\.competitor\.com\/results\/event\/([0-9a-f-]+)/i);
  if (groupMatch) {
    return discoverFromGroupPage(groupMatch[1]);
  }

  // ironman.com results URL
  if (url.includes("ironman.com")) {
    return discoverFromIronmanPage(url);
  }

  throw new Error(`Unrecognized URL format: ${url}`);
}

// Export for use as a module
module.exports = { discover, discoverFromGroupPage, discoverFromIronmanPage, extractGroupUUID, fetchHTML };

if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.log("Usage: node discover.js <url>");
    console.log("\nAccepts:");
    console.log("  - ironman.com results page URL");
    console.log("  - labs-v2.competitor.com/results/event/<group-uuid> URL");
    process.exit(1);
  }

  discover(url)
    .then((events) => {
      console.log(JSON.stringify(events, null, 2));
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}
