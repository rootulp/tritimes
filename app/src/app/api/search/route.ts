import { NextRequest, NextResponse } from "next/server";
import { getDeduplicatedAthleteIndex } from "@/lib/data";
import { AthleteSearchEntry } from "@/lib/types";

let cachedIndex: (AthleteSearchEntry & { fullNameLower: string })[] | null = null;

function getIndex() {
  if (!cachedIndex) {
    cachedIndex = getDeduplicatedAthleteIndex().map((entry) => ({
      ...entry,
      fullNameLower: entry.fullName.toLowerCase(),
    }));
  }
  return cachedIndex;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const index = getIndex();
  const results: AthleteSearchEntry[] = [];

  for (const entry of index) {
    if (entry.fullNameLower.includes(q)) {
      results.push({
        slug: entry.slug,
        fullName: entry.fullName,
        country: entry.country,
        countryISO: entry.countryISO,
        raceCount: entry.raceCount,
      });
      if (results.length >= 10) break;
    }
  }

  return NextResponse.json(results);
}
