import { ImageResponse } from "next/og";
import { getRaceBySlug, getAthleteById, getAgeGroupCount } from "@/lib/data";
import { getCountryFlagISO } from "@/lib/flags";
import { DISCIPLINE_COLORS } from "@/lib/colors";

// Use Node runtime: getRaceBySlug / getAthleteById read from the filesystem.
export const runtime = "nodejs";

// Race results are static once scraped — cache the image for 1 day.
export const revalidate = 86400;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Triathlon result share card";

interface Params {
  params: Promise<{ slug: string; id: string }>;
}

export default async function Image({ params }: Params) {
  const { slug, id } = await params;
  const race = getRaceBySlug(slug);
  const athlete = race ? getAthleteById(slug, Number(id)) : null;

  if (!race || !athlete) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "#0f172a",
            color: "white",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontFamily: "system-ui",
          }}
        >
          tritimes.org · result not found
        </div>
      ),
      { ...size }
    );
  }

  const totalFinishers = race.finishers;
  const ageGroupTotal = getAgeGroupCount(slug, athlete.ageGroup);
  const overallPct = Math.max(1, Math.round((athlete.overallRank / totalFinishers) * 100));
  const agPct = Math.max(1, Math.round((athlete.ageGroupRank / ageGroupTotal) * 100));

  const flag = getCountryFlagISO(athlete.countryISO) ?? "";
  const dateStr = race.date;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Name + race meta */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 700 }}>
            {flag ? <span style={{ marginRight: 16 }}>{flag}</span> : null}
            {athlete.fullName}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#94a3b8", marginTop: 6 }}>
            {race.name} · {dateStr} · {athlete.ageGroup}
          </div>
        </div>

        {/* Hero finish time + percentile row */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 36 }}>
          <div style={{ display: "flex", fontSize: 18, color: "#94a3b8", letterSpacing: 3, textTransform: "uppercase" }}>
            Finish Time
          </div>
          <div style={{ display: "flex", fontSize: 140, fontWeight: 800, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {athlete.finishTime}
          </div>
          <div style={{ display: "flex", gap: 36, marginTop: 18, fontSize: 24, color: "#cbd5e1" }}>
            <div style={{ display: "flex" }}>
              Overall&nbsp;<span style={{ color: "#fbbf24", fontWeight: 700 }}>Top {overallPct}%</span>
            </div>
            <div style={{ display: "flex" }}>
              Age Group&nbsp;<span style={{ color: "#fbbf24", fontWeight: 700 }}>Top {agPct}%</span>
            </div>
          </div>
        </div>

        {/* Splits row */}
        <div style={{ display: "flex", marginTop: 40, gap: 24 }}>
          <Split label="Swim" time={athlete.swimTime} color={DISCIPLINE_COLORS.Swim} />
          <Split label="Bike" time={athlete.bikeTime} color={DISCIPLINE_COLORS.Bike} />
          <Split label="Run" time={athlete.runTime} color={DISCIPLINE_COLORS.Run} />
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 28,
            right: 36,
            fontSize: 22,
            color: "#64748b",
            letterSpacing: 1,
            fontWeight: 700,
          }}
        >
          tritimes.org
        </div>
      </div>
    ),
    { ...size }
  );
}

function Split({ label, time, color }: { label: string; time: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: "20px 12px",
      }}
    >
      <div style={{ display: "flex", fontSize: 18, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 38, fontWeight: 800, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
        {time}
      </div>
    </div>
  );
}
