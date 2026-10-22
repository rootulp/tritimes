import { formatTopPercent } from "@/lib/percentile";

interface PercentilePillProps {
  /** Raw percentile value (share of field beaten, 0-100); 0 means no data. */
  percentile: number;
  /** Which field the percentile is measured against, e.g. "age group" or "overall field". */
  scopeLabel: string;
  /** Optional accessible description; defaults to "Top X% of <scopeLabel>". */
  label?: string;
}

/**
 * Small pill showing the athlete's rank-from-top for a discipline, using the
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
      className="percentile-pill"
      title={description}
    >
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{description}</span>
    </span>
  );
}
