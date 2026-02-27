import { NextRequest, NextResponse } from "next/server";
import { searchAthletes } from "@/lib/search-index";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const results = searchAthletes(q, 10);
  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
