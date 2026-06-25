import { formatTopPercent } from "@/lib/percentile";

interface PercentilePillProps {
  /** Raw percentile value (share of field beaten, 0-100); 0 means no data. */
  percentile: number;
  /** Which field the percentile is measured against, e.g. "age group" or "overall field". */
  scopeLabel: string;
  /** Optional tooltip/aria-label override; defaults to "Top X% of <scopeLabel>". */
  label?: string;
}

/**
 * Small amber pill showing the athlete's rank-from-top for a discipline, using the
 * same "Top X%" convention as the summary cards (lower is better). The tooltip
 * names the comparison field so it always matches the active age group / overall
 * field toggle.
 */
export default function PercentilePill({ percentile, scopeLabel, label }: PercentilePillProps) {
  const text = formatTopPercent(percentile);
  const description =
    label ?? (text === "—" ? "Percentile unavailable" : `${text} of ${scopeLabel}`);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/15 text-amber-400 tabular-nums"
      aria-label={description}
      title={description}
    >
      {text}
    </span>
  );
}
