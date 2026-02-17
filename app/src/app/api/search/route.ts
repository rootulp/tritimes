import { NextRequest, NextResponse } from "next/server";
import { getGlobalSearchIndex } from "@/lib/data";
import { GlobalSearchEntry } from "@/lib/types";

let cachedIndex: (GlobalSearchEntry & { fullNameLower: string })[] | null = null;

function getIndex() {
  if (!cachedIndex) {
    cachedIndex = getGlobalSearchIndex().map((entry) => ({
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
  const results: GlobalSearchEntry[] = [];

  for (const entry of index) {
    if (entry.fullNameLower.includes(q)) {
      results.push({
        id: entry.id,
        fullName: entry.fullName,
        ageGroup: entry.ageGroup,
        country: entry.country,
        raceSlug: entry.raceSlug,
        raceName: entry.raceName,
      });
      if (results.length >= 10) break;
    }
  }

  return NextResponse.json(results);
}
