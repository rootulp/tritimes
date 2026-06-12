import { formatPercentile } from "@/lib/percentile";

interface PercentilePillProps {
  /** Raw percentile value (share of field beaten, 0-100); 0 means no data. */
  percentile: number;
  /** Optional tooltip/aria-label override; defaults to "Faster than X% of age group". */
  label?: string;
}

/**
 * Small amber pill showing the share of the athlete's age group they beat for a
 * discipline (higher is better). Note this is the opposite convention from the
 * "Top X%" summary cards, so the tooltip spells out the meaning.
 */
export default function PercentilePill({ percentile, label }: PercentilePillProps) {
  const text = formatPercentile(percentile);
  const description =
    label ?? (text === "—" ? "Percentile unavailable" : `Faster than ${text} of age group`);
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
