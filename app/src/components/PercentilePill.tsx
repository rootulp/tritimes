import { formatPercentile } from "@/lib/percentile";

interface PercentilePillProps {
  /** Raw percentile value (1-100); 0 means no data. */
  percentile: number;
  /** Optional aria-label override; defaults to "Age group top X%". */
  label?: string;
}

/**
 * Small amber pill showing the athlete's age-group percentile for a discipline.
 * Reference is implicit (age group) — page context conveys it.
 */
export default function PercentilePill({ percentile, label }: PercentilePillProps) {
  const text = formatPercentile(percentile);
  const ariaLabel = label ?? (text === "—" ? "Percentile unavailable" : `Age group top ${text}`);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/15 text-amber-400 tabular-nums"
      aria-label={ariaLabel}
    >
      {text}
    </span>
  );
}
