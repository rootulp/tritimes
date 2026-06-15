/**
 * Format a raw percentile value (as returned by getDisciplineHistogram) for UI display.
 *
 * The value is the share of the field the athlete beat (higher is better) and may be
 * fractional. It is rounded here for display, but capped so the chip never shows an
 * impossible extreme: a race winner (e.g. 2177/2178 = 99.95%) renders as ">99%" rather
 * than "100%", and a back-of-pack finisher renders as "<1%" rather than "0%".
 *
 * A value of 0 is treated as "no data available" because getDisciplineHistogram returns 0
 * when the histogram is missing or empty (a finisher who beat at least one athlete always
 * has a strictly positive value).
 */
export function formatPercentile(percentile: number): string {
  if (!Number.isFinite(percentile) || percentile <= 0) return "—";
  const rounded = Math.round(percentile);
  if (rounded >= 100) return ">99%";
  if (rounded < 1) return "<1%";
  return `${rounded}%`;
}
