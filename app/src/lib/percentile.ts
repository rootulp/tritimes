/**
 * Format a raw percentile value (as returned by getDisciplineHistogram) for UI display.
 * A value of 0 is treated as "no data available" because getDisciplineHistogram returns 0
 * when the histogram is missing or empty — a true 0th-percentile finish is essentially
 * impossible (you'd have to be infinitely fast).
 */
export function formatPercentile(percentile: number): string {
  if (!Number.isFinite(percentile) || percentile <= 0) return "—";
  return `${percentile}%`;
}
