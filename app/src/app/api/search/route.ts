import { NextRequest, NextResponse } from "next/server";
import { getRaces, getAllResults } from "@/lib/data";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const results: { id: number; fullName: string; ageGroup: string; country: string; raceSlug: string; raceName: string }[] = [];
  const races = getRaces();

  for (const race of races) {
    if (results.length >= 10) break;
    for (const r of getAllResults(race.slug)) {
      if (r.fullName.toLowerCase().includes(q)) {
        results.push({
          id: r.id,
          fullName: r.fullName,
          ageGroup: r.ageGroup,
          country: r.country,
          raceSlug: race.slug,
          raceName: race.name,
        });
        if (results.length >= 10) break;
      }
    }
  }

  return NextResponse.json(results);
}
